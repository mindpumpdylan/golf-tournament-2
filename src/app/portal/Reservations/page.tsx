'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Reservation, Profile } from '@/lib/types'
import { format } from 'date-fns'

export default function ReservationsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [players, setPlayers] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ guest_name: '', guest_email: '', pairing_preference: '', handicap: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(prof)
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
      await fetch('/api/invite', { method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ email: form.guest_email, name: form.guest_name, token, inviter: profile?.full_name }) })
      setForm({ guest_name: '', guest_email: '', pairing_preference: '', handicap: '' })
      setShowForm(false)
      setMessage('Invite sent! Your guest has 10 days to register.')
      load()
    }
    setSubmitting(false)
  }

  const handleUpdateHandicap = async (handicap: string, ghin: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('profiles').update({ handicap: parseFloat(handicap) || null, ghin_number: ghin || null }).eq('id', session.user.id)
    setMessage('Handicap updated!')
    load()
  }

  const statusColor = (status: string) => {
    if (status === 'confirmed') return { background: '#e6f4ea', color: '#1a6b3a' }
    if (status === 'expired') return { background: '#fce8e8', color: '#b91c1c' }
    return { background: '#fff8e7', color: '#92400e' }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold" style={{color:'var(--green-deep)'}}>My Reservations</h1>
        <p className="mt-1" style={{color:'var(--text-mid)'}}>Reserve your spot and invite guests to play</p>
      </div>

      <div className="card">
        <h2 className="font-display font-bold text-lg mb-4" style={{color:'var(--green-deep)'}}>My Handicap</h2>
        <HandicapForm profile={profile} onSave={handleUpdateHandicap} />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg" style={{color:'var(--green-deep)'}}>Guest Spots</h2>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2">
            + Invite Guest
          </button>
        </div>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{background:'#e6f4ea', color:'#1a6b3a'}}>
            {message}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl space-y-3" style={{background:'var(--gray-soft)'}}>
            <h3 className="font-semibold" style={{color:'var(--green-deep)'}}>Invite a Guest</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Guest Name</label>
                <input value={form.guest_name} onChange={e => setForm({...form, guest_name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="John Smith" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Guest Email</label>
                <input type="email" value={form.guest_email} onChange={e => setForm({...form, guest_email: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="john@email.com" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pairing Preference (optional)</label>
              <select value={form.pairing_preference} onChange={e => setForm({...form, pairing_preference: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <option value="">Pair me with this guest</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              <p className="text-xs mt-1" style={{color:'var(--text-mid)'}}>
                You will automatically be paired with your guest. Select an additional player if desired.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm py-2" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Invite'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm" style={{background:'white', border:'1px solid #e0ddd6'}}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {reservations.length === 0 ? (
          <p className="text-center py-8" style={{color:'var(--text-mid)'}}>No guest spots yet. Invite someone!</p>
        ) : (
          <div className="space-y-3">
            {reservations.map(r => (
              <div key={r.id} className="flex items-center justify-between p-4 rounded-xl" style={{background:'var(--gray-soft)'}}>
                <div>
                  <p className="font-semibold" style={{color:'var(--green-deep)'}}>{r.guest_name}</p>
                  <p className="text-sm" style={{color:'var(--text-mid)'}}>{r.guest_email}</p>
                  {r.invite_expires_at && r.status === 'pending' && (
                    <p className="text-xs mt-1" style={{color:'#92400e'}}>
                      Expires: {format(new Date(r.invite_expires_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize" style={statusColor(r.status)}>
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

function HandicapForm({ profile, onSave }: { profile: Profile | null, onSave: (h: string, g: string) => void }) {
  const [handicap, setHandicap] = useState(profile?.handicap?.toString() || '')
  const [ghin, setGhin] = useState(profile?.ghin_number || '')
  useEffect(() => {
    setHandicap(profile?.handicap?.toString() || '')
    setGhin(profile?.ghin_number || '')
  }, [profile])
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
      <div>
        <label className="block text-sm font-medium mb-1">Handicap Index</label>
        <input type="number" step="0.1" value={handicap} onChange={e => setHandicap(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="e.g. 12.4" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">GHIN Number (optional)</label>
        <input value={ghin} onChange={e => setGhin(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="Your GHIN #" />
      </div>
      <button onClick={() => onSave(handicap, ghin)} className="btn-primary text-sm py-2">Save Handicap</button>
    </div>
  )
}