import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'
import { NextResponse } from 'next/server'
import { CURRENT_YEAR } from '@/lib/constants'

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!prof?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { message, recipientType } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    return NextResponse.json({ error: 'Twilio environment variables not configured' }, { status: 500 })
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
