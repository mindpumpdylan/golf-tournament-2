import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { email, name, token, inviter } = await req.json()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const link = `${siteUrl}/signup?token=${token}`

  await resend.emails.send({
    from: 'High Country Classic <tournament@noreply.highcountryclassic.com>',
    to: email,
    subject: `You're invited to the High Country Classic! ⛳`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #0d0f0a; color: #f0e6cc; padding: 2rem; border-radius: 1rem; border: 1px solid #3d3220;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="font-size: 2.5rem;">⛳</div>
          <h1 style="color: #c9a84c; margin: 0.5rem 0 0; font-size: 1.5rem;">High Country Classic</h1>
          <p style="color: #8b7d6b; font-size: 0.85rem; margin: 0.25rem 0 0;">Apple Mountain Golf Resort</p>
        </div>
        <p style="margin-bottom: 0.75rem;">Hi ${name},</p>
        <p style="margin-bottom: 0.75rem;"><strong style="color: #c9a84c;">${inviter}</strong> has reserved a spot for you in the High Country Classic golf tournament.</p>
        <p style="margin-bottom: 1.5rem; color: #8b7d6b;">You have <strong style="color: #f0e6cc;">10 days</strong> to create your account and claim your spot. After that, the spot may open to others.</p>
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <a href="${link}" style="display:inline-block;background:#c9a84c;color:#0d0f0a;padding:1rem 2rem;border-radius:0.875rem;text-decoration:none;font-weight:700;font-size:1rem;">
            Claim My Spot →
          </a>
        </div>
        <p style="color: #8b7d6b; font-size: 0.8rem; border-top: 1px solid #3d3220; padding-top: 1rem; margin: 0;">If you weren't expecting this invite, you can ignore this email.</p>
      </div>
    `
  })

  return NextResponse.json({ success: true })
}
