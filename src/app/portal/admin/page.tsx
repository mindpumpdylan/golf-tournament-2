'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { format } from 'date-fns'

const CURRENT_YEAR = new Date().getFullYear()

export default function AdminPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Profile[]>([])
  const [availability, setAvailability] = useState<{date: string, count: number}[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [teamName, setTeamName] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<'availability'|'players'|'teams'>('availability')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
      if (!prof?.is_admin) { router.push('/portal'); return }
      loadAll()
    })
  }, [router])

  const loadAll = async () => {
    const { data: pl } = await supabase.from('profiles').select('*').order('full_name')
    setPlayers(pl || [])
    const { data: av } = await supabase.from('availability_dates').select('date')
    if (av) {
      const counts: {[date: string]: number} = {}
      av.forEach((a: {date: string}) => { counts[a.date] = (counts[a.date] || 0) + 1 })
      const sorted = Object.entries(counts).map(([date, count]) => ({date, count}))
        .sort((a, b) => b.count - a.count)
      setAvailability(sorted)
    }
    const { data: tm } = await supabase.from('teams').select('*, team_members(*, profiles(*))').eq('tournament_year', CURRENT_YEAR)
    setTeams(tm || [])
  }

  const handleCreateTeam = async () => {
    if (!teamName || selectedPlayers.length === 0) return
    const { data: team } = await supabase.from('teams').insert({ name: teamName, tournament_year: CURRENT_YEAR }).select().single()
    if (team) {
      await supabase.from('team_members').insert(selectedPlayers.map(pid => ({ team_id: team.id, player_id: pid })))
      setTeamName(''); setSelectedPlayers([])
      setMessage(`Team "${teamName}" created!`)
      loadAll()
    }
  }

  const handleDeleteTeam = async (id: string) => {
    await supabase.from('team_members').delete().eq('team_id', id)
    await supabase.from('teams').delete().eq('id', id)
    loadAll()
  }

  const handleToggleAdmin = async (playerId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_admin: !current }).eq('id', playerId)
    loadAll()
  }

  const tabs = [
    { key: 'availability', label: '📅 Date Poll' },
    { key: 'players', label: '👥 Players' },
    { key: 'teams', label: '⛳ Teams' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold" style={{color:'var(--green-deep)'}}>⚙️ Admin Dashboard</h1>
        <p className="mt-1" style={{color:'var(--text-mid)'}}>Manage the {CURRENT_YEAR} tournament</p>
      </div>

      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: tab === t.key ? 'var(--green-mid)' : 'white',
              color: tab === t.key ? 'white' : 'var(--text-mid)',
              border: '1px solid #e0ddd6'
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div className="px-4 py-3 rounded-lg text-sm" style={{background:'#e6f4ea', color:'#1a6b3a'}}>{message}</div>
      )}

      {tab === 'availability' && (
        <div className="card">
          <h2 className="font-display font-bold text-xl mb-4" style={{color:'var(--green-deep)'}}>Date Availability Results</h2>
          {availability.length === 0 ? (
            <p style={{color:'var(--text-mid)'}}>No responses yet</p>
          ) : (
            <div className="space-y-2">
              {availability.map(({date, count}) => (
                <div key={date} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-36" style={{color:'var(--green-deep)'}}>
                    {format(new Date(date + 'T12:00:00'), 'EEE, MMM d yyyy')}
                  </span>
                  <div className="flex-1 h-6 rounded-full overflow-hidden" style={{background:'var(--gray-soft)'}}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${(count / Math.max(players.length, 1)) * 100}%`,
                        background: 'var(--green-mid)',
                        minWidth: '32px'
                      }}>
                    </div>
                  </div>
                  <span className="text-sm font-bold w-16 text-right" style={{color:'var(--green-mid)'}}>
                    {count} / {players.length}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'players' && (
        <div className="card">
          <h2 className="font-display font-bold text-xl mb-4" style={{color:'var(--green-deep)'}}>Registered Players</h2>
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl" style={{background:'var(--gray-soft)'}}>
                <div>
                  <p className="font-semibold" style={{color:'var(--green-deep)'}}>{p.full_name}</p>
                  <p className="text-sm" style={{color:'var(--text-mid)'}}>
                    {p.email} · HCP: {p.handicap ?? 'N/A'} {p.ghin_number ? `· GHIN: ${p.ghin_number}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {p.is_admin && <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'var(--gold)', color:'var(--green-deep)'}}>Admin</span>}
                  <button onClick={() => handleToggleAdmin(p.id, p.is_admin)}
                    className="text-xs px-3 py-1 rounded-lg border"
                    style={{borderColor:'#e0ddd6', color:'var(--text-mid)'}}>
                    {p.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'teams' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-display font-bold text-xl mb-4" style={{color:'var(--green-deep)'}}>Create Team</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Team Name</label>
                <input value={teamName} onChange={e => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="Team Birdie" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Select Players</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {players.map(p => (
                    <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
                      style={{background: selectedPlayers.includes(p.id) ? '#e6f4ea' : 'var(--gray-soft)'}}>
                      <input type="checkbox" checked={selectedPlayers.includes(p.id)}
                        onChange={e => setSelectedPlayers(prev =>
                          e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                        )} />
                      <span className="text-sm">{p.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleCreateTeam} className="btn-primary">Create Team</button>
            </div>
          </div>

          {teams.length > 0 && (