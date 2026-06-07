'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR, ALL_HOLES } from '@/lib/constants'
import type { Score } from '@/lib/types'

export default function TournamentPage() {
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: teamsData } = await supabase.from('teams').select('*, team_members(*, profiles(*))').eq('tournament_year', CURRENT_YEAR)
    const { data: scoresData } = await supabase.from('scores').select('*')
    if (teamsData) {
      setTeams(teamsData.map((t: any) => ({
        ...t,
        members: t.team_members || [],
        scores: scoresData?.filter((s: Score) => s.team_id === t.id) || []
      })))
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const sub = supabase.channel('scores-tournament').on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, load).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  const getTotal = (scores: Score[]) => scores.reduce((sum, s) => sum + s.strokes, 0)
  const sorted = [...teams].sort((a, b) => getTotal(a.scores) - getTotal(b.scores))

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading tournament...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--electric)', marginBottom: '0.5rem' }}>{CURRENT_YEAR} Tournament</h1>
        <p style={{ color: 'var(--text-muted)' }}>Live teams and leaderboard — updates in real time</p>
      </div>

      {teams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '5rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏌️</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Teams Not Yet Announced</h2>
          <p style={{ color: 'var(--text-muted)' }}>Check back closer to tournament day!</p>
        </div>
      ) : (
        <>
          {/* Leaderboard */}
          <div className="card-glow">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🏆 <span style={{ color: 'var(--gold)' }}>Leaderboard</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sorted.map((team, idx) => (
                <div key={team.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderRadius: '1rem',
                  background: idx === 0 ? 'rgba(255,215,0,0.08)' : 'var(--navy-light)',
                  border: idx === 0 ? '1px solid rgba(255,215,0,0.2)' : '1px solid transparent',
                }}>
                  <span style={{ fontSize: '1.5rem', fontFamily: 'Playfair Display, serif', fontWeight: 700, width: '2rem', textAlign: 'center', color: idx === 0 ? 'var(--gold)' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--text-muted)' }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '1rem' }}>{team.name}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{team.members.map((m: any) => m.profiles?.full_name).join(', ')}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '2rem', fontFamily: 'Playfair Display, serif', fontWeight: 700, color: idx === 0 ? 'var(--gold)' : 'var(--electric)', lineHeight: 1 }}>
                      {getTotal(team.scores) || '—'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{team.scores.length}/18 holes</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team scorecards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            {teams.map(team => (
              <div key={team.id} className="card">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: 'var(--electric)' }}>{team.name}</h3>
                <div style={{ marginBottom: '1rem' }}>
                  {team.members.map((m: any) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid var(--navy-light)' }}>
                      <span style={{ fontSize: '0.9rem' }}>{m.profiles?.full_name}</span>
                      <span className="badge-electric" style={{ fontSize: '0.75rem' }}>HCP {m.profiles?.handicap ?? 'N/A'}</span>
                    </div>
                  ))}
                </div>
                {/* Mini scorecard */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '2px', marginBottom: '2px' }}>
                  {ALL_HOLES.slice(0, 9).map(h => {
                    const score = team.scores.find((s: Score) => s.hole_number === h)
                    return (
                      <div key={h} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{h}</div>
                        <div style={{ height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: score ? 'var(--electric)' : 'var(--navy-light)', color: score ? 'var(--navy)' : 'var(--navy-border)' }}>
                          {score?.strokes || '·'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '2px' }}>
                  {ALL_HOLES.slice(9).map(h => {
                    const score = team.scores.find((s: Score) => s.hole_number === h)
                    return (
                      <div key={h} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{h}</div>
                        <div style={{ height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: score ? 'var(--electric)' : 'var(--navy-light)', color: score ? 'var(--navy)' : 'var(--navy-border)' }}>
                          {score?.strokes || '·'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total</span>
                  <span style={{ fontSize: '1.5rem', fontFamily: 'Playfair Display, serif', fontWeight: 700, color: 'var(--electric)' }}>{getTotal(team.scores) || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
