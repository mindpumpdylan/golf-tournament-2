'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Profile } from '@/lib/types'

const CURRENT_YEAR = new Date().getFullYear()

export default function PortalHome() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [hasSetAvailability, setHasSetAvailability] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)
      const { data: avail } = await supabase.from('availability_dates')
        .select('id').eq('user_id', session.user.id).limit(1)
      setHasSetAvailability(!!(avail && avail.length > 0))
    })
  }, [])

  return (
    <div className="space-y-6">
      {!hasSetAvailability && (
        <div className="rounded-2xl p-6 border-2" style={{background:'#fff8e7', borderColor:'var(--gold)'}}>
          <div className="flex items-start gap-4">
            <span className="text-3xl">📅</span>
            <div>
              <h2 className="text-xl font-display font-bold mb-1" style={{color:'var(--green-deep)'}}>
                First things first — what dates work for you?
              </h2>
              <p className="text-sm mb-4" style={{color:'var(--text-mid)'}}>
                Help us pick a tournament date that works for everyone. Takes 30 seconds.
              </p>
              <Link href="/portal/availability" className="btn-gold inline-block">Pick My Dates →</Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: '/portal/availability', icon: '📅', title: 'Date Availability', desc: 'Select which dates work for the tournament' },
          { href: '/portal/reservations', icon: '🎟️', title: 'My Reservations', desc: 'Reserve your spot and invite guests' },
          { href: '/portal/tournament', icon: '🏆', title: 'Tournament', desc: 'View teams and live standings' },
          { href: '/portal/scorecard', icon: '📋', title: 'Scorecard', desc: 'Enter and track scores hole by hole' },
          { href: '/portal/pin', icon: '📍', title: 'Closest to Pin', desc: 'Submit and track par 3 results' },
          { href: '/portal/gallery', icon: '📸', title: 'Gallery', desc: 'Share photos and videos from the course' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="card hover:shadow-md transition-all hover:-translate-y-1 block"
          >
            <div className="text-3xl mb-3">{item.icon}</div>
            <h3 className="font-display font-bold text-lg mb-1" style={{color:'var(--green-deep)'}}>{item.title}</h3>
            <p className="text-sm" style={{color:'var(--text-mid)'}}>{item.desc}</p>
          </Link>
        ))}
      </div>

      <div className="card text-center py-10" style={{background:'var(--green-deep)'}}>
        <div className="text-5xl mb-3">⛳</div>
        <h2 className="text-3xl font-display text-white mb-2">{CURRENT_YEAR} Tournament</h2>
        <p style={{color:'var(--green-light)'}}>Welcome back, {profile?.full_name?.split(' ')[0] || 'Player'}</p>
      </div>
    </div>
  )
}