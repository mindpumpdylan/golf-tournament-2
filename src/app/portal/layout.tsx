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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        {/* Gold top accent line */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, var(--gold-dim), var(--gold), var(--gold-dim), transparent)' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>

          {/* Logo */}
          <Link href="/portal" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', flexShrink: 0 }}>
            <img src="/logo.png" alt="HCC" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <span style={{ fontFamily: 'JerseyM54, Georgia, serif', fontSize: '1rem', color: 'var(--gold)', letterSpacing: '0.03em' }}>
              High Country Classic
            </span>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }} className="hidden md:flex">
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
            <Link href="/portal/account" style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none',
              padding: '0.35rem 0.75rem', borderRadius: '999px',
              background: 'var(--card-mid)', border: '1px solid var(--border)',
              transition: 'all 0.15s',
            }} className="hidden md:flex">
              <div style={{ width: '22px', height: '22px', borderRadius: '999px', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#0d0f0a', flexShrink: 0 }}>
                {profile?.full_name?.charAt(0) || '?'}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cream-dim)', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                {profile?.full_name?.split(' ')[0]}
              </span>
            </Link>

            <button onClick={handleSignOut} style={{
              padding: '0.4rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.75rem', fontWeight: 700,
              background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.06em',
            }} className="hidden md:block">
              SIGN OUT
            </button>

            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: 'var(--cream)', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem' }} className="md:hidden">
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--card)' }}>
            {navItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
                padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600,
                textDecoration: 'none', letterSpacing: '0.05em',
                color: pathname === item.href ? 'var(--gold)' : 'var(--cream)',
                background: pathname === item.href ? 'rgba(201,168,76,0.08)' : 'transparent',
              }}>
                {item.label.toUpperCase()}
              </Link>
            ))}
            <Link href="/portal/account" onClick={() => setMenuOpen(false)} style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', color: 'var(--cream)', letterSpacing: '0.05em' }}>
              MY ACCOUNT
            </Link>
            {profile?.is_admin && (
              <Link href="/portal/admin" onClick={() => setMenuOpen(false)} style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', color: 'var(--gold)', background: 'rgba(201,168,76,0.08)', letterSpacing: '0.05em' }}>
                ADMIN
              </Link>
            )}
            <button onClick={handleSignOut} style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', marginTop: '0.5rem', letterSpacing: '0.05em' }}>
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
