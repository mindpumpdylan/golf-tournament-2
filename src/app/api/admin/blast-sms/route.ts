import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'
import { NextResponse } from 'next/server'
import { CURRENT_YEAR } from '@/lib/constants'

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No auth token — are you logged in?' }, { status: 401 })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set in Vercel env vars' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: `Session invalid — try refreshing the page. Detail: ${authErr?.message || 'no user'}` }, { status: 401 })

  const { data: prof } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!prof?.is_admin) return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 })

  const { message, recipientType } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  const missingVars = [
    !process.env.TWILIO_ACCOUNT_SID && 'TWILIO_ACCOUNT_SID',
    !process.env.TWILIO_AUTH_TOKEN && 'TWILIO_AUTH_TOKEN',
    !process.env.TWILIO_PHONE_NUMBER && 'TWILIO_PHONE_NUMBER',
  ].filter(Boolean) as string[]

  if (missingVars.length > 0) {
    return NextResponse.json(
      { error: `Missing Twilio env vars: ${missingVars.join(', ')} — check Vercel dashboard and redeploy` },
      { status: 500 }
    )
  }

  // Fetch phone numbers based on recipient type
  let recipients: { phone: string; name: string }[] = []

  if (recipientType === 'registered') {
    const { data: regs } = await supabaseAdmin
      .from('tournament_registrations')
      .select('player_id, profiles(full_name, nickname, phone_number)')
      .eq('tournament_year', CURRENT_YEAR)
    recipients = (regs || [])
      .map((r: any) => ({
        phone: r.profiles?.phone_number,
        name: r.profiles?.nickname?.trim() || r.profiles?.full_name || 'Player',
      }))
      .filter(r => r.phone)
  } else {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('full_name, nickname, phone_number')
      .not('phone_number', 'is', null)
    recipients = (profiles || []).map((p: any) => ({
      phone: p.phone_number,
      name: p.nickname?.trim() || p.full_name || 'Player',
    }))
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipients with phone numbers found' }, { status: 400 })
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  const from = process.env.TWILIO_PHONE_NUMBER!

  const results = await Promise.allSettled(
    recipients.map(({ phone, name }) =>
      client.messages.create({
        from,
        to: phone,
        body: `Hey ${name}! ${message}\n\n— High Country Classic`,
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ sent, failed, total: recipients.length })
}
