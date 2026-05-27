'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Profile } from '@/lib/types'

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
    <div className="min-h-screen" style={{background:'var(--cream)'}}>
      <nav className="sticky top-0 z-50 shadow-md" style={{background:'var(--green-deep)'}}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/portal" className="flex items-center gap-2">
            <span className="text-2xl">⛳</span>
            <span className="font-display text-xl text-white">Golf Tournament</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link key={item.href} href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === item.href ? 'text-white' : 'text-green-200 hover:text-white'}`}
                style={pathname === item.href ? {background:'var(--green-mid)'} : {}}
              >
                {item.icon} {item.label}
              </Link>
            ))}
            {profile?.is_admin && (
              <Link href="/portal/admin"
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{background:'var(--gold)', color:'var(--green-deep)'}}
              >⚙️ Admin</Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-sm" style={{color:'var(--green-light)'}}>
              {profile?.full_name}
            </span>
            <button onClick={handleSignOut} className="text-sm px-3 py-2 rounded-lg" style={{background:'rgba(255,255,255,0.1)', color:'white'}}>
              Sign Out
            </button>
            <button className="md:hidden text-white text-2xl" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden px-4 pb-4 flex flex-col gap-1">
            {navItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm text-white"
                style={pathname === item.href ? {background:'var(--green-mid)'} : {}}
              >
                {item.icon} {item.label}
              </Link>
            ))}
            {profile?.is_admin && (
              <Link href="/portal/admin" onClick={() => setMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{background:'var(--gold)', color:'var(--green-deep)'}}
              >⚙️ Admin</Link>
            )}
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}