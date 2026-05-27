'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Team, Score } from '@/lib/types'

const CURRENT_YEAR = new Date().getFullYear()
const HOLES = Array.from({length: 18}, (_, i) => i + 1)

export default function TournamentPage() {
  const [teams, setTeams] = useState<(Team & { members: any[], scores: Score[] })[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: teamsData } = await supabase.from('teams')
      .select('*, team_members(*, profiles(*))')
      .eq('tournament_year', CURRENT_YEAR)
    const { data: scoresData } = await supabase.from('scores').select('*')

    if (teamsData) {
      const enriched = teamsData.map((t: any) => ({
        ...t,
        members: t.team_members || [],
        scores: scoresData?.filter((s: Score) => s.team_id === t.id) || []
      }))
      setTeams(enriched)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const sub = supabase.channel('scores').on('postgres_changes',
      { event: '*', schema: 'public', table: 'scores' }, load).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  const getTeamTotal = (scores: Score[]) => scores.reduce((sum, s) => sum + s.strokes, 0)
  const sortedTeams = [...teams].sort((a, b) => getTeamTotal(a.scores) - getTeamTotal(b.scores))

  if (loading) return <div className="text-center py-20" style={{color:'var(--text-mid)'}}>Loading tournament...</div>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold" style={{color:'var(--green-deep)'}}>
          {CURRENT_YEAR} Tournament
        </h1>
        <p className="mt-1" style={{color:'var(--text-mid)'}}>Live teams and leaderboard</p>
      </div>

      {teams.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🏌️</div>
          <h2 className="font-display text-xl mb-2" style={{color:'var(--green-deep)'}}>Teams Not Yet Announced</h2>
          <p style={{color:'var(--text-mid)'}}>Check back closer to tournament day!</p>
        </div>
      ) : (
        <>
          <div className="card">
            <h2 className="font-display font-bold text-xl mb-4" style={{color:'var(--green-deep)'}}>🏆 Leaderboard</h2>
            <div className="space-y-2">
              {sortedTeams.map((team, idx) => (
                <div key={team.id} className="flex items-center gap-4 p-3 rounded-xl"
                  style={{background: idx === 0 ? '#fff8e7' : 'var(--gray-soft)'}}>
                  <span className="text-2xl font-display font-bold w-8 text-center"
                    style={{color: idx === 0 ? 'var(--gold)' : 'var(--text-mid)'}}>
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold" style={{color:'var(--green-deep)'}}>{team.name}</p>
                    <p className="text-sm" style={{color:'var(--text-mid)'}}>
                      {team.members.map((m: any) => m.profiles?.full_name).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-display" style={{color:'var(--green-mid)'}}>
                      {getTeamTotal(team.scores) || '—'}
                    </p>
                    <p className="text-xs" style={{color:'var(--text-mid)'}}>
                      {team.scores.length}/18 holes
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map(team => (
              <div key={team.id} className="card">
                <h3 className="font-display font-bold text-lg mb-3" style={{color:'var(--green-deep)'}}>{team.name}</h3>
                <div className="space-y-2 mb-4">
                  {team.members.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{m.profiles?.full_name}</span>
                      <span className="text-xs px-2 py-1 rounded-full" style={{background:'var(--gray-soft)', color:'var(--text-mid)'}}>
                        HCP: {m.profiles?.handicap ?? 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-9 gap-1 text-xs">
                  {HOLES.slice(0, 9).map(h => {
                    const score = team.scores.find(s => s.hole_number === h)
                    return (
                      <div key={h} className="text-center">
                        <div className="font-medium" style={{color:'var(--text-mid)'}}>{h}</div>
                        <div className="w-7 h-7 rounded flex items-center justify-center mx-auto font-bold"
                          style={{background: score ? 'var(--green-mid)' : 'var(--gray-soft)', color: score ? 'white' : '#ccc'}}>
                          {score?.strokes || '·'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="grid grid-cols-9 gap-1 text-xs mt-1">
                  {HOLES.slice(9).map(h => {
                    const score = team.scores.find(s => s.hole_number === h)
                    return (
                      <div key={h} className="text-center">
                        <div className="font-medium" style={{color:'var(--text-mid)'}}>{h}</div>
                        <div className="w-7 h-7 rounded flex items-center justify-center mx-auto font-bold"
                          style={{background: score ? 'var(--green-mid)' : 'var(--gray-soft)', color: score ? 'white' : '#ccc'}}>
                          {score?.strokes || '·'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}