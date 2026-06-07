'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR, ALL_HOLES } from '@/lib/constants'
import type { Score } from '@/lib/types'

export default function ScorecardPage() {
  const [userId, setUserId] = useState('')
  const [myTeam, setMyTeam] = useState<any>(null)
  const [scores, setScores] = useState<Score[]>([])
  const [editing, setEditing] = useState<{ [hole: number]: string }>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)
    const { data: member } = await supabase.from('team_members').select('team_id, teams(*)').eq('player_id', session.user.id).single()
    if (member?.teams) {
      const team = member.teams as any
      if (team.tournament_year === CURRENT_YEAR) {
        setMyTeam(team)
        const { data: sc } = await supabase.from('scores').select('*').eq('team_id', team.id)
        setScores(sc || [])
        const editMap: { [hole: number]: string } = {}
        sc?.forEach((s: Score) => { editMap[s.hole_number] = s.strokes.toString() })
        setEditing(editMap)
      }
    }
  }

  useEffect(() => {
    load()
    const sub = supabase.channel('my-scores').on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, load).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  const handleSave = async () => {
    if (!myTeam) return
    setSaving(true)
    for (const [hole, strokes] of Object.entries(editing)) {
      if (!strokes) continue
      const existing = scores.find(s => s.hole_number === parseInt(hole))
      if (existing) {
        await supabase.from('scores').update({ strokes: parseInt(strokes) }).eq('id', existing.id)
      } else {
        await supabase.from('scores').insert({ team_id: myTeam.id, hole_number: parseInt(hole), strokes: parseInt(strokes), entered_by: userId })
      }
    }
    setMessage('Scores saved!')
    setSaving(false)
    load()
  }

  const frontTotal = ALL_HOLES.slice(0, 9).reduce((sum, h) => sum + (parseInt(editing[h]) || 0), 0)
  const backTotal = ALL_HOLES.slice(9).reduce((sum, h) => sum + (parseInt(editing[h]) || 0), 0)
  const total = frontTotal + backTotal

  if (!myTeam) return (
    <div className="card" style={{ textAlign: 'center', padding: '5rem', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📋</div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Not On A Team Yet</h2>
      <p style={{ color: 'var(--text-muted)' }}>Teams are assigned by admin before the tournament.</p>
    </div>
  )

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--electric)', marginBottom: '0.25rem' }}>Scorecard</h1>
        <p style={{ color: 'var(--text-muted)' }}>Team: <span style={{ color: 'var(--white)', fontWeight: 700 }}>{myTeam.name}</span></p>
      </div>

      {message && <div style={{ background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '1rem', padding: '1rem', color: 'var(--electric)', fontSize: '0.9rem' }}>{message}</div>}

      {/* Front 9 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.3rem' }}>Front 9</h2>
          <span style={{ fontSize: '1.5rem', fontFamily: 'Playfair Display, serif', fontWeight: 700, color: 'var(--electric)' }}>{frontTotal || '—'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {ALL_HOLES.slice(0, 9).map(h => (
            <HoleInput key={h} hole={h} value={editing[h] || ''} onChange={v => setEditing(prev => ({ ...prev, [h]: v }))} />
          ))}
        </div>
      </div>

      {/* Back 9 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.3rem' }}>Back 9</h2>
          <span style={{ fontSize: '1.5rem', fontFamily: 'Playfair Display, serif', fontWeight: 700, color: 'var(--electric)' }}>{backTotal || '—'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {ALL_HOLES.slice(9).map(h => (
            <HoleInput key={h} hole={h} value={editing[h] || ''} onChange={v => setEditing(prev => ({ ...prev, [h]: v }))} />
          ))}
        </div>
      </div>

      {/* Total + save */}
      <div className="card-glow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem', letterSpacing: '0.05em', fontWeight: 700 }}>TOTAL SCORE</p>
          <p style={{ fontSize: '3.5rem', fontFamily: 'Playfair Display, serif', fontWeight: 700, color: 'var(--electric)', lineHeight: 1 }}>{total || '—'}</p>
        </div>
        <button onClick={handleSave} className="btn-electric" disabled={saving}>{saving ? 'Saving...' : 'Save Scores'}</button>
      </div>
    </div>
  )
}

function HoleInput({ hole, value, onChange }: { hole: number, value: string, onChange: (v: string) => void }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>HOLE {hole}</label>
      <input type="number" min="1" max="20" value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', textAlign: 'center', padding: '0.85rem', borderRadius: '0.875rem',
          border: `2px solid ${value ? 'var(--electric)' : 'var(--navy-border)'}`,
          background: value ? 'rgba(0,255,135,0.08)' : 'var(--navy-light)',
          color: value ? 'var(--electric)' : 'var(--text-muted)',
          fontSize: '1.5rem', fontFamily: 'Playfair Display, serif', fontWeight: 700,
          outline: 'none', transition: 'all 0.15s',
        }}
        placeholder="—"
      />
    </div>
  )
}
