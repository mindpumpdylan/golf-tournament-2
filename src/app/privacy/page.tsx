import Link from 'next/link'
import BackNav from '@/components/BackNav'
import { TOURNAMENT_NAME, SUPPORT_EMAIL } from '@/lib/constants'

export const metadata = {
  title: `Privacy Policy · ${TOURNAMENT_NAME}`,
}

const sectionStyle: React.CSSProperties = { marginBottom: '1.75rem' }
const headingStyle: React.CSSProperties = { fontSize: '1.15rem', color: 'var(--gold)', marginBottom: '0.6rem' }
const pStyle: React.CSSProperties = { color: 'var(--cream-dim)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '0.75rem' }

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <BackNav />

        <h1 style={{ fontSize: '2.25rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>Last updated: June 18, 2026</p>

        <div className="card">
          <div style={sectionStyle}>
            <p style={pStyle}>
              {TOURNAMENT_NAME} ("we," "us," or "our") operates this website and the associated tournament
              portal. This Privacy Policy explains what information we collect, how we use it, and the choices
              you have regarding that information.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>Information We Collect</h2>
            <p style={pStyle}>We collect information you provide directly to us, including:</p>
            <p style={pStyle}>
              • Contact information such as your name, email address, and phone number<br />
              • Account information such as your password and profile details (handicap, nickname, bio, home course)<br />
              • Tournament-related information such as scores, reservations, and availability selections<br />
              • Text messaging originator opt-in data and consent, if you choose to sign up for SMS updates<br />
              • Photos you upload to your profile or the tournament gallery
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>How We Use Your Information</h2>
            <p style={pStyle}>We use the information we collect to:</p>
            <p style={pStyle}>
              • Create and manage your account and tournament registration<br />
              • Communicate with you about tee times, pairings, and tournament-day logistics by email and, if you've
              opted in, by text message<br />
              • Operate features of the portal such as scorecards, the closest-to-pin contest, and the photo gallery<br />
              • Maintain the security and integrity of our site
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>How We Share Your Information</h2>
            <p style={pStyle}>
              We do not sell your personal information. We do not share your personal information with third
              parties for their own marketing purposes. We may share information with service providers who help
              us operate the site (such as our hosting, database, email, and SMS providers) solely to provide
              their services to us, and as required by law.
            </p>
            <p style={pStyle}>
              <strong style={{ color: 'var(--cream)' }}>
                All the above categories exclude text messaging originator opt-in data and consent; this
                information won't be shared with any third parties.
              </strong>
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>SMS / Text Messaging</h2>
            <p style={pStyle}>
              If you opt in to receive text messages from {TOURNAMENT_NAME}, we use your phone number solely to
              send you the tournament updates you signed up for. Message frequency varies. Message and data rates
              may apply. You can opt out at any time by replying STOP, or get help by replying HELP. See our{' '}
              <Link href="/terms" style={{ color: 'var(--gold)' }}>Terms of Service</Link> for full SMS program
              details.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>Data Security</h2>
            <p style={pStyle}>
              We use reasonable administrative, technical, and physical safeguards to protect the information we
              collect and store.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>Your Choices</h2>
            <p style={pStyle}>
              You may update or delete your profile information at any time from your account page. You may
              opt out of text messages at any time by replying STOP to any message, and you may unsubscribe from
              emails using the link provided in those emails.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={headingStyle}>Contact Us</h2>
            <p style={pStyle}>
              If you have questions about this Privacy Policy, contact us at{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: 'var(--gold)' }}>{SUPPORT_EMAIL}</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
