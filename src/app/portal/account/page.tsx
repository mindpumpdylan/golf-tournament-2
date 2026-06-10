'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR, PAR3_HOLES } from '@/lib/constants'
import { format } from 'date-fns'

export default function AccountPage() {
  const [profile, setProfile] = useState<any>(null)
  const [reservations, setReservations] = useState<any[]>([])
  const [scores, setScores] = useState<any[]>([])
  const [pinEntries, setPinEntries] = useState<any[]>([])
  const [availability, setAvailability] = useState<any[]>([])
  const [handicap, setHandicap] = useState('')
  const [ghin, setGhin] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<'profile' | 'reservations' | 'stats' | 'history'>('profile')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const uid = session.user.id

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(prof)
    setHandicap(prof?.handicap?.toString() || '')
    setGhin(prof?.ghin_number || '')

    const { data: res } = await supabase.from('reservations').select('*').eq('reserver_id', uid).order('created_at', { ascending: false })
    setReservations(res || [])

    const { data: member } = await supabase.from('team_members').select('team_id, teams(*)').eq('player_id', uid).single()
    if (member?.team_id) {
      const { data: sc } = await supabase.from('scores').select('*').eq('team_id', member.team_id)
      setScores(sc || [])
    }

    const { data: pin } = await supabase.from('closest_to_pin').select('*').eq('player_id', uid).order('created_at', { ascending: false })
    setPinEntries(pin || [])

    const { data: av } = await supabase.from('availability_dates').select('date').eq('user_id', uid).order('date')
    setAvailability(av || [])
  }

  useEffect(() => { load() }, [])

  const handleSaveProfile = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('profiles').update({
      handicap: parseFloat(handicap) || null,
      ghin_number: ghin || null,
    }).eq('id', session.user.id)
    setMessage('Profile updated!')
    setSaving(false)
    load()
  }

  const totalScore = scores.reduce((sum, s) => sum + s.strokes, 0)
  const bestHole = scores.length > 0 ? scores.reduce((best, s) => s.strokes < best.strokes ? s : best) : null
  const pinWins = pinEntries.length

  const statusStyle = (status: string) => {
    if (status === 'confirmed') return { background: 'rgba(0,255,135,0.1)', color: 'var(--electric)', border: '1px solid rgba(0,255,135,0.2)' }
    if (status === 'expired') return { background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.2)' }
    return { background: 'rgba(255,215,0,0.1)', color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.2)' }
  }

  const tabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'reservations', label: 'Reservations' },
    { key: 'stats', label: 'My Stats' },
    { key: 'history', label: 'History' },
  ]

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '999px', background: 'var(--electric)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 700, color: 'var(--navy)', flexShrink: 0 }}>
          {profile?.full_name?.charAt(0) || '?'}
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--white)', marginBottom: '0.2rem' }}>{profile?.full_name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{profile?.email}</p>
          {profile?.is_admin && <span className="badge-gold" style={{ marginTop: '0.4rem', display: 'inline-block' }}>Admin</span>}
        </div>
      </div>

      {/* Quick stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
        {[
          { label: 'Handicap', value: profile?.handicap ?? 'N/A', color: 'var(--electric)' },
          { label: 'Tournament Score', value: totalScore || '—', color: 'var(--gold)' },
          { label: 'Holes Played', value: scores.length + '/18', color: 'var(--electric)' },
          { label: 'Pin Submissions', value: pinWins, color: 'var(--gold)' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <p style={{ fontSize: '1.75rem', fontFamily: 'Georgia, serif', fontWeight: 700, color: stat.color, lineHeight: 1, marginBottom: '0.3rem' }}>{stat.value}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>{stat.label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
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
        <div style={{ background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '1rem', padding: '1rem', color: 'var(--electric)', fontSize: '0.9rem' }}>{message}</div>
      )}

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="card">
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>My Profile</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>FULL NAME</label>
                <div style={{ padding: '0.85rem 1rem', background: 'var(--navy-light)', borderRadius: '0.875rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>{profile?.full_name}</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>EMAIL</label>
                <div style={{ padding: '0.85rem 1rem', background: 'var(--navy-light)', borderRadius: '0.875rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>{profile?.email}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>HANDICAP INDEX</label>
                <input className="input" type="number" step="0.1" value={handicap} onChange={e => setHandicap(e.target.value)} placeholder="e.g. 12.4" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>GHIN NUMBER</label>
                <input className="input" value={ghin} onChange={e => setGhin(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <button onClick={handleSaveProfile} className="btn-electric" disabled={saving} style={{ alignSelf: 'flex-start' }}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          {availability.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--navy-border)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>MY AVAILABILITY SELECTIONS</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {availability.map((a: any) => (
                  <span key={a.date} className="badge-electric" style={{ fontSize: '0.8rem' }}>
                    {format(new Date(a.date + 'T12:00:00'), 'MMM d, yyyy')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reservations Tab */}
      {tab === 'reservations' && (
        <div className="card">
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>My Reservations</h2>
          {reservations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No reservations yet. Go to My Spots to invite guests!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reservations.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--navy-light)', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
                  <div>
                    <p style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{r.guest_name}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.guest_email}</p>
                    {r.invite_expires_at && r.status === 'pending' && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--gold)', marginTop: '0.2rem' }}>
                        Expires {format(new Date(r.invite_expires_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <span style={{ padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'capitalize', ...statusStyle(r.status) }}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>{CURRENT_YEAR} Scorecard</h2>
            {scores.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No scores entered yet</p>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px', marginBottom: '4px' }}>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map(h => {
                    const score = scores.find(s => s.hole_number === h)
                    return (
                      <div key={h} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{h}</div>
                        <div style={{ height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, background: score ? 'var(--electric)' : 'var(--navy-light)', color: score ? 'var(--navy)' : 'var(--navy-border)' }}>
                          {score?.strokes || '·'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px', marginBottom: '1rem' }}>
                  {Array.from({ length: 9 }, (_, i) => i + 10).map(h => {
                    const score = scores.find(s => s.hole_number === h)
                    return (
                      <div key={h} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{h}</div>
                        <div style={{ height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, background: score ? 'var(--electric)' : 'var(--navy-light)', color: score ? 'var(--navy)' : 'var(--navy-border)' }}>
                          {score?.strokes || '·'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--navy-border)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Score</span>
                  <span style={{ fontSize: '2.5rem', fontFamily: 'Georgia, serif', fontWeight: 700, color: 'var(--electric)' }}>{totalScore}</span>
                </div>
                {bestHole && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    Best hole: <span style={{ color: 'var(--electric)', fontWeight: 700 }}>Hole {bestHole.hole_number} ({bestHole.strokes} strokes)</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Closest to Pin Submissions</h2>
            {pinEntries.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No pin submissions yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pinEntries.map(entry => {
                  const hole = PAR3_HOLES.find(h => h.number === entry.hole_number)
                  return (
                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--navy-light)', borderRadius: '0.875rem', padding: '0.75rem 1rem' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Hole {entry.hole_number}{hole ? ' — ' + hole.name : ''}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.tournament_year}</p>
                      </div>
                      <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, color: 'var(--electric)', fontSize: '1.1rem' }}>
                        {entry.distance_feet}'{entry.distance_inches}"
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Tournament History</h2>
          <p style={{ color: 'var(--text-muted)' }}>Past tournament records will appear here after the first event. Check back after the {CURRENT_YEAR} High Country Classic!</p>
        </div>
      )}
    </div>
  )
}
