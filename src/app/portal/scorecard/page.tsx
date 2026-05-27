'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Team, Score } from '@/lib/types'

const CURRENT_YEAR = new Date().getFullYear()
const HOLES = Array.from({length: 18}, (_, i) => i + 1)

export default function ScorecardPage() {
  const [userId, setUserId] = useState('')
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [scores, setScores] = useState<Score[]>([])
  const [editing, setEditing] = useState<{[hole: number]: string}>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)
    const { data: member } = await supabase.from('team_members')
      .select('team_id, teams(*)').eq('player_id', session.user.id).single()
    if (member?.teams) {
      const team = member.teams as unknown as Team
      if (team.tournament_year === CURRENT_YEAR) {
        setMyTeam(team)
        const { data: sc } = await supabase.from('scores').select('*').eq('team_id', team.id)
        setScores(sc || [])
        const editMap: {[hole: number]: string} = {}
        sc?.forEach((s: Score) => { editMap[s.hole_number] = s.strokes.toString() })
        setEditing(editMap)
      }
    }
  }

  useEffect(() => {
    load()
    const sub = supabase.channel('my-scores').on('postgres_changes',
      { event: '*', schema: 'public', table: 'scores' }, load).subscribe()
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
        await supabase.from('scores').insert({
          team_id: myTeam.id, hole_number: parseInt(hole),
          strokes: parseInt(strokes), entered_by: userId
        })
      }
    }
    setMessage('Scores saved!')
    setSaving(false)
    load()
  }

  const total = Object.values(editing).reduce((sum, v) => sum + (parseInt(v) || 0), 0)

  if (!myTeam) return (
    <div className="card text-center py-16 max-w-lg mx-auto">
      <div className="text-5xl mb-4">📋</div>
      <h2 className="font-display text-xl mb-2" style={{color:'var(--green-deep)'}}>Not On A Team Yet</h2>
      <p style={{color:'var(--text-mid)'}}>Teams are assigned by admin before the tournament. Check back soon!</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold" style={{color:'var(--green-deep)'}}>Scorecard</h1>
        <p className="mt-1" style={{color:'var(--text-mid)'}}>Team: <strong>{myTeam.name}</strong></p>
      </div>

      {message && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{background:'#e6f4ea', color:'#1a6b3a'}}>{message}</div>
      )}

      <div className="card">
        <h2 className="font-display font-bold text-lg mb-4" style={{color:'var(--green-deep)'}}>Front 9</h2>
        <div className="grid grid-cols-3 gap-3">
          {HOLES.slice(0, 9).map(h => (
            <HoleInput key={h} hole={h} value={editing[h] || ''}
              onChange={v => setEditing(prev => ({...prev, [h]: v}))} />
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="font-display font-bold text-lg mb-4" style={{color:'var(--green-deep)'}}>Back 9</h2>
        <div className="grid grid-cols-3 gap-3">
          {HOLES.slice(9).map(h => (
            <HoleInput key={h} hole={h} value={editing[h] || ''}
              onChange={v => setEditing(prev => ({...prev, [h]: v}))} />
          ))}
        </div>
      </div>

      <div className="card flex items-center justify-between">
        <div>
          <p className="text-sm" style={{color:'var(--text-mid)'}}>Total Score</p>
          <p className="text-4xl font-display font-bold" style={{color:'var(--green-mid)'}}>{total || '—'}</p>
        </div>
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Scores'}
        </button>
      </div>
    </div>
  )
}

function HoleInput({ hole, value, onChange }: { hole: number, value: string, onChange: (v: string) => void }) {
  return (
    <div className="text-center">
      <label className="block text-xs font-semibold mb-1" style={{color:'var(--text-mid)'}}>Hole {hole}</label>
      <input type="number" min="1" max="20" value={value} onChange={e => onChange(e.target.value)}
        className="w-full text-center px-2 py-3 rounded-xl border-2 text-lg font-bold transition-colors"
        style={{
          borderColor: value ? 'var(--green-mid)' : '#e0ddd6',
          color: value ? 'var(--green-mid)' : 'var(--text-mid)',
          background: value ? '#f0f9f4' : 'white'
        }}
        placeholder="—"
      />
    </div>
  )
}