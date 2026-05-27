import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/resend'

export async function POST(req: NextRequest) {
  const { email, name, token, inviter } = await req.json()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const link = `${siteUrl}/signup?token=${token}`

  await resend.emails.send({
    from: 'Golf Tournament <noreply@yourdomain.com>',
    to: email,
    subject: `${inviter} invited you to the Golf Tournament!`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1a3a2a;">You're invited! ⛳</h2>
        <p>Hi ${name},</p>
        <p><strong>${inviter}</strong> has reserved a spot for you in this year's Golf Tournament.</p>
        <p>You have <strong>10 days</strong> to create your account and claim your spot before it opens to the waitlist.</p>
        <a href="${link}" style="display:inline-block;background:#2d6a4f;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
          Claim My Spot →
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px;">If you weren't expecting this, you can ignore this email.</p>
      </div>
    `
  })

  return NextResponse.json({ success: true })
}