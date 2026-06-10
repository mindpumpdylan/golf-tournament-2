'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Profile } from '@/lib/types'
import { TOURNAMENT_NAME } from '@/lib/constants'

const navItems = [
  { href: '/portal', label: 'Home' },
  { href: '/portal/availability', label: 'Date Poll' },
  { href: '/portal/reservations', label: 'My Spots' },
  { href: '/portal/tournament', label: 'Tournament' },
  { href: '/portal/scorecard', label: 'Scorecard' },
  { href: '/portal/pin', label: 'Pin' },
  { href: '/portal/gallery', label: 'Gallery' },
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
      <nav style={{ background: 'var(--navy-card)', borderBottom: '1px solid var(--navy-border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>

          {/* Logo */}
          <Link href="/portal" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', flexShrink: 0 }}>
            <img src="/logo.png" alt="HCC" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            <span style={{ fontFamily: 'MilkyBun, Georgia, serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--electric)', letterSpacing: '-0.01em' }}>
              {TOURNAMENT_NAME}
            </span>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', overflow: 'hidden' }} className="hidden md:flex">
            {navItems.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} style={{
                  padding: '0.45rem 0.65rem', borderRadius: '0.75rem', fontSize: '0.8rem', fontWeight: 600,
                  textDecoration: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  background: active ? 'rgba(0,255,135,0.1)' : 'transparent',
                  color: active ? 'var(--electric)' : 'var(--text-muted)',
                  border: active ? '1px solid rgba(0,255,135,0.2)' : '1px solid transparent',
                }}>
                  {item.label}
                </Link>
              )
            })}
            {profile?.is_admin && (
              <Link href="/portal/admin" style={{
                padding: '0.45rem 0.65rem', borderRadius: '0.75rem', fontSize: '0.8rem', fontWeight: 700,
                textDecoration: 'none', background: pathname === '/portal/admin' ? 'rgba(255,215,0,0.2)' : 'rgba(255,215,0,0.08)',
                color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.2)',
              }}>
                Admin
              </Link>
            )}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {/* My Account button */}
            <Link href="/portal/account" style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none',
              padding: '0.4rem 0.75rem', borderRadius: '999px',
              background: pathname === '/portal/account' ? 'rgba(0,255,135,0.1)' : 'var(--navy-light)',
              border: '1px solid ' + (pathname === '/portal/account' ? 'rgba(0,255,135,0.3)' : 'var(--navy-border)'),
              transition: 'all 0.15s',
            }} className="hidden md:flex">
              <div style={{ width: '24px', height: '24px', borderRadius: '999px', background: 'var(--electric)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--navy)', flexShrink: 0 }}>
                {profile?.full_name?.charAt(0) || '?'}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--white)', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name?.split(' ')[0]}
              </span>
            </Link>

            <button onClick={handleSignOut} style={{
              padding: '0.45rem 0.875rem', borderRadius: '0.75rem', fontSize: '0.8rem', fontWeight: 700,
              background: 'transparent', border: '1px solid var(--navy-border)', color: 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.15s',
            }} className="hidden md:block">
              Sign Out
            </button>

            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: 'var(--white)', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem' }} className="md:hidden">
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ borderTop: '1px solid var(--navy-border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {navItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
                padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.9rem', fontWeight: 600,
                textDecoration: 'none', color: pathname === item.href ? 'var(--electric)' : 'var(--white)',
                background: pathname === item.href ? 'rgba(0,255,135,0.1)' : 'transparent',
              }}>
                {item.label}
              </Link>
            ))}
            <Link href="/portal/account" onClick={() => setMenuOpen(false)} style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', color: 'var(--white)' }}>
              My Account
            </Link>
            {profile?.is_admin && (
              <Link href="/portal/admin" onClick={() => setMenuOpen(false)} style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none', color: 'var(--gold)', background: 'rgba(255,215,0,0.08)' }}>
                Admin
              </Link>
            )}
            <button onClick={handleSignOut} style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.9rem', fontWeight: 600, background: 'none', border: '1px solid var(--navy-border)', color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', marginTop: '0.5rem' }}>
              Sign Out
            </button>
          </div>
        )}
      </nav>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
        {children}
      </main>
    </div>
  )
}
