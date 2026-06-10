'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { COURSE_NAME, COURSE_LOCATION, CURRENT_YEAR, PAR3_HOLES } from '@/lib/constants'

export default function PortalHome() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [hasSetAvailability, setHasSetAvailability] = useState(true)
  const [topDates, setTopDates] = useState<{ date: string, count: number }[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [myTeam, setMyTeam] = useState<any>(null)
  const [myScores, setMyScores] = useState<any[]>([])
  const [pinLeaders, setPinLeaders] = useState<any[]>([])
  const [recentPhotos, setRecentPhotos] = useState<any[]>([])
  const [totalPlayers, setTotalPlayers] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const uid = session.user.id

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).single()
      setProfile(prof)

      const { data: avail } = await supabase.from('availability_dates').select('id').eq('user_id', uid).limit(1)
      setHasSetAvailability(!!(avail && avail.length > 0))

      const { data: allDates } = await supabase.from('availability_dates').select('date')
      if (allDates) {
        const counts: { [date: string]: number } = {}
        allDates.forEach((d: any) => { counts[d.date] = (counts[d.date] || 0) + 1 })
        const sorted = Object.entries(counts).map(([date, count]) => ({ date, count })).sort((a, b) => b.count - a.count).slice(0, 3)
        setTopDates(sorted)
      }

      const { count } = await supabase.from('profiles').select('id', { count: 'exact' })
      setTotalPlayers(count || 0)

      const { data: teamsData } = await supabase.from('teams').select('*, team_members(*, profiles(*))').eq('tournament_year', CURRENT_YEAR)
      const { data: scoresData } = await supabase.from('scores').select('*')
      if (teamsData) {
        const enriched = teamsData.map((t: any) => ({
          ...t,
          members: t.team_members || [],
          scores: scoresData?.filter((s: any) => s.team_id === t.id) || [],
          total: scoresData?.filter((s: any) => s.team_id === t.id).reduce((sum: number, s: any) => sum + s.strokes, 0) || 0
        })).sort((a: any, b: any) => a.total - b.total)
        setTeams(enriched)

        const { data: member } = await supabase.from('team_members').select('team_id').eq('player_id', uid).single()
        if (member) {
          const found = enriched.find((t: any) => t.id === member.team_id)
          if (found) { setMyTeam(found); setMyScores(found.scores) }
        }
      }

      const { data: pinData } = await supabase.from('closest_to_pin')
        .select('*, profiles(full_name)').eq('tournament_year', CURRENT_YEAR)
        .order('distance_feet').order('distance_inches')
      if (pinData) {
        const seen = new Set()
        const leaders = pinData.filter((e: any) => {
          if (seen.has(e.hole_number)) return false
          seen.add(e.hole_number); return true
        }).slice(0, 3)
        setPinLeaders(leaders)
      }

      const { data: photos } = await supabase.from('media_posts')
        .select('cloudinary_url, media_type, hole_number')
        .eq('tournament_year', CURRENT_YEAR).eq('media_type', 'photo')
        .order('created_at', { ascending: false }).limit(4)
      setRecentPhotos(photos || [])
    })
  }, [])

  const myTotal = myScores.reduce((sum, s) => sum + s.strokes, 0)

  const cardHover = (el: HTMLDivElement, enter: boolean) => {
    el.style.borderColor = enter ? 'var(--gold-dim)' : 'var(--border)'
    el.style.transform = enter ? 'translateY(-2px)' : 'translateY(0)'
    el.style.boxShadow = enter ? '0 8px 30px rgba(201,168,76,0.1)' : 'none'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Date prompt banner */}
      {!hasSetAvailability && (
        <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '1.5rem', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.75rem' }}>📅</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem', color: 'var(--gold)' }}>First things first — pick your dates!</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Help us pick the best tournament date.</p>
            </div>
          </div>
          <Link href="/portal/availability" className="btn-electric" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', padding: '0.6rem 1.25rem' }}>Pick My Dates</Link>
        </div>
      )}

      {/* Hero */}
      <div style={{
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.65)), url("/course.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        border: '1px solid var(--border)',
        borderRadius: '2rem',
        padding: '3.5rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Gold border accent */}
        <div style={{ position: 'absolute', inset: '6px', borderRadius: '1.6rem', border: '1px solid rgba(201,168,76,0.2)', pointerEvents: 'none' }} />

        <img
          src="/logo.png"
          alt="High Country Classic"
          style={{ width: '280px', height: '280px', objectFit: 'contain', marginBottom: '1.5rem', filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.6))' }}
        />

        <p style={{ color: 'rgba(240,230,204,0.7)', fontSize: '0.9rem', marginBottom: '0.2rem', letterSpacing: '0.12em' }}>{COURSE_NAME.toUpperCase()}</p>
        <p style={{ color: 'rgba(240,230,204,0.5)', fontSize: '0.8rem', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>{COURSE_LOCATION.toUpperCase()}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span className="badge-gold" style={{ fontSize: '0.9rem', padding: '0.4rem 1.25rem', letterSpacing: '0.1em' }}>{CURRENT_YEAR} SEASON</span>
          {profile && (
            <span style={{ color: 'var(--cream-dim)', fontSize: '0.9rem', letterSpacing: '0.06em' }}>
              Welcome back, <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{profile.full_name?.split(' ')[0]}</span>
            </span>
          )}
        </div>
      </div>

      {/* Widget grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>

        {/* Date Poll */}
        <Link href="/portal/availability" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s', minHeight: '180px' }}
            onMouseEnter={e => cardHover(e.currentTarget as HTMLDivElement, true)}
            onMouseLeave={e => cardHover(e.currentTarget as HTMLDivElement, false)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--gold)' }}>Date Poll</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>TOP PICKS →</span>
            </div>
            {topDates.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No votes yet — be the first!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {topDates.map(({ date, count }) => (
                  <div key={date} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, flex: 1, color: 'var(--cream)' }}>
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <div style={{ width: '80px', height: '4px', background: 'var(--card-mid)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--gold)', borderRadius: '999px', width: (count / Math.max(totalPlayers, 1) * 100) + '%' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 700, width: '28px', textAlign: 'right' }}>{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* My Spots */}
        <Link href="/portal/reservations" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s', minHeight: '180px' }}
            onMouseEnter={e => cardHover(e.currentTarget as HTMLDivElement, true)}
            onMouseLeave={e => cardHover(e.currentTarget as HTMLDivElement, false)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--gold)' }}>My Spots</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>MANAGE →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Handicap</span>
                <span style={{ fontWeight: 700, color: 'var(--cream)' }}>{profile?.handicap ?? 'Not set'}</span>
              </div>
              {profile?.ghin_number && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>GHIN #</span>
                  <span style={{ fontWeight: 700, color: 'var(--cream)' }}>{profile.ghin_number}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status</span>
                <span className="badge-gold" style={{ fontSize: '0.75rem' }}>Registered</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Leaderboard */}
        <Link href="/portal/tournament" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s', minHeight: '180px' }}
            onMouseEnter={e => cardHover(e.currentTarget as HTMLDivElement, true)}
            onMouseLeave={e => cardHover(e.currentTarget as HTMLDivElement, false)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--gold)' }}>Leaderboard</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>FULL VIEW →</span>
            </div>
            {teams.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Teams not yet announced</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {teams.slice(0, 3).map((team, idx) => (
                  <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0.75rem', borderRadius: '0.75rem', background: idx === 0 ? 'rgba(201,168,76,0.08)' : 'var(--card-mid)', border: idx === 0 ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent' }}>
                    <span style={{ fontSize: '0.9rem', width: '20px', textAlign: 'center' }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                    <span style={{ fontSize: '0.85rem', flex: 1, fontWeight: 600, color: 'var(--cream)' }}>{team.name}</span>
                    <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, color: idx === 0 ? 'var(--gold)' : 'var(--cream-dim)', fontSize: '1rem' }}>{team.total || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* Scorecard */}
        <Link href="/portal/scorecard" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s', minHeight: '180px' }}
            onMouseEnter={e => cardHover(e.currentTarget as HTMLDivElement, true)}
            onMouseLeave={e => cardHover(e.currentTarget as HTMLDivElement, false)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--gold)' }}>Scorecard</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>ENTER SCORES →</span>
            </div>
            {!myTeam ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not on a team yet — check back soon!</p>
            ) : (
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>{myTeam.name}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '3rem', fontFamily: 'Georgia, serif', fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>{myTotal || '—'}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingBottom: '0.4rem' }}>{myScores.length}/18 holes</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '2px' }}>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map(h => {
                    const score = myScores.find(s => s.hole_number === h)
                    return (
                      <div key={h} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{h}</div>
                        <div style={{ height: '22px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, background: score ? 'var(--gold)' : 'var(--card-mid)', color: score ? '#0d0f0a' : 'var(--border)' }}>
                          {score?.strokes || '·'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </Link>

        {/* Closest to Pin */}
        <Link href="/portal/pin" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s', minHeight: '180px' }}
            onMouseEnter={e => cardHover(e.currentTarget as HTMLDivElement, true)}
            onMouseLeave={e => cardHover(e.currentTarget as HTMLDivElement, false)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--gold)' }}>Closest to Pin</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>ALL HOLES →</span>
            </div>
            {pinLeaders.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No shots submitted yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pinLeaders.map((entry) => {
                  const hole = PAR3_HOLES.find(h => h.number === entry.hole_number)
                  return (
                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0.75rem', borderRadius: '0.75rem', background: 'var(--card-mid)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '50px' }}>Hole {entry.hole_number}</span>
                      <span style={{ fontSize: '0.8rem', flex: 1, fontWeight: 600, color: 'var(--cream)' }}>{entry.profiles?.full_name?.split(' ')[0]}</span>
                      <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.9rem' }}>{entry.distance_feet}'{entry.distance_inches}"</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Link>

        {/* Gallery */}
        <Link href="/portal/gallery" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s', minHeight: '180px', padding: recentPhotos.length > 0 ? 0 : '1.5rem', overflow: 'hidden' }}
            onMouseEnter={e => cardHover(e.currentTarget as HTMLDivElement, true)}
            onMouseLeave={e => cardHover(e.currentTarget as HTMLDivElement, false)}>
            {recentPhotos.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--gold)' }}>Gallery</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>SHARE →</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>No photos yet — be the first!</p>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'grid', gridTemplateColumns: recentPhotos.length === 1 ? '1fr' : '1fr 1fr', gap: '2px' }}>
                  {recentPhotos.slice(0, 4).map((photo, idx) => (
                    <img key={idx} src={photo.cloudinary_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                  ))}
                </div>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '0.75rem 1rem', background: 'linear-gradient(rgba(0,0,0,0.7), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--gold)' }}>Gallery</h3>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(240,230,204,0.7)', letterSpacing: '0.05em' }}>VIEW ALL →</span>
                </div>
              </div>
            )}
          </div>
        </Link>

      </div>
    </div>
  )
}
