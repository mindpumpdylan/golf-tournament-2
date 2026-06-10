'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { COURSE_NAME, COURSE_LOCATION, CURRENT_YEAR, PAR3_HOLES } from '@/lib/constants'

const CARD = { background: '#111a0f', border: '1px solid #3d3220', borderRadius: '1.5rem', padding: '1.5rem' }
const GOLD = '#c9a84c'
const CREAM = '#f0e6cc'
const MUTED = '#8b7d6b'
const CARD_MID = '#162012'

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
        setTopDates(Object.entries(counts).map(([date, count]) => ({ date, count })).sort((a, b) => b.count - a.count).slice(0, 3))
      }

      const { count } = await supabase.from('profiles').select('id', { count: 'exact' })
      setTotalPlayers(count || 0)

      const { data: teamsData } = await supabase.from('teams').select('*, team_members(*, profiles(*))').eq('tournament_year', CURRENT_YEAR)
      const { data: scoresData } = await supabase.from('scores').select('*')
      if (teamsData) {
        const enriched = teamsData.map((t: any) => ({
          ...t, members: t.team_members || [],
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

      const { data: pinData } = await supabase.from('closest_to_pin').select('*, profiles(full_name)').eq('tournament_year', CURRENT_YEAR).order('distance_feet').order('distance_inches')
      if (pinData) {
        const seen = new Set()
        setPinLeaders(pinData.filter((e: any) => { if (seen.has(e.hole_number)) return false; seen.add(e.hole_number); return true }).slice(0, 3))
      }

      const { data: photos } = await supabase.from('media_posts').select('cloudinary_url, media_type, hole_number').eq('tournament_year', CURRENT_YEAR).eq('media_type', 'photo').order('created_at', { ascending: false }).limit(4)
      setRecentPhotos(photos || [])
    })
  }, [])

  const myTotal = myScores.reduce((sum, s) => sum + s.strokes, 0)

  const widgetStyle: React.CSSProperties = { ...CARD, cursor: 'pointer', transition: 'all 0.2s', minHeight: '180px', display: 'flex', flexDirection: 'column' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {!hasSetAvailability && (
        <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '1.5rem', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.75rem' }}>📅</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem', color: GOLD }}>First things first — pick your dates!</p>
              <p style={{ color: MUTED, fontSize: '0.85rem' }}>Help us pick the best tournament date.</p>
            </div>
          </div>
          <Link href="/portal/availability" style={{ background: GOLD, color: '#0d0f0a', padding: '0.6rem 1.25rem', borderRadius: '0.875rem', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', boxShadow: '0 4px 0 #8b6f2e' }}>Pick My Dates</Link>
        </div>
      )}

      {/* Hero */}
      <div style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.65)), url("/course.jpg")', backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid #3d3220', borderRadius: '2rem', padding: '3.5rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: '6px', borderRadius: '1.6rem', border: '1px solid rgba(201,168,76,0.15)', pointerEvents: 'none' }} />
        <img src="/logo.png" alt="High Country Classic" style={{ width: '280px', height: '280px', objectFit: 'contain', marginBottom: '1.5rem', filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.6))' }} />
        <p style={{ color: 'rgba(240,230,204,0.65)', fontSize: '0.85rem', marginBottom: '0.2rem', letterSpacing: '0.12em' }}>{COURSE_NAME.toUpperCase()}</p>
        <p style={{ color: 'rgba(240,230,204,0.45)', fontSize: '0.8rem', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>{COURSE_LOCATION.toUpperCase()}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(201,168,76,0.12)', color: GOLD, border: '1px solid rgba(201,168,76,0.25)', borderRadius: '999px', padding: '0.4rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em' }}>{CURRENT_YEAR} SEASON</span>
          {profile && <span style={{ color: 'rgba(240,230,204,0.7)', fontSize: '0.9rem' }}>Welcome back, <span style={{ color: GOLD, fontWeight: 700 }}>{profile.full_name?.split(' ')[0]}</span></span>}
        </div>
      </div>

      {/* Widget Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>

        {/* Date Poll */}
        <Link href="/portal/availability" style={{ textDecoration: 'none' }}>
          <div style={widgetStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontFamily: 'JerseyM54, Georgia, serif', fontSize: '1rem', color: GOLD }}>Date Poll</span>
              <span style={{ fontSize: '0.72rem', color: MUTED, letterSpacing: '0.06em' }}>TOP PICKS →</span>
            </div>
            {topDates.length === 0 ? <p style={{ color: MUTED, fontSize: '0.85rem' }}>No votes yet — be the first!</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {topDates.map(({ date, count }) => (
                  <div key={date} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, flex: 1, color: CREAM }}>{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <div style={{ width: '80px', height: '4px', background: CARD_MID, borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: GOLD, borderRadius: '999px', width: (count / Math.max(totalPlayers, 1) * 100) + '%' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: GOLD, fontWeight: 700, width: '28px', textAlign: 'right' }}>{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* My Spots */}
        <Link href="/portal/reservations" style={{ textDecoration: 'none' }}>
          <div style={widgetStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontFamily: 'JerseyM54, Georgia, serif', fontSize: '1rem', color: GOLD }}>My Spots</span>
              <span style={{ fontSize: '0.72rem', color: MUTED, letterSpacing: '0.06em' }}>MANAGE →</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: MUTED }}>Handicap</span>
                <span style={{ fontWeight: 700, color: CREAM }}>{profile?.handicap ?? 'Not set'}</span>
              </div>
              {profile?.ghin_number && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: MUTED }}>GHIN #</span>
                  <span style={{ fontWeight: 700, color: CREAM }}>{profile.ghin_number}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: MUTED }}>Status</span>
                <span style={{ background: 'rgba(201,168,76,0.12)', color: GOLD, border: '1px solid rgba(201,168,76,0.25)', borderRadius: '999px', padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}>Registered</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Leaderboard */}
        <Link href="/portal/tournament" style={{ textDecoration: 'none' }}>
          <div style={widgetStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontFamily: 'JerseyM54, Georgia, serif', fontSize: '1rem', color: GOLD }}>Leaderboard</span>
              <span style={{ fontSize: '0.72rem', color: MUTED, letterSpacing: '0.06em' }}>FULL VIEW →</span>
            </div>
            {teams.length === 0 ? <p style={{ color: MUTED, fontSize: '0.85rem' }}>Teams not yet announced</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {teams.slice(0, 3).map((team, idx) => (
                  <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0.75rem', borderRadius: '0.75rem', background: idx === 0 ? 'rgba(201,168,76,0.08)' : CARD_MID, border: idx === 0 ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent' }}>
                    <span style={{ fontSize: '0.9rem', width: '20px' }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                    <span style={{ fontSize: '0.85rem', flex: 1, fontWeight: 600, color: CREAM }}>{team.name}</span>
                    <span style={{ fontWeight: 700, color: idx === 0 ? GOLD : MUTED, fontSize: '1rem' }}>{team.total || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* Scorecard */}
        <Link href="/portal/scorecard" style={{ textDecoration: 'none' }}>
          <div style={widgetStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontFamily: 'JerseyM54, Georgia, serif', fontSize: '1rem', color: GOLD }}>Scorecard</span>
              <span style={{ fontSize: '0.72rem', color: MUTED, letterSpacing: '0.06em' }}>ENTER SCORES →</span>
            </div>
            {!myTeam ? <p style={{ color: MUTED, fontSize: '0.85rem' }}>Not on a team yet — check back soon!</p> : (
              <div>
                <p style={{ fontSize: '0.8rem', color: MUTED, marginBottom: '0.5rem' }}>{myTeam.name}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '3rem', fontFamily: 'Georgia, serif', fontWeight: 700, color: GOLD, lineHeight: 1 }}>{myTotal || '—'}</span>
                  <span style={{ fontSize: '0.8rem', color: MUTED, paddingBottom: '0.4rem' }}>{myScores.length}/18</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '2px' }}>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map(h => {
                    const score = myScores.find(s => s.hole_number === h)
                    return (
                      <div key={h} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: MUTED }}>{h}</div>
                        <div style={{ height: '22px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, background: score ? GOLD : CARD_MID, color: score ? '#0d0f0a' : '#3d3220' }}>{score?.strokes || '·'}</div>
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
          <div style={widgetStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontFamily: 'JerseyM54, Georgia, serif', fontSize: '1rem', color: GOLD }}>Closest to Pin</span>
              <span style={{ fontSize: '0.72rem', color: MUTED, letterSpacing: '0.06em' }}>ALL HOLES →</span>
            </div>
            {pinLeaders.length === 0 ? <p style={{ color: MUTED, fontSize: '0.85rem' }}>No shots submitted yet</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pinLeaders.map(entry => (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0.75rem', borderRadius: '0.75rem', background: CARD_MID }}>
                    <span style={{ fontSize: '0.75rem', color: MUTED, width: '50px' }}>Hole {entry.hole_number}</span>
                    <span style={{ fontSize: '0.8rem', flex: 1, fontWeight: 600, color: CREAM }}>{entry.profiles?.full_name?.split(' ')[0]}</span>
                    <span style={{ fontWeight: 700, color: GOLD, fontSize: '0.9rem' }}>{entry.distance_feet}'{entry.distance_inches}"</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* Gallery */}
        <Link href="/portal/gallery" style={{ textDecoration: 'none' }}>
          <div style={{ ...CARD, cursor: 'pointer', transition: 'all 0.2s', minHeight: '180px', padding: recentPhotos.length > 0 ? 0 : '1.5rem', overflow: 'hidden' }}>
            {recentPhotos.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontFamily: 'JerseyM54, Georgia, serif', fontSize: '1rem', color: GOLD }}>Gallery</span>
                  <span style={{ fontSize: '0.72rem', color: MUTED, letterSpacing: '0.06em' }}>SHARE →</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: MUTED, fontSize: '0.85rem', textAlign: 'center' }}>No photos yet — be the first!</p>
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
                  <span style={{ fontFamily: 'JerseyM54, Georgia, serif', fontSize: '1rem', color: GOLD }}>Gallery</span>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(240,230,204,0.7)', letterSpacing: '0.06em' }}>VIEW ALL →</span>
                </div>
              </div>
            )}
          </div>
        </Link>

      </div>
    </div>
  )
}
