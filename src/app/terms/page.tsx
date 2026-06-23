import Link from 'next/link'
import { TOURNAMENT_NAME, SUPPORT_EMAIL, SUPPORT_PHONE, SMS_MESSAGE_TYPE } from '@/lib/constants'

export const metadata = {
  title: `Terms of Service · ${TOURNAMENT_NAME}`,
}

const sectionStyle: React.CSSProperties = { marginBottom: '1.75rem' }
const headingStyle: React.CSSProperties = { fontSize: '1.15rem', color: 'var(--gold)', marginBottom: '0.6rem' }
const pStyle: React.CSSProperties = { color: 'var(--cream-dim)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '0.75rem' }

export default function TermsOfServicePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem' }}>← {TOURNAMENT_NAME}</Link>
        </div>

        <h1 style={{ fontSize: '2.25rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Terms of Service</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>Last updated: June 18, 2026</p>

        <div className="card">
          <div style={sectionStyle}>
            <p style={pStyle}>
              These Terms of Service govern your use of the {TOURNAMENT_NAME} website and tournament portal,
              operated by {TOURNAMENT_NAME} ("we," "us," or "our"). By using this site, you agree to these terms.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>SMS Messaging Program</h2>
            <p style={pStyle}>
              By providing your phone number and checking the consent box on our signup page, you agree to
              receive recurring {SMS_MESSAGE_TYPE.toLowerCase()} text messages from {TOURNAMENT_NAME} related to
              tee times, pairings, and tournament-day logistics.
            </p>
            <p style={pStyle}>
              • <strong style={{ color: 'var(--cream)' }}>Message frequency varies.</strong><br />
              • <strong style={{ color: 'var(--cream)' }}>Message and data rates may apply.</strong><br />
              • Reply <strong style={{ color: 'var(--cream)' }}>STOP</strong> at any time to opt out of text
              messages. You will receive a confirmation that you've been unsubscribed, and no further messages
              will be sent.<br />
              • Reply <strong style={{ color: 'var(--cream)' }}>HELP</strong> at any time for assistance.<br />
              • Consent to receive text messages is not a condition of registering for the tournament or using
              any part of the site.
            </p>
            <p style={pStyle}>
              <strong style={{ color: 'var(--cream)' }}>
                Wireless carriers are not liable for delayed or undelivered messages.
              </strong>
            </p>
            <p style={pStyle}>
              For help with the SMS program, email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--gold)' }}>{SUPPORT_EMAIL}</a> or call{' '}
              <a href={`tel:${SUPPORT_PHONE.replace(/[^\d+]/g, '')}`} style={{ color: 'var(--gold)' }}>{SUPPORT_PHONE}</a>.
              See our <Link href="/privacy" style={{ color: 'var(--gold)' }}>Privacy Policy</Link> for how we
              handle your information.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>Use of the Site</h2>
            <p style={pStyle}>
              You must provide accurate information when creating an account and are responsible for maintaining
              the confidentiality of your password. You agree not to misuse the site or interfere with its normal
              operation.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>Tournament Participation</h2>
            <p style={pStyle}>
              Registration, reservations, and scoring features are provided for the convenience of tournament
              participants. We reserve the right to modify tournament details and to update or correct
              information on the site at any time.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>Changes to These Terms</h2>
            <p style={pStyle}>
              We may update these Terms of Service from time to time. Continued use of the site after changes
              are posted constitutes acceptance of the updated terms.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>Contact Us</h2>
            <p style={pStyle}>
              Questions about these terms can be sent to{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--gold)' }}>{SUPPORT_EMAIL}</a> or by
              calling <a href={`tel:${SUPPORT_PHONE.replace(/[^\d+]/g, '')}`} style={{ color: 'var(--gold)' }}>{SUPPORT_PHONE}</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
