'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR, ALL_HOLES, HOLES } from '@/lib/constants'
import type { Score } from '@/lib/types'

function relativeTime(date: Date) {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 10) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

export default function TournamentPage() {
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [, forceUpdate] = useState(0)

  const load = useCallback(async () => {
    const { data: teamsData } = await supabase.from('teams').select('*, team_members(*, profiles(*))').eq('tournament_year', CURRENT_YEAR)
    const teamIds = teamsData?.map((t: any) => t.id) || []
    const { data: scoresData } = teamIds.length > 0
      ? await supabase.from('scores').select('*').in('team_id', teamIds)
      : { data: [] as Score[] }
    if (teamsData) {
      setTeams(teamsData.map((t: any) => ({
        ...t,
        members: t.team_members || [],
        scores: scoresData?.filter((s: Score) => s.team_id === t.id) || []
      })))
    }
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const sub = supabase.channel('scores-tournament').on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, load).subscribe()
    const tick = setInterval(() => forceUpdate(n => n + 1), 10000)
    return () => { supabase.removeChannel(sub); clearInterval(tick) }
  }, [load])

  const getTotal = (scores: Score[]) => scores.reduce((sum, s) => sum + s.strokes, 0)
  const sorted = [...teams].sort((a, b) => {
    const diff = getTotal(a.scores) - getTotal(b.scores)
    return diff !== 0 ? diff : a.name.localeCompare(b.name)
  })

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Loading tournament...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>{CURRENT_YEAR} Tournament</h1>
          <p style={{ color: 'var(--text-muted)' }}>Live teams and leaderboard — updates in real time</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Updated {relativeTime(lastUpdated)}</span>
          )}
          <button onClick={load} style={{ padding: '0.4rem 0.875rem', borderRadius: '0.75rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: 'var(--navy-card)', border: '1px solid var(--navy-border)', color: 'var(--text-muted)', transition: 'all 0.15s' }}>
            ↺ Refresh
          </button>
        </div>
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
                  background: idx === 0 ? 'rgba(201,168,76,0.08)' : 'var(--navy-light)',
                  border: idx === 0 ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                }}>
                  <span style={{ fontSize: '1.5rem', fontFamily: 'Georgia, serif', fontWeight: 700, width: '2rem', textAlign: 'center', color: idx === 0 ? 'var(--gold)' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--text-muted)' }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '1rem' }}>{team.name}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{team.members.map((m: any) => m.profiles?.full_name).join(', ')}</p>
                    {team.tee_time && <p style={{ fontSize: '0.75rem', color: 'var(--gold)', marginTop: '0.15rem' }}>Tee: {team.tee_time}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '2rem', fontFamily: 'Georgia, serif', fontWeight: 700, color: idx === 0 ? 'var(--gold)' : 'var(--white)', lineHeight: 1 }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--gold)' }}>{team.name}</h3>
                  {team.tee_time && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.2rem' }}>Tee: {team.tee_time}</span>}
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  {team.members.map((m: any) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid var(--navy-light)' }}>
                      <span style={{ fontSize: '0.9rem' }}>{m.profiles?.full_name}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>HCP {m.profiles?.handicap ?? 'N/A'}</span>
                    </div>
                  ))}
                </div>
                {/* Mini scorecard — front 9 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '2px', marginBottom: '2px' }}>
                  {ALL_HOLES.slice(0, 9).map(h => {
                    const score = team.scores.find((s: Score) => s.hole_number === h)
                    const hole = HOLES[h - 1]
                    const under = score && score.strokes < hole.par
                    const over = score && score.strokes > hole.par
                    return (
                      <div key={h} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{h}</div>
                        <div style={{ height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: score ? (under ? 'rgba(201,168,76,0.25)' : over ? 'rgba(255,107,107,0.2)' : 'var(--navy-card)') : 'var(--navy-light)', color: score ? (under ? 'var(--gold)' : over ? '#ff8f8f' : 'var(--white)') : 'var(--navy-border)' }}>
                          {score?.strokes || '·'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Back 9 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '2px' }}>
                  {ALL_HOLES.slice(9).map(h => {
                    const score = team.scores.find((s: Score) => s.hole_number === h)
                    const hole = HOLES[h - 1]
                    const under = score && score.strokes < hole.par
                    const over = score && score.strokes > hole.par
                    return (
                      <div key={h} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{h}</div>
                        <div style={{ height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: score ? (under ? 'rgba(201,168,76,0.25)' : over ? 'rgba(255,107,107,0.2)' : 'var(--navy-card)') : 'var(--navy-light)', color: score ? (under ? 'var(--gold)' : over ? '#ff8f8f' : 'var(--white)') : 'var(--navy-border)' }}>
                          {score?.strokes || '·'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total</span>
                  <span style={{ fontSize: '1.5rem', fontFamily: 'Georgia, serif', fontWeight: 700, color: 'var(--gold)' }}>{getTotal(team.scores) || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
