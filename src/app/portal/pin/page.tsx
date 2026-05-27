'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ClosestToPin, Profile } from '@/lib/types'

const CURRENT_YEAR = new Date().getFullYear()
const PAR3_HOLES = [3, 6, 12, 16]

export default function PinPage() {
  const [userId, setUserId] = useState('')
  const [entries, setEntries] = useState<(ClosestToPin & { profile: Profile })[]>([])
  const [form, setForm] = useState({ hole_number: PAR3_HOLES[0].toString(), distance_feet: '', distance_inches: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)
    const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
    setIsAdmin(prof?.is_admin || false)
    const { data } = await supabase.from('closest_to_pin')
      .select('*, profiles(full_name)')
      .eq('tournament_year', CURRENT_YEAR)
      .order('hole_number').order('distance_feet').order('distance_inches')
    setEntries((data || []).map((e: any) => ({...e, profile: e.profiles})))
  }

  useEffect(() => {
    load()
    const sub = supabase.channel('pin').on('postgres_changes',
      { event: '*', schema: 'public', table: 'closest_to_pin' }, load).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await supabase.from('closest_to_pin').insert({
      player_id: userId,
      tournament_year: CURRENT_YEAR,
      hole_number: parseInt(form.hole_number),
      distance_feet: parseInt(form.distance_feet),
      distance_inches: parseInt(form.distance_inches) || 0,
    })
    if (!error) { setMessage('Entry submitted!'); setForm({...form, distance_feet: '', distance_inches: ''}) }
    else setMessage('Error: ' + error.message)
    setSubmitting(false)
    load()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('closest_to_pin').delete().eq('id', id)
    load()
  }

  const grouped = PAR3_HOLES.reduce((acc, hole) => {
    acc[hole] = entries.filter(e => e.hole_number === hole)
    return acc
  }, {} as {[hole: number]: typeof entries})

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold" style={{color:'var(--green-deep)'}}>📍 Closest to the Pin</h1>
        <p className="mt-1" style={{color:'var(--text-mid)'}}>Par 3 results — any player can submit</p>
      </div>

      <div className="card">
        <h2 className="font-display font-bold text-lg mb-4" style={{color:'var(--green-deep)'}}>Submit Your Shot</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Hole (Par 3)</label>
              <select value={form.hole_number} onChange={e => setForm({...form, hole_number: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                {PAR3_HOLES.map(h => <option key={h} value={h}>Hole {h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Feet</label>
              <input type="number" min="0" value={form.distance_feet}
                onChange={e => setForm({...form, distance_feet: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="12" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Inches</label>
              <input type="number" min="0" max="11" value={form.distance_inches}
                onChange={e => setForm({...form, distance_inches: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="6" />
            </div>
          </div>
          {message && <p className="text-sm" style={{color:'var(--green-mid)'}}>{message}</p>}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Distance'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PAR3_HOLES.map(hole => (
          <div key={hole} className="card">
            <h3 className="font-display font-bold text-lg mb-3" style={{color:'var(--green-deep)'}}>Hole {hole}</h3>
            {grouped[hole]?.length === 0 ? (
              <p className="text-sm" style={{color:'var(--text-mid)'}}>No entries yet</p>
            ) : (
              <div className="space-y-2">
                {grouped[hole]?.map((entry, idx) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg"
                    style={{background: idx === 0 ? '#fff8e7' : 'var(--gray-soft)'}}>
                    <div className="flex items-center gap-2">
                      {idx === 0 && <span className="text-lg">🏆</span>}
                      <span className="text-sm font-medium">{entry.profile?.full_name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm" style={{color:'var(--green-mid)'}}>
                        {entry.distance_feet}'{entry.distance_inches}"
                      </span>
                      {isAdmin && (
                        <button onClick={() => handleDelete(entry.id)}
                          className="text-xs text-red-400 hover:text-red-600">✕</button>
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