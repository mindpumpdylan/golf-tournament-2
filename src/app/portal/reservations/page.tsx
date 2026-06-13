'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { CURRENT_YEAR } from '@/lib/constants'
import { differenceInCalendarDays } from 'date-fns'

const GOLD = '#c9a84c'
const GOLD_BRIGHT = '#e8c97a'
const MUTED = '#8b7d6b'
const CREAM = '#f0e6cc'
const CARD: React.CSSProperties = { background: '#111a0f', border: '1px solid #3d3220', borderRadius: '1.5rem', padding: '1.5rem' }
const CARD_MID = '#162012'

function daysLeft(expiresAt: string) {
  return Math.max(0, differenceInCalendarDays(new Date(expiresAt), new Date()))
}

function CheckRow({ label, done, detail, action }: { label: string; done: boolean; detail?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid rgba(61,50,32,0.4)' }}>
      <div style={{ width: '22px', height: '22px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, background: done ? 'rgba(201,168,76,0.15)' : 'rgba(139,127,107,0.1)', border: done ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(139,127,107,0.25)', color: done ? GOLD : MUTED }}>
        {done ? '✓' : '!'}
      </div>
      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: done ? CREAM : MUTED, flex: 1 }}>{label}</span>
      {detail && !action && <span style={{ fontSize: '0.78rem', color: done ? GOLD : MUTED, fontWeight: 700 }}>{detail}</span>}
      {action}
    </div>
  )
}

function GuestStatusBadge({ signedUp, status, reserved }: { signedUp: boolean; status: string; reserved: boolean }) {
  if (reserved) {
    return (
      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', background: 'rgba(201,168,76,0.08)', color: MUTED, border: '1px solid rgba(61,50,32,0.6)' }}>
        🎟 Reserved
      </span>
    )
  }
  if (signedUp) {
    return (
      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', background: 'rgba(201,168,76,0.15)', color: GOLD_BRIGHT, border: '1px solid rgba(201,168,76,0.4)' }}>
        ✓ Signed Up
      </span>
    )
  }
  const styles: Record<string, React.CSSProperties> = {
    confirmed: { background: 'rgba(201,168,76,0.1)', color: GOLD, border: '1px solid rgba(201,168,76,0.3)' },
    expired:   { background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.25)' },
    pending:   { background: 'rgba(139,127,107,0.1)', color: MUTED, border: '1px solid rgba(139,127,107,0.25)' },
  }
  const labels: Record<string, string> = {
    confirmed: 'Confirmed',
    expired: 'Expired',
    pending: 'Invite Sent',
  }
  return (
    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', ...styles[status] }}>
      {labels[status] ?? status}
    </span>
  )
}

export default function ReservationsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reservations, setReservations] = useState<any[]>([])

  const [showForm, setShowForm] = useState(false)
  const [inviteMode, setInviteMode] = useState<'invite' | 'reserve'>('invite')
  const [form, setForm] = useState({ guest_name: '', guest_email: '', guest_phone: '', pairing_preference: '' })
  const [handicap, setHandicap] = useState('')
  const [ghin, setGhin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)

  // Registration status
  const [isRegistered, setIsRegistered] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [hasAvailability, setHasAvailability] = useState(false)
  const [myTeamName, setMyTeamName] = useState<string | null>(null)
  const [signedUpEmails, setSignedUpEmails] = useState<Set<string>>(new Set())

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const uid = session.user.id

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(prof)
    setHandicap(prof?.handicap?.toString() || '')
    setGhin(prof?.ghin_number || '')

    // Tournament registration
    const { data: reg } = await supabase.from('tournament_registrations').select('id').eq('player_id', uid).eq('tournament_year', CURRENT_YEAR).maybeSingle()
    setIsRegistered(!!reg)

    // Availability
    const { data: avail } = await supabase.from('availability_dates').select('id').eq('user_id', uid).limit(1)
    setHasAvailability(!!(avail && avail.length > 0))

    // Team
    const { data: member } = await supabase.from('team_members').select('teams(name)').eq('player_id', uid).maybeSingle()
    setMyTeamName((member?.teams as any)?.name ?? null)

    // Reservations
    const { data: res } = await supabase.from('reservations').select('*').eq('reserver_id', uid).order('created_at', { ascending: false })
    const resList = res || []
    setReservations(resList)

    // Check which guests have signed up (email exists in profiles)
    if (resList.length > 0) {
      const emails = resList.filter((r: any) => r.guest_email).map((r: any) => r.guest_email)
      if (emails.length > 0) {
        const { data: registeredProfiles } = await supabase.from('profiles').select('email').in('email', emails)
        setSignedUpEmails(new Set(registeredProfiles?.map((p: any) => p.email) || []))
      }
    }


  }

  useEffect(() => { load() }, [])

  const showMsg = (text: string, ok = true) => {
    setMessage({ text, ok })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleSelfRegister = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setRegistering(true)
    await supabase.from('tournament_registrations').insert({ player_id: session.user.id, tournament_year: CURRENT_YEAR })
    setIsRegistered(true)
    setRegistering(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSubmitting(false); return }

    if (inviteMode === 'reserve') {
      // Mode B: reserve spot without signup
      const { error } = await supabase.from('reservations').insert({
        reserver_id: session.user.id,
        guest_name: form.guest_name,
        guest_email: form.guest_email || null,
        guest_phone: form.guest_phone || null,
        pairing_preference: form.pairing_preference || null,
        status: 'confirmed',
        invite_token: null,
        invite_expires_at: null,
      })
      if (error) {
        showMsg('Failed to create reservation. Please try again.', false)
        setSubmitting(false)
        return
      }
      setForm({ guest_name: '', guest_email: '', guest_phone: '', pairing_preference: '' })
      setShowForm(false)
      showMsg(`Spot reserved for ${form.guest_name}!`)
      load()
      setSubmitting(false)
      return
    }

    // Mode A: invite to sign up
    const token = Math.random().toString(36).substring(2, 15)
    const expires = new Date(); expires.setDate(expires.getDate() + 10)
    const { error } = await supabase.from('reservations').insert({
      reserver_id: session.user.id,
      guest_name: form.guest_name,
      guest_email: form.guest_email,
      guest_phone: form.guest_phone || null,
      pairing_preference: form.pairing_preference || null,
      status: 'pending',
      invite_token: token,
      invite_expires_at: expires.toISOString(),
    })
    if (error) {
      showMsg('Failed to create reservation. Please try again.', false)
      setSubmitting(false)
      return
    }
    const apiRes = await fetch('/api/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.guest_email, name: form.guest_name, token, inviter: profile?.full_name })
    })
    setForm({ guest_name: '', guest_email: '', guest_phone: '', pairing_preference: '' })
    setShowForm(false)
    showMsg(
      apiRes.ok
        ? `Invite sent to ${form.guest_name}! They have 10 days to register.`
        : `Reservation created but email failed to send. Use Copy Link to share manually.`,
      apiRes.ok
    )
    load()
    setSubmitting(false)
  }

  const handleSaveHandicap = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase.from('profiles').update({
      handicap: parseFloat(handicap) || null,
      ghin_number: ghin || null,
    }).eq('id', session.user.id)
    showMsg(error ? 'Failed to update.' : 'Profile updated!', !error)
    if (!error) load()
  }

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from('reservations').delete().eq('id', id)
    if (!error) {
      setReservations(prev => prev.filter(r => r.id !== id))
      showMsg('Reservation cancelled.')
    } else {
      showMsg('Failed to cancel. Please try again.', false)
    }
    setConfirmCancel(null)
  }

  const handleCopyLink = (r: any) => {
    const url = `${window.location.origin}/signup?token=${r.invite_token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(r.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const handleResend = async (r: any) => {
    setResendingId(r.id)
    const res = await fetch('/api/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: r.guest_email, name: r.guest_name, token: r.invite_token, inviter: profile?.full_name })
    })
    showMsg(res.ok ? `Invite resent to ${r.guest_name}!` : 'Failed to resend. Use Copy Link instead.', res.ok)
    setResendingId(null)
  }

  const handleUpgradeToInvite = async (r: any) => {
    const newToken = Math.random().toString(36).substring(2, 15)
    const expires = new Date(); expires.setDate(expires.getDate() + 10)
    await supabase.from('reservations').update({ invite_token: newToken, invite_expires_at: expires.toISOString(), status: 'pending' }).eq('id', r.id)
    if (r.guest_email) {
      await fetch('/api/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: r.guest_email, name: r.guest_name, token: newToken, inviter: profile?.full_name })
      })
      showMsg(`Invite sent to ${r.guest_name}!`)
    } else {
      showMsg(`Invite link generated for ${r.guest_name}. Copy and share it with them.`)
    }
    load()
  }

  const signedUpCount  = reservations.filter(r => r.invite_token && signedUpEmails.has(r.guest_email)).length
  const pendingCount   = reservations.filter(r => r.invite_token && !signedUpEmails.has(r.guest_email) && r.status === 'pending').length
  const expiredCount   = reservations.filter(r => r.invite_token && !signedUpEmails.has(r.guest_email) && r.status === 'expired').length
  const reservedCount  = reservations.filter(r => !r.invite_token).length

  const registrationComplete = isRegistered && !!(profile?.handicap) && hasAvailability

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div>
        <h1 style={{ fontSize: '2.5rem', color: GOLD, marginBottom: '0.5rem' }}>My Spots</h1>
        <p style={{ color: MUTED }}>Your registration status and guest invitations</p>
      </div>

      {message && (
        <div style={{ background: message.ok ? 'rgba(201,168,76,0.1)' : 'rgba(255,107,107,0.1)', border: '1px solid ' + (message.ok ? 'rgba(201,168,76,0.25)' : 'rgba(255,107,107,0.3)'), borderRadius: '1rem', padding: '1rem', color: message.ok ? GOLD : '#ff6b6b', fontSize: '0.9rem' }}>
          {message.text}
        </div>
      )}

      {/* ── My Registration ── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.3rem', color: CREAM }}>My Registration</h2>
          <span style={{
            padding: '0.3rem 0.9rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700,
            background: registrationComplete ? 'rgba(201,168,76,0.12)' : 'rgba(139,127,107,0.1)',
            color: registrationComplete ? GOLD_BRIGHT : MUTED,
            border: registrationComplete ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(139,127,107,0.2)',
          }}>
            {registrationComplete ? `✓ Ready for ${CURRENT_YEAR}` : 'Incomplete'}
          </span>
        </div>

        <CheckRow
          label={`Registered for ${CURRENT_YEAR}`}
          done={isRegistered}
          detail={isRegistered ? 'You\'re in!' : undefined}
          action={!isRegistered ? (
            <button
              onClick={handleSelfRegister}
              disabled={registering}
              style={{ padding: '0.3rem 0.85rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', color: GOLD, whiteSpace: 'nowrap' }}
            >
              {registering ? 'Registering...' : 'Register Now'}
            </button>
          ) : undefined}
        />
        <CheckRow
          label="Handicap index"
          done={!!(profile?.handicap)}
          detail={profile?.handicap != null ? String(profile.handicap) : 'Not set'}
        />
        <CheckRow
          label="Date availability"
          done={hasAvailability}
          detail={hasAvailability ? 'Dates selected' : 'No dates yet'}
        />
        <CheckRow
          label="Team assignment"
          done={!!myTeamName}
          detail={myTeamName ?? 'Pending (admin assigns)'}
        />

        {/* Inline handicap / GHIN editor */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(61,50,32,0.5)' }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: MUTED, letterSpacing: '0.06em', marginBottom: '0.75rem' }}>UPDATE MY INFO</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: MUTED, marginBottom: '0.4rem', letterSpacing: '0.05em' }}>HANDICAP INDEX</label>
              <input className="input" type="number" step="0.1" value={handicap} onChange={e => setHandicap(e.target.value)} placeholder="e.g. 12.4" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: MUTED, marginBottom: '0.4rem', letterSpacing: '0.05em' }}>GHIN # (optional)</label>
              <input className="input" value={ghin} onChange={e => setGhin(e.target.value)} placeholder="Your GHIN number" />
            </div>
            <button onClick={handleSaveHandicap} className="btn-electric" style={{ whiteSpace: 'nowrap' }}>Save</button>
          </div>
        </div>
      </div>

      {/* ── Guest Invitations ── */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showForm ? '1.5rem' : reservations.length > 0 ? '1.5rem' : '0' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', color: CREAM }}>Guest Invitations</h2>
            {reservations.length > 0 && (
              <p style={{ fontSize: '0.8rem', color: MUTED, marginTop: '0.25rem' }}>
                {signedUpCount > 0 && <span style={{ color: GOLD, fontWeight: 700 }}>{signedUpCount} signed up</span>}
                {signedUpCount > 0 && (pendingCount > 0 || expiredCount > 0 || reservedCount > 0) && ' · '}
                {pendingCount > 0 && `${pendingCount} pending`}
                {pendingCount > 0 && (expiredCount > 0 || reservedCount > 0) && ' · '}
                {expiredCount > 0 && `${expiredCount} expired`}
                {expiredCount > 0 && reservedCount > 0 && ' · '}
                {reservedCount > 0 && `${reservedCount} reserved`}
              </p>
            )}
          </div>
          <button onClick={() => { setShowForm(!showForm); setInviteMode('invite') }} className="btn-electric" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', flexShrink: 0 }}>
            {showForm ? '✕ Cancel' : '+ Add Guest'}
          </button>
        </div>

        {/* Invite form */}
        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: CARD_MID, borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(201,168,76,0.1)' }}>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '0.375rem', background: 'rgba(0,0,0,0.25)', borderRadius: '0.75rem', padding: '0.3rem' }}>
              <button
                type="button"
                onClick={() => setInviteMode('invite')}
                style={{ flex: 1, padding: '0.55rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: inviteMode === 'invite' ? 'rgba(201,168,76,0.2)' : 'transparent', color: inviteMode === 'invite' ? GOLD : MUTED }}
              >
                ✉ Invite to Sign Up
              </button>
              <button
                type="button"
                onClick={() => setInviteMode('reserve')}
                style={{ flex: 1, padding: '0.55rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: inviteMode === 'reserve' ? 'rgba(201,168,76,0.2)' : 'transparent', color: inviteMode === 'reserve' ? GOLD : MUTED }}
              >
                🎟 Reserve a Spot
              </button>
            </div>

            {/* Mode description */}
            <div style={{ background: 'rgba(201,168,76,0.05)', borderRadius: '0.625rem', padding: '0.625rem 0.875rem', border: '1px solid rgba(201,168,76,0.12)' }}>
              {inviteMode === 'invite' ? (
                <p style={{ fontSize: '0.8rem', color: MUTED, lineHeight: 1.5 }}>
                  <span style={{ color: GOLD, fontWeight: 700 }}>Preferred</span> — your guest receives an email with a sign-up link and gets full access to the app (scores, gallery, pin shots, etc.).
                </p>
              ) : (
                <p style={{ fontSize: '0.8rem', color: MUTED, lineHeight: 1.5 }}>
                  Their spot is held by name — no sign-up required. Guest won't have app access. You can always send them a sign-up link later.
                </p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: MUTED, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>GUEST NAME</label>
                <input className="input" value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} placeholder="John Smith" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: MUTED, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                  GUEST EMAIL {inviteMode === 'reserve' && <span style={{ color: MUTED, fontWeight: 400, fontSize: '0.75rem' }}>(optional)</span>}
                </label>
                <input
                  className="input"
                  type="email"
                  value={form.guest_email}
                  onChange={e => setForm({ ...form, guest_email: e.target.value })}
                  placeholder={inviteMode === 'invite' ? 'john@email.com' : 'john@email.com (optional)'}
                  required={inviteMode === 'invite'}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: MUTED, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>PHONE <span style={{ color: MUTED, fontWeight: 400, fontSize: '0.75rem' }}>(optional — for texting the link)</span></label>
              <input className="input" type="tel" value={form.guest_phone} onChange={e => setForm({ ...form, guest_phone: e.target.value })} placeholder="(555) 555-5555" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: MUTED, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>PAIR ME WITH MY GUEST?</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['yes', 'no'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm({ ...form, pairing_preference: form.pairing_preference === v ? '' : v })}
                    style={{
                      flex: 1, padding: '0.6rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                      background: form.pairing_preference === v ? 'rgba(201,168,76,0.15)' : 'rgba(61,50,32,0.3)',
                      border: `1px solid ${form.pairing_preference === v ? 'rgba(201,168,76,0.4)' : 'rgba(61,50,32,0.6)'}`,
                      color: form.pairing_preference === v ? GOLD : MUTED,
                    }}
                  >
                    {v === 'yes' ? 'Yes — keep us together' : 'No — distribute by handicap'}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.78rem', color: MUTED, marginTop: '0.4rem' }}>If no selection, admin will decide pairing during team building.</p>
            </div>
            <div>
              <button type="submit" className="btn-electric" disabled={submitting}>
                {submitting ? 'Saving...' : inviteMode === 'invite' ? 'Send Invite →' : 'Reserve Spot →'}
              </button>
            </div>
          </form>
        )}

        {/* Empty state */}
        {reservations.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '3rem 2rem', color: MUTED }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎟️</div>
            <p style={{ fontWeight: 600, marginBottom: '0.4rem', color: CREAM }}>No guests yet</p>
            <p style={{ fontSize: '0.85rem' }}>Invite a friend or reserve a walk-in spot.</p>
          </div>
        )}

        {/* Reservation list */}
        {reservations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {reservations.map(r => {
              const isWalkin = !r.invite_token
              const guestSignedUp = !isWalkin && signedUpEmails.has(r.guest_email)
              const days = r.invite_expires_at ? daysLeft(r.invite_expires_at) : 0
              return (
                <div key={r.id} style={{ background: CARD_MID, borderRadius: '1rem', padding: '1rem 1.25rem', border: guestSignedUp ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(61,50,32,0.6)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: CREAM, marginBottom: '0.2rem' }}>{r.guest_name}</p>
                      {r.guest_email && <p style={{ fontSize: '0.83rem', color: MUTED }}>{r.guest_email}</p>}
                      {!r.guest_email && <p style={{ fontSize: '0.83rem', color: MUTED, fontStyle: 'italic' }}>No email provided</p>}
                      {r.guest_phone && <p style={{ fontSize: '0.8rem', color: MUTED }}>{r.guest_phone}</p>}

                      {/* Status sub-text */}
                      {isWalkin && (
                        <p style={{ fontSize: '0.78rem', color: MUTED, marginTop: '0.35rem' }}>Spot held — no sign-up needed</p>
                      )}
                      {!isWalkin && guestSignedUp && (
                        <p style={{ fontSize: '0.78rem', color: GOLD, marginTop: '0.35rem', fontWeight: 600 }}>✓ Signed up and registered</p>
                      )}
                      {!isWalkin && !guestSignedUp && r.status === 'pending' && r.invite_expires_at && (
                        <p style={{ fontSize: '0.78rem', color: days <= 2 ? '#ff6b6b' : MUTED, marginTop: '0.35rem' }}>
                          {days === 0 ? 'Invite expires today' : `Invite expires in ${days} day${days !== 1 ? 's' : ''} — hasn't signed up yet`}
                        </p>
                      )}
                      {!isWalkin && !guestSignedUp && r.status === 'confirmed' && (
                        <p style={{ fontSize: '0.78rem', color: MUTED, marginTop: '0.35rem' }}>Manually confirmed — awaiting sign up</p>
                      )}
                      {!isWalkin && !guestSignedUp && r.status === 'expired' && (
                        <p style={{ fontSize: '0.78rem', color: MUTED, marginTop: '0.35rem' }}>Invite expired — guest never signed up</p>
                      )}
                    </div>
                    <GuestStatusBadge signedUp={guestSignedUp} status={r.status} reserved={isWalkin} />
                  </div>

                  {/* Walk-in actions */}
                  {isWalkin && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleUpgradeToInvite(r)}
                        style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: GOLD }}
                      >
                        ✉ Send Sign-Up Invite
                      </button>
                      {confirmCancel === r.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                          <span style={{ fontSize: '0.78rem', color: MUTED }}>Remove?</span>
                          <button onClick={() => handleCancel(r.id)} style={{ padding: '0.35rem 0.75rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b' }}>Yes</button>
                          <button onClick={() => setConfirmCancel(null)} style={{ padding: '0.35rem 0.75rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'transparent', border: '1px solid #3d3220', color: MUTED }}>No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmCancel(r.id)} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b', marginLeft: 'auto' }}>
                          Remove
                        </button>
                      )}
                    </div>
                  )}

                  {/* Pending invite actions */}
                  {!isWalkin && r.status === 'pending' && !guestSignedUp && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.875rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleCopyLink(r)}
                        style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: GOLD }}
                      >
                        {copiedId === r.id ? '✓ Copied!' : '🔗 Copy Link'}
                      </button>
                      <button
                        onClick={() => handleResend(r)}
                        disabled={resendingId === r.id}
                        style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'transparent', border: '1px solid #3d3220', color: MUTED }}
                      >
                        {resendingId === r.id ? 'Sending...' : '✉ Resend Email'}
                      </button>
                      {confirmCancel === r.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                          <span style={{ fontSize: '0.78rem', color: MUTED }}>Cancel invite?</span>
                          <button onClick={() => handleCancel(r.id)} style={{ padding: '0.35rem 0.75rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b' }}>Yes</button>
                          <button onClick={() => setConfirmCancel(null)} style={{ padding: '0.35rem 0.75rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'transparent', border: '1px solid #3d3220', color: MUTED }}>No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmCancel(r.id)} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b', marginLeft: 'auto' }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  )}

                  {/* Signed-up guest actions */}
                  {!isWalkin && guestSignedUp && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem' }}>
                      <button onClick={() => handleCopyLink(r)} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: GOLD }}>
                        {copiedId === r.id ? '✓ Copied!' : '🔗 Copy Link'}
                      </button>
                    </div>
                  )}

                  {/* Expired invite actions */}
                  {!isWalkin && r.status === 'expired' && !guestSignedUp && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem' }}>
                      <button
                        onClick={async () => {
                          const newToken = Math.random().toString(36).substring(2, 15)
                          const expires = new Date(); expires.setDate(expires.getDate() + 10)
                          await supabase.from('reservations').update({ invite_token: newToken, invite_expires_at: expires.toISOString(), status: 'pending' }).eq('id', r.id)
                          await fetch('/api/invite', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: r.guest_email, name: r.guest_name, token: newToken, inviter: profile?.full_name })
                          })
                          showMsg(`New invite sent to ${r.guest_name}!`)
                          load()
                        }}
                        className="btn-electric"
                        style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                      >
                        Reinvite
                      </button>
                      <button onClick={() => handleCancel(r.id)} style={{ padding: '0.4rem 1rem', borderRadius: '0.625rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: 'transparent', border: '1px solid #3d3220', color: MUTED }}>
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
