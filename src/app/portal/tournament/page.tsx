'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR, ALL_HOLES, HOLES, PAR } from '@/lib/constants'
import { displayName } from '@/lib/utils'
import type { Score } from '@/lib/types'

function relativeTime(date: Date) {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 10) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function calcPar(scores: Score[]) {
  return scores.reduce((sum, s) => sum + (HOLES[s.hole_number - 1]?.par || 0), 0)
}

function toParStr(total: number, parForHoles: number) {
  if (total === 0 || parForHoles === 0) return null
  const diff = total - parForHoles
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : `${diff}`
}

function toParColor(total: number, parForHoles: number) {
  if (total === 0 || parForHoles === 0) return 'var(--text-muted)'
  const diff = total - parForHoles
  if (diff < 0) return 'var(--gold)'
  if (diff === 0) return 'var(--cream)'
  return '#ff8f8f'
}

export default function TournamentPage() {
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [, forceUpdate] = useState(0)
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'teesheet' | 'scorecards'>('leaderboard')
  const [myTeamId, setMyTeamId] = useState<string | null>(null)

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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: member } = await supabase.from('team_members').select('team_id').eq('player_id', session.user.id).maybeSingle()
      if (member) setMyTeamId(member.team_id)
    })
  }, [])

  const getTotal = (scores: Score[]) => scores.reduce((sum, s) => sum + s.strokes, 0)
  const sorted = [...teams].sort((a, b) => {
    const aTotal = getTotal(a.scores)
    const bTotal = getTotal(b.scores)
    if (aTotal === 0 && bTotal === 0) return a.name.localeCompare(b.name)
    if (aTotal === 0) return 1
    if (bTotal === 0) return -1
    return aTotal - bTotal
  })
  const teesheetSorted = [...teams].sort((a, b) => {
    if (!a.tee_time && !b.tee_time) return a.name.localeCompare(b.name)
    if (!a.tee_time) return 1
    if (!b.tee_time) return -1
    return a.tee_time.localeCompare(b.tee_time)
  })

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem 0' }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ height: '80px', background: 'var(--card)', borderRadius: '1.25rem', opacity: 0.5 + i * 0.1 }} />
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <style>{`@keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>{CURRENT_YEAR} Tournament</h1>
          <p style={{ color: 'var(--text-muted)' }}>Live scores — updates in real time</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--green-live)', fontWeight: 700 }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green-live)', display: 'inline-block', animation: 'livePulse 1.5s ease-in-out infinite' }} />
            LIVE
          </span>
          {lastUpdated && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{relativeTime(lastUpdated)}</span>
          )}
          <button onClick={load} style={{ padding: '0.4rem 0.875rem', borderRadius: '0.75rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-muted)', transition: 'all 0.15s' }}>
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
          {/* Tab navigation */}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {([
              { key: 'leaderboard', label: '🏆 Leaderboard' },
              { key: 'teesheet', label: '🕐 Tee Sheet' },
              { key: 'scorecards', label: '🃏 Scorecards' },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{
                padding: '0.55rem 1.25rem', borderRadius: '0.875rem', fontSize: '0.82rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.04em', border: 'none',
                background: activeTab === key ? 'rgba(201,168,76,0.15)' : 'var(--card)',
                color: activeTab === key ? 'var(--gold)' : 'var(--text-muted)',
                outline: activeTab === key ? '1px solid rgba(201,168,76,0.35)' : '1px solid var(--border)',
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* LEADERBOARD TAB */}
          {activeTab === 'leaderboard' && (
            <div className="card-glow">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🏆 <span style={{ color: 'var(--gold)' }}>Leaderboard</span>
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--card-mid)', padding: '0.25rem 0.75rem', borderRadius: '999px', border: '1px solid var(--border)' }}>
                  Par {PAR}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sorted.map((team, idx) => {
                  const total = getTotal(team.scores)
                  const holesPlayed = team.scores.length
                  const parForPlayed = calcPar(team.scores)
                  const par = toParStr(total, parForPlayed)
                  const isLeading = idx === 0 && total > 0
                  const isMyTeam = team.id === myTeamId
                  return (
                    <div key={team.id} style={{
                      display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', borderRadius: '1rem',
                      background: isLeading ? 'rgba(201,168,76,0.1)' : idx % 2 === 0 ? 'var(--card-mid)' : 'transparent',
                      border: isMyTeam ? '1px solid rgba(201,168,76,0.4)' : isLeading ? '1px solid rgba(201,168,76,0.25)' : '1px solid transparent',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ width: '2rem', textAlign: 'center', flexShrink: 0 }}>
                        {idx === 0 && total > 0 ? <span style={{ fontSize: '1.35rem' }}>🥇</span>
                          : idx === 1 && total > 0 ? <span style={{ fontSize: '1.35rem' }}>🥈</span>
                          : idx === 2 && total > 0 ? <span style={{ fontSize: '1.35rem' }}>🥉</span>
                          : <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)' }}>{idx + 1}</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.1rem' }}>
                          <p style={{ fontWeight: 700, fontSize: '1rem' }}>{team.name}</p>
                          {isMyTeam && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--gold)', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '999px', padding: '0.05rem 0.4rem', letterSpacing: '0.05em' }}>YOU</span>}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {team.members.map((m: any) => displayName(m.profiles)).join(' · ')}
                        </p>
                      </div>
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem', letterSpacing: '0.04em' }}>HOLES</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: holesPlayed === 18 ? 'var(--gold)' : 'var(--cream)' }}>{holesPlayed}/18</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '3rem', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.1rem', letterSpacing: '0.04em' }}>TO PAR</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: toParColor(total, parForPlayed), lineHeight: 1 }}>
                          {par || (total > 0 ? total : '—')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '3.5rem', flexShrink: 0, paddingLeft: '0.75rem', borderLeft: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.1rem', letterSpacing: '0.04em' }}>SCORE</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: isLeading ? 'var(--gold)' : 'var(--white)', lineHeight: 1 }}>{total || '—'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TEE SHEET TAB */}
          {activeTab === 'teesheet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🕐 Tee Sheet
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.25rem 0.75rem' }}>
                  {teesheetSorted.filter(t => t.tee_time).length} of {teesheetSorted.length} tee times set
                </span>
              </div>
              {teesheetSorted.map((team) => {
                const total = getTotal(team.scores)
                const holesPlayed = team.scores.length
                const parForPlayed = calcPar(team.scores)
                const par = toParStr(total, parForPlayed)
                const isMyTeam = team.id === myTeamId
                return (
                  <div key={team.id} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.25rem', borderRadius: '1.25rem',
                    background: isMyTeam ? 'rgba(201,168,76,0.07)' : 'var(--card)',
                    border: isMyTeam ? '1px solid rgba(201,168,76,0.35)' : '1px solid var(--border)',
                    transition: 'all 0.2s', flexWrap: 'wrap',
                  }}>
                    {/* Tee time pill */}
                    <div style={{ flexShrink: 0, minWidth: '80px' }}>
                      {team.tee_time ? (
                        <div style={{
                          background: isMyTeam ? 'rgba(201,168,76,0.12)' : 'var(--card-mid)',
                          border: `1px solid ${isMyTeam ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
                          borderRadius: '0.875rem', padding: '0.45rem 0.875rem', textAlign: 'center',
                        }}>
                          <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.15rem' }}>TEE TIME</p>
                          <p style={{ fontSize: '1.05rem', fontWeight: 700, color: isMyTeam ? 'var(--gold)' : 'var(--cream)', lineHeight: 1 }}>{team.tee_time}</p>
                        </div>
                      ) : (
                        <div style={{ background: 'var(--card-mid)', border: '1px solid var(--border)', borderRadius: '0.875rem', padding: '0.45rem 0.875rem', textAlign: 'center' }}>
                          <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.15rem' }}>TEE TIME</p>
                          <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)' }}>TBD</p>
                        </div>
                      )}
                    </div>

                    {/* Team info */}
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <p style={{ fontWeight: 700, fontSize: '1rem', color: isMyTeam ? 'var(--gold)' : 'var(--cream)' }}>{team.name}</p>
                        {isMyTeam && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--gold)', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '999px', padding: '0.1rem 0.45rem', letterSpacing: '0.05em' }}>YOUR TEAM</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {team.members.map((m: any) => (
                          <span key={m.id} style={{ fontSize: '0.75rem', padding: '0.15rem 0.55rem', borderRadius: '999px', background: 'var(--card-mid)', border: '1px solid var(--border)', color: 'var(--cream)' }}>
                            {displayName(m.profiles)}
                            {m.profiles?.handicap != null && <span style={{ color: 'var(--text-muted)', marginLeft: '0.25rem' }}>({m.profiles.handicap})</span>}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Live score if started */}
                    {total > 0 && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.15rem', letterSpacing: '0.05em' }}>LIVE · {holesPlayed}/18</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: toParColor(total, parForPlayed), lineHeight: 1 }}>
                          {par || total}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* SCORECARDS TAB */}
          {activeTab === 'scorecards' && (
            <div>
              <h2 style={{ fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 700 }}>TEAM SCORECARDS</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                {teams.map(team => {
                  const total = getTotal(team.scores)
                  const holesPlayed = team.scores.length
                  const parForPlayed = calcPar(team.scores)
                  const par = toParStr(total, parForPlayed)
                  const isMyTeam = team.id === myTeamId
                  return (
                    <div key={team.id} className="card" style={{ border: isMyTeam ? '1px solid rgba(201,168,76,0.35)' : undefined }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--gold)' }}>{team.name}</h3>
                            {isMyTeam && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--gold)', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '999px', padding: '0.05rem 0.4rem', letterSpacing: '0.05em' }}>YOU</span>}
                          </div>
                          {team.tee_time && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⏱ Tee: {team.tee_time}</span>
                          )}
                        </div>
                        {par && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: toParColor(total, parForPlayed), lineHeight: 1 }}>{par}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>to par</div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
                        {team.members.map((m: any) => (
                          <span key={m.id} style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'var(--card-mid)', border: '1px solid var(--border)', color: 'var(--cream)' }}>
                            {displayName(m.profiles)}
                            {m.profiles?.handicap != null && <span style={{ color: 'var(--text-muted)', marginLeft: '0.3rem' }}>({m.profiles.handicap})</span>}
                          </span>
                        ))}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '2px', marginBottom: '2px' }}>
                        {ALL_HOLES.slice(0, 9).map(h => {
                          const score = team.scores.find((s: Score) => s.hole_number === h)
                          const hole = HOLES[h - 1]
                          const under = score && score.strokes < hole.par
                          const over = score && score.strokes > hole.par
                          return (
                            <div key={h} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{h}</div>
                              <div style={{ height: '26px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, background: score ? (under ? 'rgba(201,168,76,0.25)' : over ? 'rgba(255,107,107,0.2)' : 'rgba(240,230,204,0.08)') : 'var(--card-mid)', color: score ? (under ? 'var(--gold)' : over ? '#ff8f8f' : 'var(--white)') : 'var(--border)' }}>
                                {score?.strokes || '·'}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '2px', marginBottom: '0.75rem' }}>
                        {ALL_HOLES.slice(9).map(h => {
                          const score = team.scores.find((s: Score) => s.hole_number === h)
                          const hole = HOLES[h - 1]
                          const under = score && score.strokes < hole.par
                          const over = score && score.strokes > hole.par
                          return (
                            <div key={h} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{h}</div>
                              <div style={{ height: '26px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, background: score ? (under ? 'rgba(201,168,76,0.25)' : over ? 'rgba(255,107,107,0.2)' : 'rgba(240,230,204,0.08)') : 'var(--card-mid)', color: score ? (under ? 'var(--gold)' : over ? '#ff8f8f' : 'var(--white)') : 'var(--border)' }}>
                                {score?.strokes || '·'}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{holesPlayed}/18 holes</span>
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(201,168,76,0.25)', display: 'inline-block' }} />
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>under</span>
                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(255,107,107,0.2)', display: 'inline-block', marginLeft: '0.25rem' }} />
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>over</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold)' }}>{total || '—'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
