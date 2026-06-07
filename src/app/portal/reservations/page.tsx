'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { format } from 'date-fns'

export default function ReservationsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reservations, setReservations] = useState<any[]>([])
  const [players, setPlayers] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ guest_name: '', guest_email: '', pairing_preference: '' })
  const [handicap, setHandicap] = useState('')
  const [ghin, setGhin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(prof)
    setHandicap(prof?.handicap?.toString() || '')
    setGhin(prof?.ghin_number || '')
    const { data: res } = await supabase.from('reservations').select('*').eq('reserver_id', session.user.id)
    setReservations(res || [])
    const { data: pl } = await supabase.from('profiles').select('*').neq('id', session.user.id)
    setPlayers(pl || [])
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
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
    if (!error) {
      await fetch('/api/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.guest_email, name: form.guest_name, token, inviter: profile?.full_name })
      })
      setForm({ guest_name: '', guest_email: '', pairing_preference: '' })
      setShowForm(false)
      setMessage('Invite sent! Your guest has 10 days to register.')
      load()
    }
    setSubmitting(false)
  }

  const handleSaveHandicap = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('profiles').update({ handicap: parseFloat(handicap) || null, ghin_number: ghin || null }).eq('id', session.user.id)
    setMessage('Handicap updated!')
  }

  const statusStyle = (status: string) => {
    if (status === 'confirmed') return { background: 'rgba(0,255,135,0.1)', color: 'var(--electric)', border: '1px solid rgba(0,255,135,0.2)' }
    if (status === 'expired') return { background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.2)' }
    return { background: 'rgba(255,215,0,0.1)', color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.2)' }
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--electric)', marginBottom: '0.5rem' }}>My Reservations</h1>
        <p style={{ color: 'var(--text-muted)' }}>Reserve your spot and invite guests to play</p>
      </div>

      {message && (
        <div style={{ background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '1rem', padding: '1rem', color: 'var(--electric)', fontSize: '0.9rem' }}>
          {message}
        </div>
      )}

      {/* Handicap */}
      <div className="card">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>My Handicap</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>HANDICAP INDEX</label>
            <input className="input" type="number" step="0.1" value={handicap} onChange={e => setHandicap(e.target.value)} placeholder="e.g. 12.4" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>GHIN # (optional)</label>
            <input className="input" value={ghin} onChange={e => setGhin(e.target.value)} placeholder="Your GHIN number" />
          </div>
          <button onClick={handleSaveHandicap} className="btn-electric" style={{ whiteSpace: 'nowrap' }}>Save</button>
        </div>
      </div>

      {/* Guest spots */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.3rem' }}>Guest Spots</h2>
          <button onClick={() => setShowForm(!showForm)} className="btn-electric" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
            {showForm ? '✕ Cancel' : '+ Invite Guest'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: 'var(--navy-light)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Invite a Guest</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>GUEST NAME</label>
                <input className="input" value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} placeholder="John Smith" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>GUEST EMAIL</label>
                <input className="input" type="email" value={form.guest_email} onChange={e => setForm({ ...form, guest_email: e.target.value })} placeholder="john@email.com" required />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>PAIRING PREFERENCE (optional)</label>
              <select className="input" value={form.pairing_preference} onChange={e => setForm({ ...form, pairing_preference: e.target.value })}>
                <option value="">Pair me with this guest automatically</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>You'll automatically be paired with your guest.</p>
            </div>
            <button type="submit" className="btn-electric" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
              {submitting ? 'Sending invite...' : 'Send Invite →'}
            </button>
          </form>
        )}

        {reservations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎟️</div>
            <p>No guest spots yet. Invite someone to play!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {reservations.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--navy-light)', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
                <div>
                  <p style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{r.guest_name}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.guest_email}</p>
                  {r.invite_expires_at && r.status === 'pending' && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--gold)', marginTop: '0.2rem' }}>Expires {format(new Date(r.invite_expires_at), 'MMM d, yyyy')}</p>
                  )}
                </div>
                <span style={{ padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'capitalize', ...statusStyle(r.status) }}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

