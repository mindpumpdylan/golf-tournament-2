'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR, HOLES, PAR } from '@/lib/constants'
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
  const [tab, setTab] = useState<'availability' | 'players' | 'teams' | 'reservations' | 'scorecards' | 'pin' | 'announce' | 'settings'>('availability')

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

  // Pairing requests state
  const [confirmedPairs, setConfirmedPairs] = useState<any[]>([])

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

    const { data: pairs } = await supabase
      .from('pairing_requests')
      .select('id, requester_id, target_id, requester:profiles!pairing_requests_requester_id_fkey(full_name, nickname), target:profiles!pairing_requests_target_id_fkey(full_name, nickname)')
      .eq('tournament_year', CURRENT_YEAR)
      .eq('status', 'accepted')
    setConfirmedPairs(pairs || [])
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

  const handleRemoveRegistration = async (playerId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from the ${CURRENT_YEAR} tournament? Their account stays intact.`)) return
    await supabase.from('tournament_registrations').delete().eq('player_id', playerId).eq('tournament_year', CURRENT_YEAR)
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
    { key: 'scorecards', label: '🏌️ Scorecards' },
    { key: 'pin', label: '📍 Pin' },
    { key: 'announce', label: '📣 Announce' },
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {confirmedPairs.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--gold)' }}>⛳ Confirmed Pairing Requests</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {confirmedPairs.map(pair => (
                <div key={pair.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,255,135,0.06)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '0.875rem', padding: '0.65rem 1rem' }}>
                  <span style={{ color: '#00ff87', fontSize: '0.9rem' }}>✅</span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{getDisplayName(pair.requester)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>+</span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{getDisplayName(pair.target)}</span>
                  <span style={{ fontSize: '0.8rem', color: '#00ff87', marginLeft: 'auto', whiteSpace: 'nowrap' }}>want to play together</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                    {p.email} · HCP: {p.handicap ?? 'N/A'} {p.ghin_number ? '· GHIN: ' + p.ghin_number : ''} {p.phone_number ? '· ' + p.phone_number : ''}
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
                    <>
                      <span style={{ padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(201,168,76,0.12)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>
                        ✓ Registered
                      </span>
                      <button
                        onClick={() => handleRemoveRegistration(p.id, getDisplayName(p))}
                        style={{ padding: '0.3rem 0.7rem', borderRadius: '0.625rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: 'none', border: '1px solid rgba(255,107,107,0.25)', color: '#ff8f8f', whiteSpace: 'nowrap' }}>
                        Remove
                      </button>
                    </>
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

      {/* SCORECARDS TAB */}
      {tab === 'scorecards' && <ScorecardAdmin />}

      {/* PIN TAB */}
      {tab === 'pin' && <PinAdmin />}

      {/* ANNOUNCE TAB */}
      {tab === 'announce' && <AnnounceAdmin players={players} registeredIds={registeredIds} />}

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
  const [tournamentRegs, setTournamentRegs] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [signedUpEmails, setSignedUpEmails] = useState<Set<string>>(new Set())
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [smsCopiedId, setSmsCopiedId] = useState<string | null>(null)
  const [sendMsg, setSendMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null)

  const load = async () => {
    const { data: regs } = await supabase
      .from('tournament_registrations')
      .select('player_id, created_at, profiles(full_name, nickname, email, phone_number, handicap)')
      .eq('tournament_year', CURRENT_YEAR)
      .order('created_at', { ascending: true })
    setTournamentRegs(regs || [])

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
        body: JSON.stringify({ email: r.guest_email, name: r.guest_name, token, inviter: 'High Country Classic', phone: r.guest_phone || undefined })
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

  const handleDeleteReservation = async (id: string) => {
    if (!window.confirm('Delete this invitation permanently? This cannot be undone.')) return
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/admin/delete-reservation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session!.access_token}` },
      body: JSON.stringify({ id }),
    })
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Registered Players */}
      <div className="card">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>
          Registered Players <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>({tournamentRegs.length})</span>
        </h2>
        {tournamentRegs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No players registered yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {tournamentRegs.map((r: any, i: number) => {
              const prof = r.profiles as any
              const name = prof?.nickname?.trim() || prof?.full_name || 'Unknown'
              return (
                <div key={r.player_id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--navy-light)', borderRadius: '0.875rem', padding: '0.875rem 1.1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', width: '1.5rem', textAlign: 'center', flexShrink: 0 }}>#{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: 'var(--white)', marginBottom: '0.15rem' }}>{name}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {prof?.email}
                      {prof?.phone_number && <span> · {prof.phone_number}</span>}
                      {prof?.handicap != null && <span> · HCP {prof.handicap}</span>}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(201,168,76,0.12)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>
                      ✓ Registered
                    </span>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      {format(new Date(r.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Guest Invitations */}
      <div className="card">
      {(() => {
        const pending = reservations.filter(r => !r.guest_email || !signedUpEmails.has(r.guest_email))
        return <>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Guest Invitations ({pending.length})</h2>
          {pending.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No pending guest invitations</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pending.map(r => {
                const badge = getBadge(r)
                const signedUp = false
                const hasToken = !!r.invite_token
                const isMsg = sendMsg?.id === r.id
                return (
                  <div key={r.id} style={{ background: 'var(--navy-light)', borderRadius: '1rem', padding: '1rem 1.25rem', border: '1px solid transparent' }}>
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
                      <button onClick={() => handleExpire(r.id)} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'none', border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b' }}>
                        Expire
                      </button>
                    )}

                    {/* Delete */}
                    <button onClick={() => handleDeleteReservation(r.id)} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: 'none', border: '1px solid rgba(255,107,107,0.2)', color: '#ff6b6b', marginLeft: 'auto', opacity: 0.7 }}>
                      🗑 Delete
                    </button>
                  </div>
                )}
              </div>
            )
              })}
            </div>
          )}
        </>
      })()}
      </div>

    </div>
  )
}

function AnnounceAdmin({ players, registeredIds }: { players: any[], registeredIds: Set<string> }) {
  const [mode, setMode] = useState<'email' | 'sms'>('email')
  const registeredCount = registeredIds.size
  const year = new Date().getFullYear()

  // ── Email ──
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailTo, setEmailTo] = useState<'all' | 'registered'>('all')
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [emailError, setEmailError] = useState('')

  const emailCount = emailTo === 'registered' ? registeredCount : players.length

  const EMAIL_TEMPLATES = [
    { label: 'Registration Open', subject: `${year} High Country Classic — Registration Now Open!`, body: `Registration is now open for the ${year} High Country Classic at Apple Mountain Golf Resort.\n\nLog in to the player portal to confirm your spot, submit your availability, and invite guests.\n\nSee you on the course! 🏌️` },
    { label: 'Pairings Released', subject: `Your ${year} HCC Pairings Are Ready`, body: `Teams and tee times are set for the ${year} High Country Classic.\n\nLog in to the player portal to see your team, tee time, and scorecard.\n\nGood luck out there! ⛳` },
    { label: 'Tournament Reminder', subject: `Don't Forget — High Country Classic This Weekend!`, body: `Just a reminder that the High Country Classic is coming up soon at Apple Mountain Golf Resort.\n\nLog in to the player portal to review your tee time, team, and any last-minute updates.\n\nCan't wait to see everyone on the course! 🏆` },
  ]

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) { setEmailError('Subject and message are required'); return }
    setEmailError(''); setEmailSending(true); setEmailResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/blast-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ subject: emailSubject, body: emailBody, recipientType: emailTo }),
      })
      const json = await res.json()
      if (!res.ok) { setEmailError(json.error || 'Send failed'); return }
      setEmailResult(json)
      if (json.failed === 0) { setEmailSubject(''); setEmailBody('') }
    } catch (e: any) { setEmailError(e.message || 'Unexpected error') }
    finally { setEmailSending(false) }
  }

  // ── SMS ──
  const [smsBody, setSmsBody] = useState('')
  const [smsTo, setSmsTo] = useState<'all' | 'registered'>('all')
  const [smsSending, setSmsSending] = useState(false)
  const [smsResult, setSmsResult] = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [smsError, setSmsError] = useState('')


  const SMS_TEMPLATES = [
    { label: 'Registration Open', body: `Registration is now open for the ${year} High Country Classic! Log in to confirm your spot and invite guests.` },
    { label: 'Pairings Released', body: `Your ${year} HCC pairings are ready! Log in to see your team and tee time.` },
    { label: 'Day-of Reminder', body: `Today's the day — High Country Classic at Apple Mountain! Check the portal for your tee time. See you out there! ⛳` },
  ]

  const handleSendSms = async () => {
    if (!smsBody.trim()) { setSmsError('Message is required'); return }
    setSmsError(''); setSmsSending(true); setSmsResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/blast-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ message: smsBody, recipientType: smsTo }),
      })
      const json = await res.json()
      if (!res.ok) { setSmsError(json.error || 'Send failed'); return }
      setSmsResult(json)
      if (json.failed === 0) setSmsBody('')
    } catch (e: any) { setSmsError(e.message || 'Unexpected error') }
    finally { setSmsSending(false) }
  }

  const tabBtn = (key: 'email' | 'sms', label: string) => (
    <button onClick={() => setMode(key)} style={{
      padding: '0.55rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
      background: mode === key ? 'var(--gold)' : 'var(--navy-light)',
      color: mode === key ? '#0d0f0a' : 'var(--text-muted)',
      border: `1px solid ${mode === key ? 'var(--gold)' : 'transparent'}`,
    }}>{label}</button>
  )

  const recipientToggle = (current: 'all' | 'registered', setter: (v: 'all' | 'registered') => void, allLabel: string, regLabel: string) => (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {([['all', allLabel], ['registered', regLabel]] as const).map(([v, lbl]) => (
        <button key={v} onClick={() => setter(v)} style={{
          padding: '0.45rem 1rem', borderRadius: '0.75rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          background: current === v ? 'rgba(201,168,76,0.15)' : 'var(--navy-light)',
          color: current === v ? 'var(--gold)' : 'var(--text-muted)',
          border: `1px solid ${current === v ? 'rgba(201,168,76,0.35)' : 'transparent'}`,
        }}>{lbl}</button>
      ))}
    </div>
  )

  const resultBanner = (r: { sent: number; failed: number; total: number }, noun: string) => (
    <div style={{ background: r.failed === 0 ? 'rgba(201,168,76,0.08)' : 'rgba(255,107,107,0.08)', border: `1px solid ${r.failed === 0 ? 'rgba(201,168,76,0.25)' : 'rgba(255,107,107,0.25)'}`, borderRadius: '0.875rem', padding: '0.875rem 1rem', marginBottom: '1rem' }}>
      <p style={{ fontWeight: 700, color: r.failed === 0 ? 'var(--gold)' : '#ff8f8f', marginBottom: r.failed > 0 ? '0.25rem' : 0 }}>
        {r.failed === 0 ? `✓ ${noun} sent to all ${r.sent} recipients!` : `${noun} sent to ${r.sent}/${r.total} — ${r.failed} failed`}
      </p>
      {r.failed > 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Failed recipients may have invalid or missing contact info.</p>}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Announce</h2>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem' }}>
          {tabBtn('email', '✉ Email Blast')}
          {tabBtn('sms', '💬 SMS Blast')}
        </div>

        {/* ── EMAIL ── */}
        {mode === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>Sends via Resend · tournament@noreply.highcountryclassic.com</p>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>SEND TO</label>
              {recipientToggle(emailTo, setEmailTo, `All Players (${players.length})`, `Registered Only (${registeredCount})`)}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>QUICK TEMPLATES</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {EMAIL_TEMPLATES.map(t => (
                  <button key={t.label} onClick={() => { setEmailSubject(t.subject); setEmailBody(t.body) }} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: 'var(--navy-light)', color: 'var(--text-muted)', border: '1px solid var(--navy-border)' }}>{t.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>SUBJECT</label>
              <input className="input" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="e.g. Tournament Update from the High Country Classic" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>MESSAGE</label>
              <textarea className="input" value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={7} placeholder={'Write your message here...\n\nBlank lines between paragraphs are preserved.'} style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
              <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Opens with "Hey [Name]," automatically.</p>
            </div>

            {emailError && <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: '0.875rem', padding: '0.75rem 1rem', color: '#ff8f8f', fontSize: '0.85rem' }}>{emailError}</div>}
            {emailResult && resultBanner(emailResult, 'Email')}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{emailCount} email{emailCount !== 1 ? 's' : ''} will be sent</p>
              <button onClick={handleSendEmail} disabled={emailSending || !emailSubject.trim() || !emailBody.trim()} className="btn-electric" style={{ opacity: emailSending || !emailSubject.trim() || !emailBody.trim() ? 0.6 : 1 }}>
                {emailSending ? `Sending to ${emailCount}...` : `Send to ${emailCount} Player${emailCount !== 1 ? 's' : ''} →`}
              </button>
            </div>
          </div>
        )}

        {/* ── SMS ── */}
        {mode === 'sms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>Sends via Twilio · only players with a phone number saved in their profile</p>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>SEND TO</label>
              {recipientToggle(smsTo, setSmsTo, `All with Phone (${players.length})`, `Registered + Phone (${registeredCount})`)}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>QUICK TEMPLATES</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {SMS_TEMPLATES.map(t => (
                  <button key={t.label} onClick={() => setSmsBody(t.body)} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: 'var(--navy-light)', color: 'var(--text-muted)', border: '1px solid var(--navy-border)' }}>{t.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>MESSAGE</label>
              <textarea className="input" value={smsBody} onChange={e => setSmsBody(e.target.value)} rows={4} placeholder="Write your text message here..." style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Opens with "Hey [Name]!" and closes with "— High Country Classic"</p>
                <p style={{ fontSize: '0.73rem', color: smsBody.length > 130 ? '#ff8f8f' : 'var(--text-muted)' }}>{smsBody.length}/160</p>
              </div>
            </div>

            {smsError && <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: '0.875rem', padding: '0.75rem 1rem', color: '#ff8f8f', fontSize: '0.85rem' }}>{smsError}</div>}
            {smsResult && resultBanner(smsResult, 'SMS')}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sends to players who've added a phone number</p>
              <button onClick={handleSendSms} disabled={smsSending || !smsBody.trim()} className="btn-electric" style={{ opacity: smsSending || !smsBody.trim() ? 0.6 : 1 }}>
                {smsSending ? 'Sending texts...' : `Send SMS →`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Closest to Pin Admin ────────────────────────────────────────────────────

const PAR3_HOLES = HOLES.filter(h => h.par === 3).map(h => h.number)

function PinAdmin() {
  const [entries, setEntries] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [form, setForm] = useState({ hole_number: '', distance_feet: '', distance_inches: '', for_player_id: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: pl } = await supabase.from('profiles').select('id, full_name, nickname').order('full_name')
    setPlayers(pl || [])
    if (!form.for_player_id) setForm(prev => ({ ...prev, for_player_id: session.user.id }))
    const { data } = await supabase.from('closest_to_pin').select('*, profiles(full_name, nickname)').eq('tournament_year', CURRENT_YEAR).order('hole_number').order('distance_feet').order('distance_inches')
    setEntries(data || [])
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/delete-pin-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const holeNum = parseInt(form.hole_number)
    const targetId = form.for_player_id
    await supabase.from('closest_to_pin').delete().eq('player_id', targetId).eq('tournament_year', CURRENT_YEAR).eq('hole_number', holeNum)
    const { error } = await supabase.from('closest_to_pin').insert({ player_id: targetId, tournament_year: CURRENT_YEAR, hole_number: holeNum, distance_feet: parseInt(form.distance_feet), distance_inches: parseInt(form.distance_inches) || 0 })
    setMessage(error ? 'Error: ' + error.message : 'Entry saved!')
    setTimeout(() => setMessage(''), 3000)
    setForm(prev => ({ ...prev, distance_feet: '', distance_inches: '' }))
    setSubmitting(false)
    load()
  }

  const byHole = PAR3_HOLES.map(n => ({ hole: n, rows: entries.filter(e => e.hole_number === n) })).filter(g => g.rows.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Submit form */}
      <div className="card">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Add / Correct Entry</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>HOLE (PAR 3)</label>
              <select className="input" value={form.hole_number} onChange={e => setForm(f => ({ ...f, hole_number: e.target.value }))} required style={{ width: '100%' }}>
                <option value="">Select hole</option>
                {PAR3_HOLES.map(n => <option key={n} value={n}>Hole {n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>PLAYER</label>
              <select className="input" value={form.for_player_id} onChange={e => setForm(f => ({ ...f, for_player_id: e.target.value }))} required style={{ width: '100%' }}>
                <option value="">Select player</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.nickname?.trim() || p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>FEET</label>
              <input className="input" type="number" min="0" max="300" value={form.distance_feet} onChange={e => setForm(f => ({ ...f, distance_feet: e.target.value }))} required placeholder="0" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>INCHES</label>
              <input className="input" type="number" min="0" max="11" value={form.distance_inches} onChange={e => setForm(f => ({ ...f, distance_inches: e.target.value }))} placeholder="0" style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button type="submit" disabled={submitting} className="btn-electric">{submitting ? 'Saving...' : 'Save Entry'}</button>
            {message && <span style={{ fontSize: '0.85rem', color: message.startsWith('Error') ? '#ff8f8f' : 'var(--gold)' }}>{message}</span>}
          </div>
        </form>
      </div>

      {/* Entries by hole */}
      {byHole.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No entries yet</p></div>
      ) : byHole.map(({ hole, rows }) => (
        <div key={hole} className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '0.875rem' }}>Hole {hole} — Par 3</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rows.map((entry: any, idx: number) => {
              const name = entry.profiles?.nickname?.trim() || entry.profiles?.full_name || 'Unknown'
              return (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: idx === 0 ? 'rgba(201,168,76,0.08)' : 'var(--navy-light)', border: `1px solid ${idx === 0 ? 'rgba(201,168,76,0.25)' : 'transparent'}`, borderRadius: '0.875rem', padding: '0.6rem 1rem' }}>
                  <span style={{ fontSize: '1rem', width: '1.5rem' }}>{idx === 0 ? '🏆' : `#${idx + 1}`}</span>
                  <span style={{ flex: 1, fontWeight: idx === 0 ? 700 : 400, color: idx === 0 ? 'var(--gold)' : 'var(--white)', fontSize: '0.9rem' }}>{name}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{entry.distance_feet}′ {entry.distance_inches}″</span>
                  <button onClick={() => handleDelete(entry.id)} style={{ background: 'none', border: '1px solid rgba(255,107,107,0.25)', borderRadius: '0.5rem', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.6rem' }}>🗑</button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Scorecard Admin ─────────────────────────────────────────────────────────

const FRONT_HOLES = HOLES.slice(0, 9)
const BACK_HOLES  = HOLES.slice(9)

const sc_th: React.CSSProperties = { padding: '0.4rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', color: '#8b7d6b', background: '#0d0f0a', border: '1px solid #3d3220', textAlign: 'left', whiteSpace: 'nowrap' }
const sc_td: React.CSSProperties = { padding: '0.4rem 0.5rem', fontSize: '0.78rem', border: '1px solid #3d3220', textAlign: 'center', whiteSpace: 'nowrap' }
const sc_label: React.CSSProperties = { ...sc_td, textAlign: 'left', fontWeight: 700, color: '#8b7d6b', background: '#0d0f0a', fontSize: '0.7rem', letterSpacing: '0.05em' }
const sc_total: React.CSSProperties = { ...sc_td, fontWeight: 700, color: '#c9a84c', background: 'rgba(201,168,76,0.06)', minWidth: '2.5rem' }

function scoreCellStyle(strokes: number, par: number): React.CSSProperties {
  if (!strokes) return { background: 'rgba(61,50,32,0.2)', color: '#8b7d6b' }
  if (strokes < par)  return { background: 'rgba(201,168,76,0.18)', color: '#c9a84c', fontWeight: 700 }
  if (strokes === par) return { background: 'rgba(240,230,204,0.06)', color: '#f0e6cc' }
  return { background: 'rgba(255,107,107,0.12)', color: '#ff8f8f' }
}

function ScorecardAdmin() {
  const [teams, setTeams] = useState<any[]>([])
  const [idx, setIdx] = useState(0)
  const [editing, setEditing] = useState<{ [hole: number]: string }>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState('')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)
    const { data: teamsData } = await supabase.from('teams').select('*, team_members(*, profiles(*))').eq('tournament_year', CURRENT_YEAR).order('name')
    const teamIds = teamsData?.map((t: any) => t.id) || []
    const { data: scoresData } = teamIds.length > 0 ? await supabase.from('scores').select('*').in('team_id', teamIds) : { data: [] as any[] }
    const enriched = (teamsData || []).map((t: any) => ({ ...t, scores: scoresData?.filter((s: any) => s.team_id === t.id) || [] }))
    setTeams(enriched)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!teams.length) return
    const team = teams[idx]
    const map: { [hole: number]: string } = {}
    team.scores.forEach((s: any) => { map[s.hole_number] = s.strokes.toString() })
    setEditing(map)
  }, [idx, teams])

  const handleSave = async () => {
    if (!teams.length) return
    const team = teams[idx]
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaving(false); return }
    for (const [hole, strokes] of Object.entries(editing)) {
      await fetch('/api/admin/upsert-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ team_id: team.id, hole_number: parseInt(hole), strokes: strokes || null, entered_by: userId }),
      })
    }
    setMessage('Scores saved!')
    setTimeout(() => setMessage(''), 3000)
    setSaving(false)
    load()
  }

  if (!teams.length) return <div className="card"><p style={{ color: 'var(--text-muted)' }}>No teams created yet — build teams in the Teams tab first.</p></div>

  const team = teams[idx]
  const members: any[] = team.team_members || []

  const getVal = (holeNum: number) => editing[holeNum] || ''
  const getStrokes = (holeNum: number) => parseInt(editing[holeNum]) || 0
  const frontTotal = FRONT_HOLES.reduce((s, h) => s + getStrokes(h.number), 0)
  const backTotal  = BACK_HOLES.reduce((s, h) => s + getStrokes(h.number), 0)
  const grandTotal = frontTotal + backTotal

  const renderHoles = (holes: typeof HOLES, subtotal: number, label: string) => (
    <div style={{ background: '#111a0f', border: '1px solid #3d3220', borderRadius: '1.25rem', overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '580px' }}>
        <tbody>
          <tr>
            <td style={sc_label}>HOLE</td>
            {holes.map(h => <td key={h.number} style={{ ...sc_td, background: '#0d0f0a', color: '#f0e6cc', fontWeight: 700 }}>{h.number}</td>)}
            <td style={sc_total}>{label}</td>
          </tr>
          <tr>
            <td style={{ ...sc_label, color: '#c9a84c' }}>PAR</td>
            {holes.map(h => <td key={h.number} style={{ ...sc_td, background: '#0d0f0a', color: '#c9a84c', fontWeight: 700 }}>{h.par}</td>)}
            <td style={sc_total}>{holes.reduce((s, h) => s + h.par, 0)}</td>
          </tr>
          <tr>
            <td style={{ ...sc_label, background: '#162012' }}>SCORE</td>
            {holes.map(h => {
              const val = getVal(h.number)
              const strokes = parseInt(val) || 0
              return (
                <td key={h.number} style={{ ...sc_td, background: '#162012', padding: '0.25rem' }}>
                  <input
                    type="number" min="1" max="20" inputMode="numeric"
                    value={val}
                    onChange={e => setEditing(prev => ({ ...prev, [h.number]: e.target.value }))}
                    style={{ width: '100%', minWidth: '2rem', textAlign: 'center', padding: '0.3rem 0.2rem', borderRadius: '0.4rem', border: `1px solid ${val ? 'rgba(201,168,76,0.3)' : '#3d3220'}`, fontSize: '0.85rem', fontWeight: 700, outline: 'none', MozAppearance: 'textfield', ...scoreCellStyle(strokes, h.par) }}
                    placeholder="—"
                  />
                </td>
              )
            })}
            <td style={{ ...sc_total, background: '#162012' }}>{subtotal || '—'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Team navigator */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} style={{ background: 'var(--navy-light)', border: '1px solid var(--navy-border)', borderRadius: '0.625rem', color: 'var(--text-muted)', cursor: idx === 0 ? 'default' : 'pointer', fontSize: '1.1rem', fontWeight: 700, padding: '0.4rem 0.875rem', opacity: idx === 0 ? 0.4 : 1 }}>←</button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--white)' }}>{team.name}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{idx + 1} of {teams.length}</p>
          </div>
          <button onClick={() => setIdx(i => Math.min(teams.length - 1, i + 1))} disabled={idx === teams.length - 1} style={{ background: 'var(--navy-light)', border: '1px solid var(--navy-border)', borderRadius: '0.625rem', color: 'var(--text-muted)', cursor: idx === teams.length - 1 ? 'default' : 'pointer', fontSize: '1.1rem', fontWeight: 700, padding: '0.4rem 0.875rem', opacity: idx === teams.length - 1 ? 0.4 : 1 }}>→</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {members.map((m: any) => m.profiles?.nickname?.trim() || m.profiles?.full_name || '?').join(' · ')}
          </div>
          {grandTotal > 0 && <span style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '999px', color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 700, padding: '0.2rem 0.75rem' }}>Total: {grandTotal}</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {message && <span style={{ fontSize: '0.85rem', color: 'var(--gold)' }}>{message}</span>}
            <button onClick={handleSave} disabled={saving} className="btn-electric">{saving ? 'Saving...' : 'Save Scores'}</button>
          </div>
        </div>
      </div>

      {renderHoles(FRONT_HOLES, frontTotal, 'OUT')}
      {renderHoles(BACK_HOLES, backTotal, 'IN')}
    </div>
  )
}
