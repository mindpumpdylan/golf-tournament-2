'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { differenceInCalendarDays } from 'date-fns'

const GOLD = '#c9a84c'
const MUTED = '#8b7d6b'
const CARD = { background: '#111a0f', border: '1px solid #3d3220', borderRadius: '1.5rem', padding: '1.5rem' }
const CARD_MID = '#162012'

function daysLeft(expiresAt: string) {
  return Math.max(0, differenceInCalendarDays(new Date(expiresAt), new Date()))
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    confirmed: { background: 'rgba(201,168,76,0.1)', color: GOLD, border: '1px solid rgba(201,168,76,0.3)' },
    expired: { background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.25)' },
    pending: { background: 'rgba(201,168,76,0.06)', color: '#e8c97a', border: '1px solid rgba(201,168,76,0.2)' },
  }
  return (
    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap', ...styles[status] }}>
      {status}
    </span>
  )
}

export default function ReservationsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reservations, setReservations] = useState<any[]>([])
  const [players, setPlayers] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ guest_name: '', guest_email: '', pairing_preference: '' })
  const [handicap, setHandicap] = useState('')
  const [ghin, setGhin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(prof)
    setHandicap(prof?.handicap?.toString() || '')
    setGhin(prof?.ghin_number || '')
    const { data: res } = await supabase.from('reservations').select('*').eq('reserver_id', session.user.id).order('created_at', { ascending: false })
    setReservations(res || [])
    const { data: pl } = await supabase.from('profiles').select('*').neq('id', session.user.id).order('full_name')
    setPlayers(pl || [])
  }

  useEffect(() => { load() }, [])

  const showMsg = (text: string, ok = true) => {
    setMessage({ text, ok })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSubmitting(false); return }
    const token = Math.random().toString(36).substring(2, 15)
    const expires = new Date(); expires.setDate(expires.getDate() + 10)
    const { error } = await supabase.from('reservations').insert({
      reserver_id: session.user.id,
      guest_name: form.guest_name,
      guest_email: form.guest_email,
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
    setForm({ guest_name: '', guest_email: '', pairing_preference: '' })
    setShowForm(false)
    showMsg(apiRes.ok ? `Invite sent to ${form.guest_name}! They have 10 days to register.` : `Reservation created but email failed to send. Use Copy Link to share manually.`, apiRes.ok)
    load()
    setSubmitting(false)
  }

  const handleSaveHandicap = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { error } = await supabase.from('profiles').update({ handicap: parseFloat(handicap) || null, ghin_number: ghin || null }).eq('id', session.user.id)
    showMsg(error ? 'Failed to update handicap.' : 'Handicap updated!', !error)
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

  const pending = reservations.filter(r => r.status === 'pending')
  const confirmed = reservations.filter(r => r.status === 'confirmed')
  const expired = reservations.filter(r => r.status === 'expired')

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div>
        <h1 style={{ fontSize: '2.5rem', color: GOLD, marginBottom: '0.5rem' }}>My Spots</h1>
        <p style={{ color: MUTED }}>Reserve your spot and invite guests to play</p>
      </div>

      {message && (
        <div style={{ background: message.ok ? 'rgba(201,168,76,0.1)' : 'rgba(255,107,107,0.1)', border: '1px solid ' + (message.ok ? 'rgba(201,168,76,0.25)' : 'rgba(255,107,107,0.3)'), borderRadius: '1rem', padding: '1rem', color: message.ok ? GOLD : '#ff6b6b', fontSize: '0.9rem' }}>
          {message.text}
        </div>
      )}

      {/* Handicap card */}
      <div style={CARD}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#f0e6cc' }}>My Info</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: MUTED, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>HANDICAP INDEX</label>
            <input className="input" type="number" step="0.1" value={handicap} onChange={e => setHandicap(e.target.value)} placeholder="e.g. 12.4" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: MUTED, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>GHIN # (optional)</label>
            <input className="input" value={ghin} onChange={e => setGhin(e.target.value)} placeholder="Your GHIN number" />
          </div>
          <button onClick={handleSaveHandicap} className="btn-electric" style={{ whiteSpace: 'nowrap' }}>Save</button>
        </div>
      </div>

      {/* Guest spots card */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showForm ? '1.5rem' : reservations.length > 0 ? '1.5rem' : '0' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', color: '#f0e6cc' }}>Guest Invitations</h2>
            {reservations.length > 0 && (
              <p style={{ fontSize: '0.8rem', color: MUTED, marginTop: '0.2rem' }}>
                {pending.length} pending · {confirmed.length} confirmed · {expired.length} expired
              </p>
            )}
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-electric" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', flexShrink: 0 }}>
            {showForm ? '✕ Cancel' : '+ Invite Guest'}
          </button>
        </div>

        {/* Invite form */}
        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: CARD_MID, borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(201,168,76,0.1)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: GOLD }}>Invite a Guest</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: MUTED, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>GUEST NAME</label>
                <input className="input" value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} placeholder="John Smith" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: MUTED, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>GUEST EMAIL</label>
                <input className="input" type="email" value={form.guest_email} onChange={e => setForm({ ...form, guest_email: e.target.value })} placeholder="john@email.com" required />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: MUTED, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>ADDITIONAL PAIRING PREFERENCE (optional)</label>
              <select className="input" value={form.pairing_preference} onChange={e => setForm({ ...form, pairing_preference: e.target.value })}>
                <option value="">No preference — pair me with my guest</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              <p style={{ fontSize: '0.78rem', color: MUTED, marginTop: '0.4rem' }}>You'll automatically be paired with your guest. Select an additional player here if desired.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button type="submit" className="btn-electric" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Invite →'}
              </button>
              <p style={{ fontSize: '0.78rem', color: MUTED }}>Your guest will receive an email with a 10-day link to register.</p>
            </div>
          </form>
        )}

        {/* Empty state */}
        {reservations.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '3rem 2rem', color: MUTED }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎟️</div>
            <p style={{ fontWeight: 600, marginBottom: '0.4rem', color: '#f0e6cc' }}>No guests invited yet</p>
            <p style={{ fontSize: '0.85rem' }}>Click "Invite Guest" to reserve a spot for a friend.</p>
          </div>
        )}

        {/* Reservation list */}
        {reservations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {reservations.map(r => (
              <div key={r.id} style={{ background: CARD_MID, borderRadius: '1rem', padding: '1rem 1.25rem', border: '1px solid rgba(61,50,32,0.6)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: '#f0e6cc', marginBottom: '0.2rem' }}>{r.guest_name}</p>
                    <p style={{ fontSize: '0.83rem', color: MUTED }}>{r.guest_email}</p>
                    {r.status === 'pending' && r.invite_expires_at && (
                      <p style={{ fontSize: '0.78rem', color: daysLeft(r.invite_expires_at) <= 2 ? '#ff6b6b' : GOLD, marginTop: '0.35rem', fontWeight: 600 }}>
                        {daysLeft(r.invite_expires_at) === 0
                          ? 'Expires today'
                          : `Expires in ${daysLeft(r.invite_expires_at)} day${daysLeft(r.invite_expires_at) !== 1 ? 's' : ''}`}
                      </p>
                    )}
                    {r.status === 'confirmed' && (
                      <p style={{ fontSize: '0.78rem', color: GOLD, marginTop: '0.35rem', fontWeight: 600 }}>✓ Joined the tournament</p>
                    )}
                    {r.status === 'expired' && (
                      <p style={{ fontSize: '0.78rem', color: MUTED, marginTop: '0.35rem' }}>Invite expired</p>
                    )}
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                {/* Action row */}
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.875rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleCopyLink(r)}
                      style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: GOLD, letterSpacing: '0.04em', transition: 'all 0.15s' }}
                    >
                      {copiedId === r.id ? '✓ Copied!' : '🔗 Copy Link'}
                    </button>
                    <button
                      onClick={() => handleResend(r)}
                      disabled={resendingId === r.id}
                      style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'transparent', border: '1px solid #3d3220', color: MUTED, letterSpacing: '0.04em', transition: 'all 0.15s' }}
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
                      <button onClick={() => setConfirmCancel(r.id)} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(255,107,107,0.25)', color: '#ff6b6b', letterSpacing: '0.04em', marginLeft: 'auto', transition: 'all 0.15s' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                )}

                {r.status === 'expired' && (
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
