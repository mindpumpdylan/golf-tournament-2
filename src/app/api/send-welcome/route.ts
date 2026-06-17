import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { CURRENT_YEAR } from '@/lib/constants'

export async function POST(req: NextRequest) {
  const authToken = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!authToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authToken)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, name } = await req.json()
  if (!email || !name) return NextResponse.json({ error: 'Missing email or name' }, { status: 400 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://highcountryclassic.com'

  await resend.emails.send({
    from: 'High Country Classic <tournament@noreply.highcountryclassic.com>',
    to: email,
    subject: `You're in! Welcome to the ${CURRENT_YEAR} High Country Classic ⛳`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; background: #0d0f0a; color: #f0e6cc; padding: 2rem; border-radius: 1rem; border: 1px solid #3d3220;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="font-size: 2.5rem;">⛳</div>
          <h1 style="color: #c9a84c; margin: 0.5rem 0 0; font-size: 1.5rem;">High Country Classic</h1>
          <p style="color: #8b7d6b; font-size: 0.85rem; margin: 0.25rem 0 0; letter-spacing: 0.08em;">APPLE MOUNTAIN GOLF RESORT</p>
        </div>

        <p style="margin-bottom: 0.75rem;">Hey ${name},</p>
        <p style="margin-bottom: 1.25rem;">You're officially registered for the <strong style="color: #c9a84c;">${CURRENT_YEAR} High Country Classic</strong>. Your spot is locked in — we're pumped to have you!</p>

        <div style="background: #111a0f; border: 1px solid #3d3220; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.5rem;">
          <p style="font-weight: 700; color: #c9a84c; margin: 0 0 0.75rem; font-size: 0.85rem; letter-spacing: 0.08em;">YOUR NEXT STEPS</p>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <p style="margin: 0; font-size: 0.9rem;">📅 <strong>Pick your dates</strong> — vote on which weekend works best for the group</p>
            <p style="margin: 0; font-size: 0.9rem;">🏌️ <strong>Invite a guest</strong> — bring a friend, family member, or client along</p>
            <p style="margin: 0; font-size: 0.9rem;">👤 <strong>Complete your profile</strong> — add your handicap and photo so the team knows you</p>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 1.5rem;">
          <a href="${siteUrl}/portal" style="display:inline-block;background:#c9a84c;color:#0d0f0a;padding:0.9rem 2rem;border-radius:0.875rem;text-decoration:none;font-weight:700;font-size:1rem;">
            Go to My Portal →
          </a>
        </div>

        <p style="color: #8b7d6b; font-size: 0.8rem; border-top: 1px solid #3d3220; padding-top: 1rem; margin: 0; text-align: center;">
          See you on the course! 🏆
        </p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}
