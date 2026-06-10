'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Profile } from '@/lib/types'

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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(data)
    })
  }, [router])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navBg = '#111a0f'
  const navBorder = '#3d3220'
  const gold = '#c9a84c'
  const textMuted = '#8b7d6b'
  const cream = '#f0e6cc'
  const cardMid = '#162012'

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f0a' }}>
      <nav style={{ background: navBg, borderBottom: '1px solid ' + navBorder, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #8b6f2e, #c9a84c, #8b6f2e, transparent)' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', height: '60px', gap: '1rem' }}>

          {/* Logo */}
          <Link href="/portal" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none', flexShrink: 0 }}>
            <img src="/logo.png" alt="HCC" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            {!isMobile && (
              <span style={{ fontFamily: 'JerseyM54, Georgia, serif', fontSize: '0.95rem', color: gold, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                High Country Classic
              </span>
            )}
          </Link>

          {/* Desktop nav - centered */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', flex: 1, justifyContent: 'center' }}>
              {navItems.map(item => {
                const active = pathname === item.href
                return (
                  <Link key={item.href} href={item.href} style={{
                    padding: '0.4rem 0.55rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.06em',
                    background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
                    color: active ? gold : textMuted,
                    border: active ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
                    transition: 'all 0.15s',
                  }}>
                    {item.label.toUpperCase()}
                  </Link>
                )
              })}
              {profile?.is_admin && (
                <Link href="/portal/admin" style={{
                  padding: '0.4rem 0.55rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  letterSpacing: '0.06em',
                  background: 'rgba(201,168,76,0.1)',
                  color: gold,
                  border: '1px solid rgba(201,168,76,0.25)',
                }}>
                  ADMIN
                </Link>
              )}
            </div>
          )}

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: isMobile ? 'auto' : '0' }}>
            {!isMobile && (
              <>
                <Link href="/portal/account" style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  textDecoration: 'none', padding: '0.3rem 0.65rem',
                  borderRadius: '999px', background: cardMid,
                  border: '1px solid ' + navBorder, transition: 'all 0.15s',
                }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '999px', background: gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#0d0f0a', flexShrink: 0 }}>
                    {profile?.full_name?.charAt(0) || '?'}
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: cream, maxWidth: '65px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                    {profile?.full_name?.split(' ')[0]}
                  </span>
                </Link>
                <button onClick={handleSignOut} style={{
                  padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.72rem', fontWeight: 700,
                  background: 'transparent', border: '1px solid ' + navBorder, color: textMuted,
                  cursor: 'pointer', letterSpacing: '0.06em',
                }}>
                  SIGN OUT
                </button>
              </>
            )}
            {isMobile && (
              <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: cream, fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem' }}>
                {menuOpen ? '✕' : '☰'}
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {isMobile && menuOpen && (
          <div style={{ borderTop: '1px solid ' + navBorder, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', background: navBg }}>
            {navItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
                padding: '0.7rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600,
                textDecoration: 'none', letterSpacing: '0.05em',
                color: pathname === item.href ? gold : cream,
                background: pathname === item.href ? 'rgba(201,168,76,0.08)' : 'transparent',
              }}>
                {item.label.toUpperCase()}
              </Link>
            ))}
            <Link href="/portal/account" onClick={() => setMenuOpen(false)} style={{ padding: '0.7rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', color: cream, letterSpacing: '0.05em' }}>
              MY ACCOUNT
            </Link>
            {profile?.is_admin && (
              <Link href="/portal/admin" onClick={() => setMenuOpen(false)} style={{ padding: '0.7rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', color: gold, background: 'rgba(201,168,76,0.08)', letterSpacing: '0.05em' }}>
                ADMIN
              </Link>
            )}
            <button onClick={handleSignOut} style={{ padding: '0.7rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600, background: 'none', border: '1px solid ' + navBorder, color: textMuted, cursor: 'pointer', textAlign: 'left', marginTop: '0.5rem', letterSpacing: '0.05em' }}>
              SIGN OUT
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
