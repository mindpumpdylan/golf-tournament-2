'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR } from '@/lib/constants'
import { format } from 'date-fns'
import { displayName as getDisplayName } from '@/lib/utils'

const SIGNUP_URL = 'https://highcountryclassic.com/signup'

const STATUS_OPTIONS = [
  { value: 'pre-tournament',    label: 'Pre-Tournament',    desc: 'Registration not yet open' },
  { value: 'registration-open', label: 'Registration Open', desc: 'Players can register and submit availability' },
  { value: 'pairings-released', label: 'Pairings Released', desc: 'Teams and tee times are published' },
  { value: 'tournament-day',    label: 'Tournament Day',    desc: 'Active tournament — scoring enabled' },
  { value: 'scoring-complete',  label: 'Scoring Complete',  desc: 'All scores entered — reviewing results' },
  { value: 'results-final',     label: 'Results Final',     desc: 'Official results published' },
]

export default function AdminPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<any[]>([])
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())
  const [availability, setAvailability] = useState<{ date: string, count: number, names: string[] }[]>([])
  const [playerDates, setPlayerDates] = useState<Record<string, string[]>>({})
  const [tournamentDate, setTournamentDate] = useState<string | null>(null)
  const [settingDate, setSettingDate] = useState(false)
  const [teams, setTeams] = useState<any[]>([])
  const [teamName, setTeamName] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<'availability' | 'players' | 'teams' | 'reservations' | 'settings'>('availability')

  // Tee time + lock state
  const [teeTimeInputs, setTeeTimeInputs] = useState<{ [id: string]: string }>({})
  const [savingTeeTime, setSavingTeeTime] = useState<string | null>(null)

  // Auto-balance state
  const [autoBalanceCount, setAutoBalanceCount] = useState('4')
  const [autoBalancePreview, setAutoBalancePreview] = useState<any[][]>([])
  const [creatingBalanced, setCreatingBalanced] = useState(false)

  // Tournament status state
  const [tournamentStatus, setTournamentStatus] = useState('pre-tournament')
  const [updatingStatus, setUpdatingStatus] = useState(false)

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

    const { data: regs } = await supabase.from('tournament_registrations').select('player_id').eq('tournament_year', CURRENT_YEAR)
    setRegisteredIds(new Set(regs?.map((r: any) => r.player_id) || []))

    try {
      const { data: { session: avSession } } = await supabase.auth.getSession()
      const avToken = avSession?.access_token
      if (avToken) {
        const avRes = await fetch('/api/admin/availability', {
          headers: { Authorization: `Bearer ${avToken}` }
        })
        if (avRes.ok) {
          const { data: avData } = await avRes.json()
          const counts: { [date: string]: { count: number, names: string[] } } = {}
          const perPlayer: Record<string, string[]> = {}
          ;(avData || []).forEach((a: any) => {
            if (!counts[a.date]) counts[a.date] = { count: 0, names: [] }
            counts[a.date].count++
            const name = a.profiles?.nickname?.trim() || a.profiles?.full_name
            if (name) counts[a.date].names.push(name)
            if (a.user_id) {
              if (!perPlayer[a.user_id]) perPlayer[a.user_id] = []
              perPlayer[a.user_id].push(a.date)
            }
          })
          setAvailability(Object.entries(counts).map(([date, { count, names }]) => ({ date, count, names })).sort((a, b) => b.count - a.count))
          setPlayerDates(perPlayer)
        }
      }
    } catch {}

    try {
      const { data: tdRow } = await supabase.from('tournament_settings').select('value').eq('key', 'tournament_date').maybeSingle()
      if (tdRow?.value) setTournamentDate(tdRow.value)
    } catch {}

    const { data: tm } = await supabase.from('teams').select('*, team_members(*, profiles(*))').eq('tournament_year', CURRENT_YEAR)
    setTeams(tm || [])
    if (tm) {
      const map: { [id: string]: string } = {}
      tm.forEach((t: any) => { map[t.id] = t.tee_time || '' })
      setTeeTimeInputs(map)
    }

    try {
      const { data: statusRow } = await supabase.from('tournament_settings').select('value').eq('key', 'status').maybeSingle()
      if (statusRow?.value) setTournamentStatus(statusRow.value)
    } catch {}
  }

  const handleCreateTeam = async () => {
    if (!teamName || selectedPlayers.length === 0) return
    const { data: team } = await supabase.from('teams').insert({ name: teamName, tournament_year: CURRENT_YEAR }).select().single()
    if (team) {
      await supabase.from('team_members').insert(selectedPlayers.map(pid => ({ team_id: team.id, player_id: pid })))
      setTeamName(''); setSelectedPlayers([])
      setMessage('Team "' + teamName + '" created!'); loadAll()
    }
  }

  const handleDeleteTeam = async (id: string) => {
    await supabase.from('team_members').delete().eq('team_id', id)
    await supabase.from('teams').delete().eq('id', id)
    loadAll()
  }

  const handleSaveTeeTime = async (teamId: string) => {
    setSavingTeeTime(teamId)
    await supabase.from('teams').update({ tee_time: teeTimeInputs[teamId] || null }).eq('id', teamId)
    setSavingTeeTime(null); setMessage('Tee time saved!')
    setTimeout(() => setMessage(''), 3000)
    loadAll()
  }

  const handleToggleLock = async (team: any) => {
    await supabase.from('teams').update({ is_locked: !team.is_locked }).eq('id', team.id)
    loadAll()
  }

  const handleAutoBalance = () => {
    const n = Math.max(2, Math.min(8, parseInt(autoBalanceCount) || 4))
    const sorted = [...players].sort((a, b) => {
      if (a.handicap == null && b.handicap == null) return 0
      if (a.handicap == null) return 1
      if (b.handicap == null) return -1
      return a.handicap - b.handicap
    })
    const buckets: any[][] = Array.from({ length: n }, () => [])
    sorted.forEach((player, idx) => {
      const round = Math.floor(idx / n)
      const col = round % 2 === 0 ? idx % n : n - 1 - (idx % n)
      buckets[col].push(player)
    })
    setAutoBalancePreview(buckets)
  }

  const handleCreateBalanced = async () => {
    setCreatingBalanced(true)
    for (let i = 0; i < autoBalancePreview.length; i++) {
      const members = autoBalancePreview[i]
      if (members.length === 0) continue
      const { data: team } = await supabase.from('teams').insert({ name: `Team ${i + 1}`, tournament_year: CURRENT_YEAR }).select().single()
      if (team) await supabase.from('team_members').insert(members.map((p: any) => ({ team_id: team.id, player_id: p.id })))
    }
    setAutoBalancePreview([])
    setMessage(`${autoBalancePreview.length} teams auto-created!`)
    setCreatingBalanced(false); loadAll()
  }

  const handleUpdateStatus = async (value: string) => {
    setUpdatingStatus(true)
    await supabase.from('tournament_settings').upsert({ key: 'status', value })
    setTournamentStatus(value); setUpdatingStatus(false)
    setMessage(`Status updated to "${STATUS_OPTIONS.find(s => s.value === value)?.label}"`)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleSetTournamentDate = async (dateStr: string) => {
    setSettingDate(true)
    if (dateStr) {
      await supabase.from('tournament_settings').upsert({ key: 'tournament_date', value: dateStr })
      setTournamentDate(dateStr)
    } else {
      await supabase.from('tournament_settings').delete().eq('key', 'tournament_date')
      setTournamentDate(null)
    }
    setSettingDate(false)
  }

  const tabs = [
    { key: 'availability', label: 'Date Poll' },
    { key: 'players', label: 'Players' },
    { key: 'teams', label: 'Teams' },
    { key: 'reservations', label: 'Reservations' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage the {CURRENT_YEAR} High Country Classic</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '0.6rem 1.25rem', borderRadius: '0.875rem', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
            background: tab === t.key ? 'var(--gold)' : 'var(--navy-card)',
            color: tab === t.key ? '#0d0f0a' : 'var(--text-muted)',
            border: '1px solid ' + (tab === t.key ? 'var(--gold)' : 'var(--navy-border)'),
          }}>{t.label}</button>
        ))}
      </div>

      {message && (
        <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '1rem', padding: '1rem', color: 'var(--gold)', fontSize: '0.9rem' }}>
          {message}
        </div>
      )}

      {/* DATE POLL TAB */}
      {tab === 'availability' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tournamentDate && (
            <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '1.25rem', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📅</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.15rem' }}>TOURNAMENT DATE SET</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold)' }}>
                  {format(new Date(tournamentDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <button onClick={() => handleSetTournamentDate('')} disabled={settingDate} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff8f8f' }}>
                {settingDate ? '...' : 'Unset'}
              </button>
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.3rem' }}>Date Poll Results — {CURRENT_YEAR}</h2>
              {availability.length > 0 && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', background: 'var(--navy-light)', padding: '0.25rem 0.75rem', borderRadius: '999px' }}>
                  {players.length} players · {availability.length} date{availability.length !== 1 ? 's' : ''} voted
                </span>
              )}
            </div>
            {availability.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No responses yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {availability.map(({ date, count, names }, idx) => {
                  const pct = players.length > 0 ? Math.round((count / players.length) * 100) : 0
                  const barPct = (count / Math.max(availability[0]?.count || 1, 1)) * 100
                  const isChosen = tournamentDate === date
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null

                  return (
                    <div key={date} style={{
                      background: isChosen ? 'rgba(201,168,76,0.1)' : idx === 0 ? 'rgba(201,168,76,0.05)' : 'var(--navy-light)',
                      border: isChosen ? '1px solid rgba(201,168,76,0.35)' : '1px solid transparent',
                      borderRadius: '1rem', padding: '0.875rem 1.125rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: medal ? '1.1rem' : '0.78rem', width: '24px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>
                          {isChosen ? '📅' : medal || (idx + 1)}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isChosen || idx === 0 ? 'var(--gold)' : 'var(--white)', flex: 1 }}>
                          {format(new Date(date + 'T12:00:00'), 'EEE, MMM d, yyyy')}
                          {isChosen && <span style={{ marginLeft: '0.5rem', fontSize: '0.68rem', letterSpacing: '0.06em', background: 'rgba(201,168,76,0.15)', padding: '0.1rem 0.5rem', borderRadius: '999px' }}>TOURNAMENT DATE</span>}
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>{count} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>({pct}%)</span></span>
                        <button
                          onClick={() => handleSetTournamentDate(isChosen ? '' : date)}
                          disabled={settingDate}
                          style={{ padding: '0.3rem 0.7rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: isChosen ? 'rgba(255,107,107,0.1)' : 'rgba(201,168,76,0.12)', border: isChosen ? '1px solid rgba(255,107,107,0.3)' : '1px solid rgba(201,168,76,0.3)', color: isChosen ? '#ff8f8f' : 'var(--gold)' }}
                        >
                          {settingDate ? '...' : isChosen ? 'Unset' : 'Set Date'}
                        </button>
                      </div>
                      <div style={{ paddingLeft: '32px' }}>
                        <div style={{ height: '5px', background: 'rgba(61,50,32,0.5)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.6rem' }}>
                          <div style={{ height: '100%', borderRadius: '999px', width: `${barPct}%`, background: isChosen || idx === 0 ? 'var(--gold)' : 'rgba(201,168,76,0.45)', transition: 'width 0.5s ease' }} />
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {(names || []).map((name: string) => (
                            <span key={name} style={{ padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.76rem', background: 'rgba(201,168,76,0.08)', color: 'rgba(201,168,76,0.8)', border: '1px solid rgba(201,168,76,0.15)' }}>
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLAYERS TAB */}
      {tab === 'players' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem' }}>Players ({players.length})</h2>
            <span style={{ fontSize: '0.85rem', color: registeredIds.size === players.length ? 'var(--gold)' : 'var(--text-muted)', fontWeight: 700 }}>
              {registeredIds.size}/{players.length} registered for {CURRENT_YEAR}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {players.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: 'var(--navy-light)', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{getDisplayName(p)}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {p.email} · HCP: {p.handicap ?? 'N/A'} {p.ghin_number ? '· GHIN: ' + p.ghin_number : ''}
                  </p>
                  {(playerDates[p.id] || []).length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
                      {[...(playerDates[p.id] || [])].sort().map(date => (
                        <span key={date} style={{ padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', background: 'rgba(201,168,76,0.08)', color: 'rgba(201,168,76,0.75)', border: '1px solid rgba(201,168,76,0.15)' }}>
                          {format(new Date(date + 'T12:00:00'), 'MMM d')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'rgba(139,125,107,0.5)', marginTop: '0.4rem', fontStyle: 'italic' }}>No dates selected</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {registeredIds.has(p.id) && (
                    <span style={{ padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(201,168,76,0.12)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>
                      ✓ Registered
                    </span>
                  )}
                  {p.is_admin && <span className="badge-gold">Admin</span>}
                  <button
                    onClick={async () => { await supabase.from('profiles').update({ is_admin: !p.is_admin }).eq('id', p.id); loadAll() }}
                    className="btn-ghost"
                    style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}>
                    {p.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TEAMS TAB */}
      {tab === 'teams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Auto-Balance Panel */}
          <div className="card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Auto-Balance Teams by Handicap</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Snake-draft distributes players evenly by handicap. Players without a handicap go last.</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>NUMBER OF TEAMS</label>
                <input className="input" type="number" min="2" max="8" value={autoBalanceCount}
                  onChange={e => setAutoBalanceCount(e.target.value)} style={{ width: '120px' }} />
              </div>
              <button onClick={handleAutoBalance} className="btn-ghost" style={{ padding: '0.65rem 1.25rem' }}>Preview Balance</button>
            </div>

            {autoBalancePreview.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  {autoBalancePreview.map((bucket, i) => (
                    <div key={i} style={{ background: 'var(--navy-light)', borderRadius: '0.875rem', padding: '0.875rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Team {i + 1}</p>
                      {bucket.map((p: any) => (
                        <div key={p.id} style={{ fontSize: '0.8rem', color: 'var(--white)', padding: '0.2rem 0' }}>
                          {p.full_name} <span style={{ color: 'var(--text-muted)' }}>(HCP: {p.handicap ?? 'N/A'})</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={handleCreateBalanced} disabled={creatingBalanced} className="btn-electric">
                    {creatingBalanced ? 'Creating...' : 'Create These Teams'}
                  </button>
                  <button onClick={() => setAutoBalancePreview([])} className="btn-ghost" style={{ padding: '0.65rem 1.25rem' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Manual Create Team */}
          <div className="card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Create Team Manually</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>TEAM NAME</label>
                <input className="input" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Eagle" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>SELECT PLAYERS</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                  {players.map(p => (
                    <label key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.75rem', cursor: 'pointer',
                      background: selectedPlayers.includes(p.id) ? 'rgba(201,168,76,0.1)' : 'var(--navy-light)',
                      border: '1px solid ' + (selectedPlayers.includes(p.id) ? 'rgba(201,168,76,0.35)' : 'transparent'),
                      transition: 'all 0.15s'
                    }}>
                      <input type="checkbox" checked={selectedPlayers.includes(p.id)}
                        onChange={e => setSelectedPlayers(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                        style={{ accentColor: 'var(--gold)' }} />
                      <div>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{p.full_name}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HCP: {p.handicap ?? 'N/A'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={handleCreateTeam} className="btn-electric" style={{ alignSelf: 'flex-start' }}>Create Team</button>
            </div>
          </div>

          {/* Existing Teams */}
          {teams.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Current Teams</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {teams.map(team => (
                  <div key={team.id} style={{ background: 'var(--navy-light)', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gold)' }}>{team.name}</span>
                        {team.is_locked && <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(255,107,107,0.12)', color: '#ff8f8f', border: '1px solid rgba(255,107,107,0.25)' }}>🔒 Locked</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={() => handleToggleLock(team)} style={{
                          padding: '0.35rem 0.875rem', borderRadius: '0.65rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                          background: team.is_locked ? 'rgba(255,107,107,0.1)' : 'rgba(201,168,76,0.1)',
                          border: `1px solid ${team.is_locked ? 'rgba(255,107,107,0.3)' : 'rgba(201,168,76,0.25)'}`,
                          color: team.is_locked ? '#ff8f8f' : 'var(--gold)',
                        }}>
                          {team.is_locked ? '🔓 Unlock' : '🔒 Lock Scoring'}
                        </button>
                        <button onClick={() => handleDeleteTeam(team.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>Delete</button>
                      </div>
                    </div>

                    {/* Tee Time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', minWidth: '60px' }}>TEE TIME</span>
                      <input
                        className="input"
                        value={teeTimeInputs[team.id] || ''}
                        onChange={e => setTeeTimeInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                        placeholder="e.g. 8:00 AM"
                        style={{ width: '140px', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                      />
                      <button
                        onClick={() => handleSaveTeeTime(team.id)}
                        disabled={savingTeeTime === team.id}
                        style={{ padding: '0.35rem 0.875rem', borderRadius: '0.65rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--gold)', transition: 'all 0.15s' }}>
                        {savingTeeTime === team.id ? '...' : 'Save'}
                      </button>
                    </div>

                    {/* Players */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {team.team_members?.map((m: any) => (
                        <span key={m.id} style={{ padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', background: 'var(--navy-card)', color: 'var(--white)' }}>
                          {m.profiles?.full_name} (HCP: {m.profiles?.handicap ?? 'N/A'})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESERVATIONS TAB */}
      {tab === 'reservations' && <ReservationsAdmin />}

      {/* SETTINGS TAB */}
      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Tournament Status */}
          <div className="card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Tournament Status</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Controls the banner shown on the portal home page for all players.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => handleUpdateStatus(opt.value)} disabled={updatingStatus} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', borderRadius: '0.875rem', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                  background: tournamentStatus === opt.value ? 'rgba(201,168,76,0.1)' : 'var(--navy-light)',
                  border: `1px solid ${tournamentStatus === opt.value ? 'rgba(201,168,76,0.35)' : 'transparent'}`,
                }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: tournamentStatus === opt.value ? 'var(--gold)' : 'var(--white)', marginBottom: '0.15rem' }}>{opt.label}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{opt.desc}</p>
                  </div>
                  {tournamentStatus === opt.value && <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gold)' }}>✓ Active</span>}
                </button>
              ))}
            </div>
          </div>

          {/* QR Code */}
          <div className="card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Signup QR Code</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Display at the course or share it — players scan to create their account.</p>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ background: 'white', padding: '1rem', borderRadius: '1rem', display: 'inline-block' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(SIGNUP_URL)}&format=png`}
                  alt="Signup QR Code"
                  width={200}
                  height={200}
                  style={{ display: 'block' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Links to:</p>
                <code style={{ fontSize: '0.85rem', color: 'var(--gold)', background: 'var(--navy-light)', padding: '0.4rem 0.75rem', borderRadius: '0.5rem' }}>{SIGNUP_URL}</code>
                <a href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(SIGNUP_URL)}&format=png`} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '0.875rem', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--gold)', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', width: 'fit-content' }}>
                  ⬇ Download PNG
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReservationsAdmin() {
  const [reservations, setReservations] = useState<any[]>([])
  const [signedUpEmails, setSignedUpEmails] = useState<Set<string>>(new Set())
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [smsCopiedId, setSmsCopiedId] = useState<string | null>(null)
  const [sendMsg, setSendMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null)

  const load = async () => {
    const { data } = await supabase.from('reservations')
      .select('*, reserver:profiles!reserver_id(full_name)')
      .order('created_at', { ascending: false })
    const list = data || []
    setReservations(list)
    const emails = list.filter((r: any) => r.guest_email).map((r: any) => r.guest_email)
    if (emails.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('email').in('email', emails)
      setSignedUpEmails(new Set(profs?.map((p: any) => p.email) || []))
    }
  }

  useEffect(() => { load() }, [])

  const handleSendInvite = async (r: any) => {
    setSendingId(r.id)
    const token = Math.random().toString(36).substring(2, 15)
    const expires = new Date(); expires.setDate(expires.getDate() + 10)
    await supabase.from('reservations').update({ invite_token: token, invite_expires_at: expires.toISOString(), status: 'pending' }).eq('id', r.id)
    let emailOk = false
    if (r.guest_email) {
      const res = await fetch('/api/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: r.guest_email, name: r.guest_name, token, inviter: 'High Country Classic' })
      })
      emailOk = res.ok
    }
    setSendMsg({ id: r.id, ok: emailOk || !r.guest_email, text: r.guest_email ? (emailOk ? `Invite emailed to ${r.guest_name}!` : 'Email failed — use Copy Link to share manually.') : 'Link generated — use Copy Link or Copy SMS to share.' })
    setTimeout(() => setSendMsg(null), 5000)
    setSendingId(null)
    load()
  }

  const handleExpire = async (id: string) => {
    await supabase.from('reservations').update({ status: 'expired' }).eq('id', id)
    load()
  }

  const handleCopyLink = (r: any) => {
    const url = `${window.location.origin}/signup?token=${r.invite_token}`
    navigator.clipboard.writeText(url)
    setCopiedId(r.id); setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCopySms = (r: any) => {
    const url = `${window.location.origin}/signup?token=${r.invite_token}`
    const msg = `Hey ${r.guest_name}! You're invited to the High Country Classic at Apple Mountain Golf Resort. Sign up here: ${url}`
    navigator.clipboard.writeText(msg)
    setSmsCopiedId(r.id); setTimeout(() => setSmsCopiedId(null), 2000)
  }

  const getBadge = (r: any) => {
    const signedup = r.guest_email && signedUpEmails.has(r.guest_email)
    if (signedup) return { label: '✓ Signed Up', bg: 'rgba(201,168,76,0.15)', color: '#e8c97a', border: 'rgba(201,168,76,0.4)' }
    if (!r.invite_token) return { label: '🎟 Reserved', bg: 'rgba(139,127,107,0.1)', color: '#8b7d6b', border: 'rgba(61,50,32,0.5)' }
    if (r.status === 'pending') return { label: 'Invite Sent', bg: 'rgba(240,230,204,0.07)', color: '#f0e6cc', border: 'rgba(240,230,204,0.15)' }
    if (r.status === 'expired') return { label: 'Expired', bg: 'rgba(255,107,107,0.1)', color: '#ff6b6b', border: 'rgba(255,107,107,0.25)' }
    return { label: r.status, bg: 'rgba(201,168,76,0.1)', color: 'var(--gold)', border: 'rgba(201,168,76,0.25)' }
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>All Reservations ({reservations.length})</h2>
      {reservations.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No reservations yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {reservations.map(r => {
            const badge = getBadge(r)
            const signedUp = r.guest_email && signedUpEmails.has(r.guest_email)
            const hasToken = !!r.invite_token
            const isMsg = sendMsg?.id === r.id
            return (
              <div key={r.id} style={{ background: 'var(--navy-light)', borderRadius: '1rem', padding: '1rem 1.25rem', border: signedUp ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{r.guest_name}</p>
                    {r.guest_email && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{r.guest_email}</p>}
                    {r.guest_phone && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        <a href={`tel:${r.guest_phone}`} style={{ color: 'var(--gold)', textDecoration: 'none' }}>{r.guest_phone}</a>
                      </p>
                    )}
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Invited by <span style={{ color: 'var(--white)' }}>{r.reserver?.full_name || 'Unknown'}</span>
                      {r.invite_expires_at && !signedUp && r.status === 'pending' && (
                        <span> · Expires {new Date(r.invite_expires_at).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                  <span style={{ padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                    {badge.label}
                  </span>
                </div>

                {isMsg && (
                  <p style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: sendMsg.ok ? 'var(--gold)' : '#ff8f8f' }}>{sendMsg.text}</p>
                )}

                {!signedUp && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', flexWrap: 'wrap' }}>
                    {/* Send / Resend invite */}
                    <button
                      onClick={() => handleSendInvite(r)}
                      disabled={sendingId === r.id}
                      style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)' }}
                    >
                      {sendingId === r.id ? 'Sending...' : hasToken ? '✉ Resend Invite' : '✉ Send Invite'}
                    </button>

                    {/* Copy link — only if token exists */}
                    {hasToken && (
                      <button onClick={() => handleCopyLink(r)} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'transparent', border: '1px solid var(--navy-border)', color: 'var(--text-muted)' }}>
                        {copiedId === r.id ? '✓ Copied!' : '🔗 Copy Link'}
                      </button>
                    )}

                    {/* Copy SMS — if phone + token */}
                    {hasToken && r.guest_phone && (
                      <button onClick={() => handleCopySms(r)} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'transparent', border: '1px solid var(--navy-border)', color: 'var(--text-muted)' }}>
                        {smsCopiedId === r.id ? '✓ Copied!' : '💬 Copy SMS'}
                      </button>
                    )}

                    {/* Expire — only for pending */}
                    {r.status === 'pending' && hasToken && (
                      <button onClick={() => handleExpire(r.id)} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'none', border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b', marginLeft: 'auto' }}>
                        Expire
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
