'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { COURSE_NAME, COURSE_LOCATION, CURRENT_YEAR } from '@/lib/constants'
import { displayName } from '@/lib/utils'

const CARD: React.CSSProperties = { background: '#111a0f', border: '1px solid #3d3220', borderRadius: '1.5rem', padding: '1.5rem' }
const GOLD = '#c9a84c'
const CREAM = '#f0e6cc'
const MUTED = '#8b7d6b'
const CARD_MID = '#162012'

function SkeletonWidget() {
  return (
    <div style={{ ...CARD, minHeight: '180px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ height: '16px', width: '40%', borderRadius: '8px', background: '#1e2a1c', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '12px', width: '70%', borderRadius: '8px', background: '#1e2a1c', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '12px', width: '55%', borderRadius: '8px', background: '#1e2a1c', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
    </div>
  )
}

export default function PortalHome() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasSetAvailability, setHasSetAvailability] = useState(true)
  const [topDates, setTopDates] = useState<{ date: string, count: number }[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [myTeam, setMyTeam] = useState<any>(null)
  const [myScores, setMyScores] = useState<any[]>([])
  const [pinLeaders, setPinLeaders] = useState<any[]>([])
  const [recentPhotos, setRecentPhotos] = useState<any[]>([])
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [myGuestCount, setMyGuestCount] = useState(0)
  const [isRegistered, setIsRegistered] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [tournamentStatus, setTournamentStatus] = useState('')
  const [tournamentDate, setTournamentDate] = useState('')
  const [videoMuted, setVideoMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setVideoMuted(videoRef.current.muted)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const uid = session.user.id

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).single()
      setProfile(prof)

      const { data: avail } = await supabase.from('availability_dates').select('id').eq('user_id', uid).eq('tournament_year', CURRENT_YEAR).limit(1)
      setHasSetAvailability(!!(avail && avail.length > 0))

      try {
        const avRes = await fetch('/api/availability-summary', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        if (avRes.ok) {
          const { counts } = await avRes.json()
          setTopDates(
            Object.entries(counts as Record<string, number>)
              .map(([date, count]) => ({ date, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 3)
          )
        }
      } catch {}

      const { count: playerCount } = await supabase.from('profiles').select('id', { count: 'exact' })
      setTotalPlayers(playerCount || 0)

      const { count: guestCount } = await supabase.from('reservations').select('id', { count: 'exact' }).eq('reserver_id', uid).in('status', ['pending', 'confirmed'])
      setMyGuestCount(guestCount || 0)

      const { data: teamsData } = await supabase.from('teams').select('*, team_members(*, profiles(*))').eq('tournament_year', CURRENT_YEAR)
      const teamIds = teamsData?.map((t: any) => t.id) || []
      const { data: scoresData } = teamIds.length > 0
        ? await supabase.from('scores').select('*').in('team_id', teamIds)
        : { data: [] as any[] }
      if (teamsData) {
        const enriched = teamsData.map((t: any) => ({
          ...t, members: t.team_members || [],
          scores: scoresData?.filter((s: any) => s.team_id === t.id) || [],
          total: scoresData?.filter((s: any) => s.team_id === t.id).reduce((sum: number, s: any) => sum + s.strokes, 0) || 0
        })).sort((a: any, b: any) => a.total - b.total)
        setTeams(enriched)
        const { data: member } = await supabase.from('team_members').select('team_id').eq('player_id', uid).maybeSingle()
        if (member) {
          const found = enriched.find((t: any) => t.id === member.team_id)
          if (found) { setMyTeam(found); setMyScores(found.scores) }
        }
      }

      const { data: pinData } = await supabase.from('closest_to_pin').select('*, profiles(full_name, nickname)').eq('tournament_year', CURRENT_YEAR).order('distance_feet').order('distance_inches')
      if (pinData) {
        const seen = new Set()
        setPinLeaders(pinData.filter((e: any) => { if (seen.has(e.hole_number)) return false; seen.add(e.hole_number); return true }).slice(0, 3))
      }

      const { data: photos } = await supabase.from('media_posts').select('cloudinary_url, media_type, hole_number').eq('tournament_year', CURRENT_YEAR).eq('media_type', 'photo').order('created_at', { ascending: false }).limit(4)
      setRecentPhotos(photos || [])

      const { data: reg } = await supabase.from('tournament_registrations').select('id').eq('player_id', uid).eq('tournament_year', CURRENT_YEAR).maybeSingle()
      setIsRegistered(!!reg)

      try {
        const { data: settingsRows } = await supabase.from('tournament_settings').select('key, value').in('key', ['status', 'date'])
        settingsRows?.forEach((r: any) => {
          if (r.key === 'status') setTournamentStatus(r.value)
          if (r.key === 'date') setTournamentDate(r.value)
        })
      } catch {}

      setLoading(false)
    })
  }, [])

  const handleRegister = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setRegistering(true)
    await supabase.from('tournament_registrations').insert({ player_id: session.user.id, tournament_year: CURRENT_YEAR })
    setIsRegistered(true)
    setRegistering(false)
    if (profile) {
      fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email, name: displayName(profile) }),
      }).catch(() => {})
    }
  }

  const myTotal = myScores.reduce((sum, s) => sum + s.strokes, 0)
  const widgetStyle: React.CSSProperties = { ...CARD, cursor: 'pointer', transition: 'all 0.2s', minHeight: '180px', display: 'flex', flexDirection: 'column' }

  const STATUS_BANNERS: Record<string, { text: string; color: string; border: string; bg: string }> = {
    'registration-open':  { text: `✅ Registration Open — Confirm your spot in the ${CURRENT_YEAR} High Country Classic!`, color: GOLD, border: 'rgba(201,168,76,0.3)', bg: 'rgba(201,168,76,0.07)' },
    'pairings-released':  { text: '🏌️ Pairings Released — Check the Tournament page for your team and tee time!', color: GOLD, border: 'rgba(201,168,76,0.3)', bg: 'rgba(201,168,76,0.07)' },
    'tournament-day':     { text: '⛳ It\'s Tournament Day — Good luck out there! Enter scores in real time.', color: '#e8c97a', border: 'rgba(201,168,76,0.45)', bg: 'rgba(201,168,76,0.12)' },
    'scoring-complete':   { text: '✓ Scoring Complete — Results are being finalized. Check the leaderboard!', color: CREAM, border: 'rgba(240,230,204,0.2)', bg: 'rgba(240,230,204,0.05)' },
    'results-final':      { text: '🏆 Results Final — Congratulations to all competitors! Official results are posted.', color: GOLD, border: 'rgba(201,168,76,0.35)', bg: 'rgba(201,168,76,0.09)' },
  }
  const statusBanner = STATUS_BANNERS[tournamentStatus]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {statusBanner && !loading && (
        <div style={{ background: statusBanner.bg, border: `1px solid ${statusBanner.border}`, borderRadius: '1.25rem', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <p style={{ fontWeight: 600, fontSize: '0.9rem', color: statusBanner.color }}>{statusBanner.text}</p>
        </div>
      )}

      {!isRegistered && !loading && (
        <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '1.5rem', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🏌️</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem', color: GOLD }}>You're not registered for {CURRENT_YEAR} yet!</p>
              <p style={{ color: MUTED, fontSize: '0.85rem' }}>Confirm your spot in the High Country Classic.</p>
            </div>
          </div>
          <button onClick={handleRegister} disabled={registering} className="btn-electric" style={{ whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
            {registering ? 'Registering...' : `Register for ${CURRENT_YEAR}`}
          </button>
        </div>
      )}

      {!hasSetAvailability && !loading && (
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

      {isRegistered && !loading && (() => {
        const missing = [!profile?.handicap && 'Handicap', !profile?.avatar_url && 'Profile Photo', !profile?.phone_number && 'Phone'].filter(Boolean) as string[]
        if (!missing.length) return null
        return (
          <div style={{ background: 'rgba(139,127,107,0.07)', border: '1px solid rgba(139,127,107,0.18)', borderRadius: '1rem', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '0.85rem', color: MUTED }}>Profile incomplete: <strong style={{ color: CREAM }}>{missing.join(', ')}</strong> missing</p>
            <a href="/portal/account" style={{ fontSize: '0.82rem', fontWeight: 700, color: GOLD, textDecoration: 'none', whiteSpace: 'nowrap' }}>Complete Profile →</a>
          </div>
        )
      })()}

      {/* Hero */}
      <div style={{ border: '1px solid #3d3220', borderRadius: '2rem', padding: '3.5rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* Video background */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
          src="/hero.mp4"
        />
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(0,0,0,0.52), rgba(0,0,0,0.68))', zIndex: 1 }} />
        {/* Inner border accent */}
        <div style={{ position: 'absolute', inset: '6px', borderRadius: '1.6rem', border: '1px solid rgba(201,168,76,0.15)', pointerEvents: 'none', zIndex: 2 }} />
        {/* Mute toggle */}
        <button
          onClick={toggleMute}
          style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 3, background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '999px', padding: '0.35rem 0.75rem', color: 'rgba(240,230,204,0.7)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em', backdropFilter: 'blur(4px)' }}
        >
          {videoMuted ? '🔇 Unmute' : '🔊 Mute'}
        </button>
        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/logo.png" alt="High Country Classic" style={{ width: '280px', height: '280px', objectFit: 'contain', marginBottom: '1.5rem', filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.6))' }} />
          <p style={{ color: 'rgba(240,230,204,0.65)', fontSize: '0.85rem', marginBottom: '0.2rem', letterSpacing: '0.12em' }}>{COURSE_NAME.toUpperCase()}</p>
          <p style={{ color: 'rgba(240,230,204,0.45)', fontSize: '0.8rem', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>{COURSE_LOCATION.toUpperCase()}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(201,168,76,0.12)', color: GOLD, border: '1px solid rgba(201,168,76,0.25)', borderRadius: '999px', padding: '0.4rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em' }}>{CURRENT_YEAR} SEASON</span>
            {loading ? (
              <span style={{ color: 'rgba(240,230,204,0.45)', fontSize: '0.9rem' }}>Welcome back!</span>
            ) : profile ? (
              <span style={{ color: 'rgba(240,230,204,0.7)', fontSize: '0.9rem' }}>Welcome back, <span style={{ color: GOLD, fontWeight: 700 }}>{displayName(profile)}</span></span>
            ) : null}
          </div>
          {tournamentDate && (() => {
            const days = Math.ceil((new Date(tournamentDate + 'T12:00:00').getTime() - Date.now()) / 86400000)
            if (days === 0) return <div style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '999px', padding: '0.4rem 1.1rem', fontSize: '0.9rem', fontWeight: 700, color: GOLD }}>🏌️ It&apos;s Tournament Day!</div>
            if (days > 0) return <div style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '999px', padding: '0.4rem 1.1rem', fontSize: '0.9rem', fontWeight: 700, color: GOLD }}>⛳ {days} day{days !== 1 ? 's' : ''} to tournament</div>
            return null
          })()}
        </div>
      </div>

      {/* Widget Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>

        {loading ? (
          <>
            <SkeletonWidget />
            <SkeletonWidget />
            <SkeletonWidget />
            <SkeletonWidget />
            <SkeletonWidget />
            <SkeletonWidget />
          </>
        ) : (
          <>
            {/* Date Poll */}
            <Link href="/portal/availability" style={{ textDecoration: 'none' }}>
              <div style={widgetStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontFamily: 'JerseyM54, Georgia, serif', fontSize: '1rem', color: GOLD }}>Date Poll</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {hasSetAvailability && (
                      <span style={{ background: 'rgba(201,168,76,0.1)', color: GOLD, border: '1px solid rgba(201,168,76,0.2)', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.68rem', fontWeight: 700 }}>✓ VOTED</span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: MUTED, letterSpacing: '0.06em' }}>TOP PICKS →</span>
                  </div>
                </div>
                {topDates.length === 0 ? (
                  <p style={{ color: MUTED, fontSize: '0.85rem' }}>No votes yet — be the first!</p>
                ) : (
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
                {!hasSetAvailability && (
                  <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: GOLD, fontWeight: 700 }}>→ Vote now</span>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', color: MUTED }}>Team</span>
                    <span style={{ fontWeight: 700, color: myTeam ? GOLD : CREAM }}>{myTeam?.name || 'TBD'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: MUTED }}>Guests invited</span>
                    <span style={{ fontWeight: 700, color: CREAM }}>{myGuestCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', color: MUTED }}>Status</span>
                    <span style={{ background: 'rgba(201,168,76,0.12)', color: GOLD, border: '1px solid rgba(201,168,76,0.25)', borderRadius: '999px', padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 700 }}>Registered</span>
                  </div>
                  {myTeam?.tee_time && (
                    <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '0.75rem', padding: '0.6rem 1rem', marginTop: '0.5rem' }}>
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: MUTED, letterSpacing: '0.08em', marginBottom: '0.2rem' }}>TEE TIME</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: GOLD }}>{myTeam.tee_time}</p>
                    </div>
                  )}
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
                    {/* Front 9 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '2px', marginBottom: '2px' }}>
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
                    {/* Back 9 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '2px' }}>
                      {Array.from({ length: 9 }, (_, i) => i + 10).map(h => {
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
                        <span style={{ fontSize: '0.8rem', flex: 1, fontWeight: 600, color: CREAM }}>{displayName(entry.profiles)}</span>
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
          </>
        )}
      </div>
    </div>
  )
}
