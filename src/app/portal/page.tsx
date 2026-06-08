'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { TOURNAMENT_NAME, COURSE_NAME, COURSE_LOCATION, CURRENT_YEAR } from '@/lib/constants'

const tiles = [
  { href: '/portal/availability', icon: '📅', label: 'Date Poll', desc: 'Vote on tournament dates' },
  { href: '/portal/reservations', icon: '🎟️', label: 'My Spots', desc: 'Reserve & invite guests' },
  { href: '/portal/tournament', icon: '🏆', label: 'Tournament', desc: 'Live teams & leaderboard' },
  { href: '/portal/scorecard', icon: '📋', label: 'Scorecard', desc: 'Enter scores hole by hole' },
  { href: '/portal/pin', icon: '📍', label: 'Closest to Pin', desc: 'Track par 3 shots' },
  { href: '/portal/gallery', icon: '📸', label: 'Gallery', desc: 'Photos & videos from the course' },
]

export default function PortalHome() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [hasSetAvailability, setHasSetAvailability] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)
      const { data: avail } = await supabase.from('availability_dates').select('id').eq('user_id', session.user.id).limit(1)
      setHasSetAvailability(!!(avail && avail.length > 0))
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Date prompt banner */}
      {!hasSetAvailability && (
        <div style={{ background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.25)', borderRadius: '1.5rem', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>📅</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>First things first — pick your dates!</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Tell us when you're available so we can pick the best tournament date.</p>
            </div>
          </div>
          <Link href="/portal/availability" className="btn-electric" style={{ whiteSpace: 'nowrap' }}>Pick My Dates →</Link>
        </div>
      )}

      {/* Hero */}
style={{ 
  backgroundImage: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url("/course.jpg")',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  border: '1px solid var(--navy-border)', 
  borderRadius: '2rem', 
  padding: '3rem 2rem', 
  textAlign: 'center', 
  position: 'relative', 
  overflow: 'hidden' 
}}        <div style={{ position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0,255,135,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⛳</div>
        <h1 style={{ fontSize: '3rem', color: 'var(--electric)', marginBottom: '0.5rem', lineHeight: 1.1 }}>{TOURNAMENT_NAME}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '0.25rem' }}>{COURSE_NAME}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{COURSE_LOCATION}</p>
        <div className="badge-electric" style={{ fontSize: '1rem', padding: '0.5rem 1.5rem' }}>{CURRENT_YEAR} Season</div>
        {profile && (
          <p style={{ marginTop: '1.5rem', color: 'var(--white)', fontSize: '1.1rem' }}>
            Welcome back, <span style={{ color: 'var(--electric)', fontWeight: 700 }}>{profile.full_name?.split(' ')[0]}</span> 👋
          </p>
        )}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {tiles.map(tile => (
          <Link key={tile.href} href={tile.href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '1rem' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,255,135,0.3)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--navy-border)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}>
              <div style={{ fontSize: '2rem', width: '3rem', height: '3rem', background: 'var(--navy-light)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{tile.icon}</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>{tile.label}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{tile.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
