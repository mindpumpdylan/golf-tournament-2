'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useSession } from '@/lib/auth-hooks'
import ParticleBackground from '@/components/ParticleBackground'
import AccountMenu from '@/components/AccountMenu'

const PUBLIC_NAV_ITEMS = [
  { href: '/portal', label: 'Home' },
  { href: '/portal/gallery', label: 'Gallery' },
  { href: '/portal/course', label: 'Course' },
]

const FULL_NAV_ITEMS = [
  { href: '/portal', label: 'Home' },
  { href: '/portal/availability', label: 'Date Poll' },
  { href: '/portal/reservations', label: 'My Spots' },
  { href: '/portal/team', label: 'Team' },
  { href: '/portal/tournament', label: 'Tournament' },
  { href: '/portal/scorecard', label: 'Scorecard' },
  { href: '/portal/pin', label: 'Pin' },
  { href: '/portal/gallery', label: 'Gallery' },
  { href: '/portal/players', label: 'Players' },
  { href: '/portal/course', label: 'Course' },
]

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, profile } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const navItems = isLoggedIn ? FULL_NAV_ITEMS : PUBLIC_NAV_ITEMS

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close drawer on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const close = () => setMenuOpen(false)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <ParticleBackground />

      {/* Nav bar */}
      <nav style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, var(--gold-dim), var(--gold), var(--gold-dim), transparent)' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>

          {/* Logo */}
          <Link href="/portal" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', flexShrink: 0 }}>
            <img src="/logo.png" alt="HCC" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <span style={{ fontFamily: 'JerseyM54, Georgia, serif', fontSize: '1rem', color: 'var(--gold)', letterSpacing: '0.03em' }}>
              High Country Classic
            </span>
          </Link>

          {/* Desktop nav links */}
          <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '0.1rem' }}>
            {navItems.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} style={{
                  padding: '0.4rem 0.6rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 600,
                  textDecoration: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap', letterSpacing: '0.05em',
                  background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
                  color: active ? 'var(--gold)' : 'var(--text-muted)',
                  border: active ? '1px solid rgba(201,168,76,0.25)' : '1px solid transparent',
                }}>
                  {item.label.toUpperCase()}
                </Link>
              )
            })}
            {profile?.is_admin && (
              <Link href="/portal/admin" style={{
                padding: '0.4rem 0.6rem', borderRadius: '0.625rem', fontSize: '0.78rem', fontWeight: 700,
                textDecoration: 'none', letterSpacing: '0.05em',
                background: 'rgba(201,168,76,0.08)', color: 'var(--gold)',
                border: '1px solid rgba(201,168,76,0.2)',
              }}>
                ADMIN
              </Link>
            )}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {/* Account menu / Sign In+Up — desktop only */}
            {!isMobile && (
              isLoggedIn ? (
                <AccountMenu profile={profile} onSignOut={handleSignOut} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Link href="/login" style={{
                    padding: '0.45rem 0.9rem', borderRadius: '0.75rem', fontSize: '0.8rem', fontWeight: 700,
                    textDecoration: 'none', color: 'var(--cream)', border: '1px solid var(--border)',
                  }}>
                    Sign In
                  </Link>
                  <Link href="/signup" style={{
                    padding: '0.45rem 0.9rem', borderRadius: '0.75rem', fontSize: '0.8rem', fontWeight: 700,
                    textDecoration: 'none', color: '#0d0f0a', background: 'var(--gold)',
                  }}>
                    Sign Up
                  </Link>
                </div>
              )
            )}

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
              style={{
                background: 'none', border: 'none', color: 'var(--cream)', cursor: 'pointer',
                padding: '0.35rem', display: isMobile ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center',
                borderRadius: '0.5rem',
              }}
            >
              {/* Animated hamburger / X */}
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                {menuOpen ? (
                  <>
                    <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 98,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(3px)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Slide-in drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 99,
        width: '280px', maxWidth: '85vw',
        background: '#0c1609',
        borderLeft: '1px solid #4a3a28',
        display: 'flex', flexDirection: 'column',
        transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowY: 'auto',
        boxShadow: menuOpen ? '-8px 0 32px rgba(0,0,0,0.6)' : 'none',
      }}>
        {/* Drawer header */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid #4a3a28', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {profile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '999px', overflow: 'hidden', background: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#0d0f0a', flexShrink: 0 }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (profile?.full_name?.charAt(0) || '?')}
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f0e6cc', lineHeight: 1 }}>{profile?.nickname?.trim() || profile?.full_name}</p>
                <p style={{ fontSize: '0.7rem', color: '#8b7d6b', marginTop: '0.15rem' }}>Player</p>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f0e6cc' }}>High Country Classic</span>
          )}
          <button onClick={close} style={{ background: 'none', border: 'none', color: '#8b7d6b', cursor: 'pointer', padding: '0.25rem', fontSize: '1rem' }}>✕</button>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                style={{
                  padding: '0.8rem 1rem', borderRadius: '0.875rem', fontSize: '0.85rem', fontWeight: 600,
                  textDecoration: 'none', letterSpacing: '0.06em', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  color: active ? '#c9a84c' : '#f0e6cc',
                  background: active ? 'rgba(201,168,76,0.1)' : 'transparent',
                  border: active ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{NAV_ICONS[item.href] || '•'}</span>
                {item.label.toUpperCase()}
              </Link>
            )
          })}

          {isLoggedIn && (
            <>
              <Link href="/portal/account" onClick={close} style={{
                padding: '0.8rem 1rem', borderRadius: '0.875rem', fontSize: '0.85rem', fontWeight: 600,
                textDecoration: 'none', letterSpacing: '0.06em', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                color: pathname === '/portal/account' ? '#c9a84c' : '#f0e6cc',
                background: pathname === '/portal/account' ? 'rgba(201,168,76,0.1)' : 'transparent',
                border: pathname === '/portal/account' ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
              }}>
                <span style={{ fontSize: '1rem' }}>👤</span>
                MY ACCOUNT
              </Link>

              <Link href="/portal/settings" onClick={close} style={{
                padding: '0.8rem 1rem', borderRadius: '0.875rem', fontSize: '0.85rem', fontWeight: 600,
                textDecoration: 'none', letterSpacing: '0.06em', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                color: pathname === '/portal/settings' ? '#c9a84c' : '#f0e6cc',
                background: pathname === '/portal/settings' ? 'rgba(201,168,76,0.1)' : 'transparent',
                border: pathname === '/portal/settings' ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
              }}>
                <span style={{ fontSize: '1rem' }}>🔧</span>
                SETTINGS
              </Link>

              <Link href="/terms" onClick={close} style={{
                padding: '0.8rem 1rem', borderRadius: '0.875rem', fontSize: '0.85rem', fontWeight: 600,
                textDecoration: 'none', letterSpacing: '0.06em', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f0e6cc',
              }}>
                <span style={{ fontSize: '1rem' }}>📄</span>
                TERMS OF SERVICE
              </Link>

              <Link href="/privacy" onClick={close} style={{
                padding: '0.8rem 1rem', borderRadius: '0.875rem', fontSize: '0.85rem', fontWeight: 600,
                textDecoration: 'none', letterSpacing: '0.06em', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f0e6cc',
              }}>
                <span style={{ fontSize: '1rem' }}>🔒</span>
                PRIVACY POLICY
              </Link>

              {profile?.is_admin && (
                <Link href="/portal/admin" onClick={close} style={{
                  padding: '0.8rem 1rem', borderRadius: '0.875rem', fontSize: '0.85rem', fontWeight: 700,
                  textDecoration: 'none', letterSpacing: '0.06em',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  color: '#c9a84c', background: 'rgba(201,168,76,0.08)',
                  border: '1px solid rgba(201,168,76,0.2)',
                }}>
                  <span style={{ fontSize: '1rem' }}>⚙️</span>
                  ADMIN
                </Link>
              )}
            </>
          )}
        </div>

        {/* Drawer footer */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #4a3a28' }}>
          {isLoggedIn ? (
            <button onClick={handleSignOut} style={{
              width: '100%', padding: '0.75rem', borderRadius: '0.875rem', fontSize: '0.82rem', fontWeight: 700,
              background: 'rgba(255,107,107,0.07)', border: '1px solid rgba(255,107,107,0.2)',
              color: '#ff8f8f', cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s',
            }}>
              SIGN OUT
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link href="/login" onClick={close} style={{
                flex: 1, textAlign: 'center', padding: '0.75rem', borderRadius: '0.875rem', fontSize: '0.82rem', fontWeight: 700,
                textDecoration: 'none', color: '#f0e6cc', border: '1px solid #4a3a28', letterSpacing: '0.06em',
              }}>
                SIGN IN
              </Link>
              <Link href="/signup" onClick={close} style={{
                flex: 1, textAlign: 'center', padding: '0.75rem', borderRadius: '0.875rem', fontSize: '0.82rem', fontWeight: 700,
                textDecoration: 'none', color: '#0d0f0a', background: 'var(--gold)', letterSpacing: '0.06em',
              }}>
                SIGN UP
              </Link>
            </div>
          )}
        </div>
      </div>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem', position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  )
}

const NAV_ICONS: Record<string, string> = {
  '/portal': '🏠',
  '/portal/availability': '📅',
  '/portal/reservations': '🎟',
  '/portal/team': '👥',
  '/portal/tournament': '🏆',
  '/portal/scorecard': '📋',
  '/portal/pin': '📍',
  '/portal/gallery': '📷',
  '/portal/players': '👥',
  '/portal/course': '⛳',
}
