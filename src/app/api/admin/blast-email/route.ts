import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
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

  const { subject, body, recipientType } = await req.json()
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
  }

  // Fetch recipients based on type
  let emails: { email: string; name: string }[] = []

  if (recipientType === 'registered') {
    const { data: regs } = await supabaseAdmin
      .from('tournament_registrations')
      .select('player_id, profiles(email, full_name, nickname)')
      .eq('tournament_year', CURRENT_YEAR)
    emails = (regs || []).map((r: any) => ({
      email: r.profiles?.email,
      name: r.profiles?.nickname?.trim() || r.profiles?.full_name || 'Player',
    })).filter(e => e.email)
  } else {
    // 'all' — every profile with an email
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name, nickname')
    emails = (profiles || []).map((p: any) => ({
      email: p.email,
      name: p.nickname?.trim() || p.full_name || 'Player',
    })).filter(e => e.email)
  }

  if (emails.length === 0) {
    return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  // Send individually so each email is personalised with recipient name
  const results = await Promise.allSettled(
    emails.map(({ email, name }) =>
      resend.emails.send({
        from: 'High Country Classic <tournament@noreply.highcountryclassic.com>',
        to: email,
        subject,
        html: buildHtml(name, body),
      })
    )
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ sent, failed, total: emails.length })
}

function buildHtml(name: string, body: string) {
  // Convert line breaks to <br> and wrap paragraphs
  const htmlBody = body
    .split('\n\n')
    .map(p => `<p style="margin: 0 0 1rem; line-height: 1.6;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('')

  return `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; background: #0d0f0a; color: #f0e6cc; padding: 2rem; border-radius: 1rem; border: 1px solid #3d3220;">
      <div style="text-align: center; margin-bottom: 1.75rem;">
        <div style="font-size: 2rem;">⛳</div>
        <h1 style="color: #c9a84c; margin: 0.5rem 0 0; font-size: 1.4rem; font-weight: 700;">High Country Classic</h1>
        <p style="color: #8b7d6b; font-size: 0.8rem; margin: 0.2rem 0 0;">Apple Mountain Golf Resort</p>
      </div>
      <p style="margin: 0 0 1rem;">Hey ${name},</p>
      ${htmlBody}
      <div style="margin-top: 1.75rem; padding-top: 1.25rem; border-top: 1px solid #3d3220;">
        <p style="color: #8b7d6b; font-size: 0.78rem; margin: 0;">
          You're receiving this because you're part of the High Country Classic tournament.
          Visit the <a href="${process.env.NEXT_PUBLIC_SITE_URL}/portal" style="color: #c9a84c; text-decoration: none;">player portal</a> for updates.
        </p>
      </div>
    </div>
  `
}
