'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { TOURNAMENT_NAME } from '@/lib/constants'

const navItems = [
  { href: '/portal', label: 'Home', icon: '🏠' },
  { href: '/portal/availability', label: 'Date Poll', icon: '📅' },
  { href: '/portal/reservations', label: 'My Spots', icon: '🎟️' },
  { href: '/portal/tournament', label: 'Tournament', icon: '🏆' },
  { href: '/portal/scorecard', label: 'Scorecard', icon: '📋' },
  { href: '/portal/pin', label: 'Closest to Pin', icon: '📍' },
  { href: '/portal/gallery', label: 'Gallery', icon: '📸' },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(data)
    })
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)' }}>
      {/* Nav */}
      <nav style={{ background: 'var(--navy-card)', borderBottom: '1px solid var(--navy-border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <Link href="/portal" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem' }}>⛳</span>
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--electric)', letterSpacing: '-0.02em' }}>
              {TOURNAMENT_NAME}
            </span>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="hidden md:flex">
            {navItems.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} style={{
                  padding: '0.5rem 0.75rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600,
                  textDecoration: 'none', transition: 'all 0.15s',
                  background: active ? 'rgba(0,255,135,0.1)' : 'transparent',
                  color: active ? 'var(--electric)' : 'var(--text-muted)',
                  border: active ? '1px solid rgba(0,255,135,0.2)' : '1px solid transparent',
                }}>
                  {item.icon} {item.label}
                </Link>
              )
            })}
            {profile?.is_admin && (
              <Link href="/portal/admin" style={{ padding: '0.5rem 0.75rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', background: 'rgba(255,215,0,0.1)', color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.2)' }}>
                ⚙️ Admin
              </Link>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }} className="hidden md:block">
              {profile?.full_name}
            </span>
            <button onClick={handleSignOut} className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              Sign Out
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden" style={{ background: 'none', border: 'none', color: 'var(--white)', fontSize: '1.5rem', cursor: 'pointer' }}>
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ borderTop: '1px solid var(--navy-border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
                padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.9rem', fontWeight: 600,
                textDecoration: 'none', color: pathname === item.href ? 'var(--electric)' : 'var(--white)',
                background: pathname === item.href ? 'rgba(0,255,135,0.1)' : 'transparent',
              }}>
                {item.icon} {item.label}
              </Link>
            ))}
            {profile?.is_admin && (
              <Link href="/portal/admin" onClick={() => setMenuOpen(false)} style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none', color: 'var(--gold)', background: 'rgba(255,215,0,0.1)' }}>
                ⚙️ Admin
              </Link>
            )}
          </div>
        )}
      </nav>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        {children}
      </main>
    </div>
  )
}
