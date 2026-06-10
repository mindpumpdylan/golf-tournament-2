'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR } from '@/lib/constants'
import { format } from 'date-fns'

export default function AdminPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<any[]>([])
  const [availability, setAvailability] = useState<{ date: string, count: number, names: string[] }[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [teamName, setTeamName] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<'availability' | 'players' | 'teams' | 'reservations'>('availability')

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

    const { data: av } = await supabase.from('availability_dates').select('date, profiles(full_name)')
    if (av) {
      const counts: { [date: string]: { count: number, names: string[] } } = {}
      av.forEach((a: any) => {
        if (!counts[a.date]) counts[a.date] = { count: 0, names: [] }
        counts[a.date].count++
        if (a.profiles?.full_name) counts[a.date].names.push(a.profiles.full_name)
      })
      setAvailability(
        Object.entries(counts)
          .map(([date, { count, names }]) => ({ date, count, names }))
          .sort((a, b) => b.count - a.count)
      )
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
      setMessage('Team "' + teamName + '" created!')
      loadAll()
    }
  }

  const handleDeleteTeam = async (id: string) => {
    await supabase.from('team_members').delete().eq('team_id', id)
    await supabase.from('teams').delete().eq('id', id)
    loadAll()
  }

  const tabs = [
    { key: 'availability', label: 'Date Poll' },
    { key: 'players', label: 'Players' },
    { key: 'teams', label: 'Teams' },
    { key: 'reservations', label: 'Reservations' },
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
            background: tab === t.key ? 'var(--electric)' : 'var(--navy-card)',
            color: tab === t.key ? 'var(--navy)' : 'var(--text-muted)',
            border: '1px solid ' + (tab === t.key ? 'var(--electric)' : 'var(--navy-border)'),
          }}>{t.label}</button>
        ))}
      </div>

      {message && (
        <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '1rem', padding: '1rem', color: 'var(--gold)', fontSize: '0.9rem' }}>
          {message}
        </div>
      )}

      {tab === 'availability' && (
        <div className="card">
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Date Poll Results</h2>
          {availability.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No responses yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {availability.map(({ date, count, names }) => (
                <div key={date} style={{ background: 'var(--navy-light)', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, flex: 1 }}>
                      {format(new Date(date + 'T12:00:00'), 'EEE, MMM d yyyy')}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--electric)' }}>{count}/{players.length}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--navy-border)', borderRadius: '999px', marginBottom: '0.75rem' }}>
                    <div style={{ height: '100%', borderRadius: '999px', background: 'var(--electric)', width: (count / Math.max(players.length, 1) * 100) + '%', transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {(names || []).map((name: string) => (
                      <span key={name} style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem', background: 'rgba(0,255,135,0.1)', color: 'var(--electric)', border: '1px solid rgba(0,255,135,0.2)' }}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'players' && (
        <div className="card">
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Registered Players ({players.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {players.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--navy-light)', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
                <div>
                  <p style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{p.full_name}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {p.email} · HCP: {p.handicap ?? 'N/A'} {p.ghin_number ? '· GHIN: ' + p.ghin_number : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

      {tab === 'teams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Create Team</h2>
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
                      background: selectedPlayers.includes(p.id) ? 'rgba(0,255,135,0.1)' : 'var(--navy-light)',
                      border: '1px solid ' + (selectedPlayers.includes(p.id) ? 'rgba(0,255,135,0.3)' : 'transparent'),
                      transition: 'all 0.15s'
                    }}>
                      <input type="checkbox" checked={selectedPlayers.includes(p.id)}
                        onChange={e => setSelectedPlayers(prev => e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id))}
                        style={{ accentColor: 'var(--electric)' }} />
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

          {teams.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Current Teams</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {teams.map(team => (
                  <div key={team.id} style={{ background: 'var(--navy-light)', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--electric)' }}>{team.name}</span>
                      <button onClick={() => handleDeleteTeam(team.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>Delete</button>
                    </div>
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

      {tab === 'reservations' && <ReservationsAdmin />}
    </div>
  )
}

function ReservationsAdmin() {
  const [reservations, setReservations] = useState<any[]>([])

  useEffect(() => {
    supabase.from('reservations')
      .select('*, reserver:profiles!reserver_id(full_name, email)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setReservations(data || []))
  }, [])

  const handleExpire = async (id: string) => {
    await supabase.from('reservations').update({ status: 'expired' }).eq('id', id)
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'expired' } : r))
  }

  const handleConfirm = async (id: string) => {
    await supabase.from('reservations').update({ status: 'confirmed' }).eq('id', id)
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'confirmed' } : r))
  }

  const statusStyle = (status: string) => {
    if (status === 'confirmed') return { background: 'rgba(0,255,135,0.1)', color: 'var(--electric)', border: '1px solid rgba(0,255,135,0.2)' }
    if (status === 'expired') return { background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.2)' }
    return { background: 'rgba(255,215,0,0.1)', color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.2)' }
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>All Reservations ({reservations.length})</h2>
      {reservations.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No reservations yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {reservations.map(r => (
            <div key={r.id} style={{ background: 'var(--navy-light)', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <p style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{r.guest_name}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{r.guest_email}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Invited by: <span style={{ color: 'var(--white)' }}>{r.reserver?.full_name || 'Unknown'}</span>
                  </p>
                  {r.invite_expires_at && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--gold)', marginTop: '0.2rem' }}>
                      Expires: {new Date(r.invite_expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'capitalize', ...statusStyle(r.status) }}>
                    {r.status}
                  </span>
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => handleConfirm(r.id)} className="btn-electric" style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}>
                        Confirm
                      </button>
                      <button onClick={() => handleExpire(r.id)} style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem', background: 'none', border: '1px solid #ff6b6b', color: '#ff6b6b', borderRadius: '0.75rem', cursor: 'pointer' }}>
                        Expire
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
