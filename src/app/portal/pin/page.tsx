'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR, HOLES } from '@/lib/constants'

const PAR3_HOLES = HOLES.filter(h => h.par === 3)

export default function PinPage() {
  const [userId, setUserId] = useState('')
  const [entries, setEntries] = useState<any[]>([])
  const [form, setForm] = useState({ hole_number: PAR3_HOLES[0].number.toString(), distance_feet: '', distance_inches: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)
    const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
    setIsAdmin(prof?.is_admin || false)
    const { data } = await supabase.from('closest_to_pin').select('*, profiles(full_name)').eq('tournament_year', CURRENT_YEAR).order('hole_number').order('distance_feet').order('distance_inches')
    setEntries(data || [])
  }

  useEffect(() => {
    load()
    const sub = supabase.channel('pin-live').on('postgres_changes', { event: '*', schema: 'public', table: 'closest_to_pin' }, load).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const holeNum = parseInt(form.hole_number)
    await supabase.from('closest_to_pin')
      .delete()
      .eq('player_id', userId)
      .eq('tournament_year', CURRENT_YEAR)
      .eq('hole_number', holeNum)
    const { error } = await supabase.from('closest_to_pin').insert({
      player_id: userId, tournament_year: CURRENT_YEAR,
      hole_number: holeNum,
      distance_feet: parseInt(form.distance_feet),
      distance_inches: parseInt(form.distance_inches) || 0,
    })
    if (!error) { setMessage('Shot submitted! 🎯'); setForm({ ...form, distance_feet: '', distance_inches: '' }) }
    else setMessage('Error: ' + error.message)
    setSubmitting(false)
    load()
  }

  const grouped = PAR3_HOLES.reduce((acc, hole) => {
    acc[hole.number] = entries.filter(e => e.hole_number === hole.number)
    return acc
  }, {} as { [key: number]: any[] })

  const selectedHole = PAR3_HOLES.find(h => h.number.toString() === form.hole_number)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--electric)', marginBottom: '0.5rem' }}>📍 Closest to the Pin</h1>
        <p style={{ color: 'var(--text-muted)' }}>Apple Mountain's par 3s — submit your shot, any player can enter</p>
      </div>

      {/* Submit form */}
      <div className="card-glow">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Submit Your Shot</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>SELECT HOLE</label>
            <select className="input" value={form.hole_number} onChange={e => setForm({ ...form, hole_number: e.target.value })}>
              {PAR3_HOLES.map(h => <option key={h.number} value={h.number}>Hole {h.number} — {h.name} ({h.yards} yds)</option>)}
            </select>
          </div>
          {selectedHole && (
            <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '0.875rem', padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--electric)', fontWeight: 700 }}>Hole {selectedHole.number}: {selectedHole.name}</span> · {selectedHole.yards} yards
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>FEET FROM PIN</label>
              <input className="input" type="number" min="0" value={form.distance_feet} onChange={e => setForm({ ...form, distance_feet: e.target.value })} placeholder="12" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>INCHES</label>
              <input className="input" type="number" min="0" max="11" value={form.distance_inches} onChange={e => setForm({ ...form, distance_inches: e.target.value })} placeholder="6" />
            </div>
          </div>
          {message && <p style={{ color: 'var(--electric)', fontSize: '0.9rem' }}>{message}</p>}
          <button type="submit" className="btn-electric" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
            {submitting ? 'Submitting...' : 'Submit Distance 🎯'}
          </button>
        </form>
      </div>

      {/* Results grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {PAR3_HOLES.map(hole => (
          <div key={hole.number} className="card">
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--electric)' }}>Hole {hole.number} — {hole.name}</h3>
                <span className="badge-electric" style={{ fontSize: '0.75rem' }}>Par 3</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{hole.yards} yards</p>
            </div>
            {!grouped[hole.number] || grouped[hole.number].length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No shots submitted yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {grouped[hole.number].map((entry, idx) => (
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.6rem 0.875rem', borderRadius: '0.75rem',
                    background: idx === 0 ? 'rgba(255,215,0,0.1)' : 'var(--navy-light)',
                    border: idx === 0 ? '1px solid rgba(255,215,0,0.2)' : '1px solid transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {idx === 0 && <span>🏆</span>}
                      <span style={{ fontSize: '0.9rem', fontWeight: idx === 0 ? 700 : 400 }}>{entry.profiles?.full_name || 'Unknown'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, color: idx === 0 ? 'var(--gold)' : 'var(--electric)', fontSize: '1rem' }}>
                        {entry.distance_feet}'{entry.distance_inches}"
                      </span>
                      {isAdmin && (
                        <button onClick={async () => { await supabase.from('closest_to_pin').delete().eq('id', entry.id); load() }}
                          style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
