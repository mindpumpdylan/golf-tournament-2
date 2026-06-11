import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { email, name, token, inviter } = await req.json()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const link = `${siteUrl}/signup?token=${token}`

  await resend.emails.send({
    from: 'High Country Classic <onboarding@resend.dev>',
    to: email,
    subject: `${inviter} invited you to the High Country Classic!`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a1a; color: white; padding: 2rem; border-radius: 1rem;">
        <h2 style="color: #00ff87; margin-bottom: 1rem;">You're invited! ⛳</h2>
        <p style="margin-bottom: 0.75rem;">Hi ${name},</p>
        <p style="margin-bottom: 0.75rem;"><strong>${inviter}</strong> has reserved a spot for you in the High Country Classic at Apple Mountain Golf Resort.</p>
        <p style="margin-bottom: 1.5rem;">You have <strong>10 days</strong> to create your account and claim your spot before it opens to the waitlist.</p>
        <a href="${link}" style="display:inline-block;background:#00ff87;color:#0a0a1a;padding:1rem 2rem;border-radius:1rem;text-decoration:none;font-weight:700;font-size:1rem;">
          Claim My Spot →
        </a>
        <p style="color:#8899aa;font-size:0.8rem;margin-top:2rem;">If you weren't expecting this invite, you can ignore this email.</p>
      </div>
    `
  })

  return NextResponse.json({ success: true })
}
