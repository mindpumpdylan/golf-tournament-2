import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'
import { NextResponse } from 'next/server'
import { TOURNAMENT_NAME } from '@/lib/constants'

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No auth token' }, { status: 401 })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('phone_number, sms_consent')
    .eq('id', user.id)
    .single()

  if (!profile?.phone_number || !profile?.sms_consent) {
    return NextResponse.json({ error: 'No phone number or SMS consent on file' }, { status: 400 })
  }

  const missingVars = [
    !process.env.TWILIO_ACCOUNT_SID && 'TWILIO_ACCOUNT_SID',
    !process.env.TWILIO_AUTH_TOKEN && 'TWILIO_AUTH_TOKEN',
    !process.env.TWILIO_PHONE_NUMBER && 'TWILIO_PHONE_NUMBER',
  ].filter(Boolean) as string[]

  if (missingVars.length > 0) {
    return NextResponse.json({ error: `Missing Twilio env vars: ${missingVars.join(', ')}` }, { status: 500 })
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: profile.phone_number,
    body: `Welcome to ${TOURNAMENT_NAME}! Message frequency varies. Msg & data rates may apply. Reply HELP for help or STOP to cancel.`,
  })

  return NextResponse.json({ sent: true })
}
