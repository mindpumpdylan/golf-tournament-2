'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { displayName } from '@/lib/utils'
import type { Profile } from '@/lib/types'

export default function AccountMenu({ profile, onSignOut }: { profile: Profile | null; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const items = [
    { href: '/portal/account', label: 'My Profile', icon: '👤' },
    { href: '/portal/settings', label: 'Settings', icon: '🔧' },
    { href: '/terms', label: 'Terms of Service', icon: '📄' },
    { href: '/privacy', label: 'Privacy Policy', icon: '🔒' },
    ...(profile?.is_admin ? [{ href: '/portal/admin', label: 'Admin', icon: '⚙️' }] : []),
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.35rem 0.75rem', borderRadius: '999px',
          background: 'var(--card-mid)', border: '1px solid var(--border)',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <div style={{ width: '22px', height: '22px', borderRadius: '999px', overflow: 'hidden', flexShrink: 0, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#0d0f0a' }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (profile?.full_name?.charAt(0) || '?')}
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cream-dim)', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
          {displayName(profile)}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, zIndex: 60,
          minWidth: '220px', background: '#0c1609', border: '1px solid #4a3a28',
          borderRadius: '0.875rem', boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden', padding: '0.4rem',
        }}>
          {items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.625rem 0.75rem', borderRadius: '0.625rem',
                fontSize: '0.85rem', fontWeight: 600, color: '#f0e6cc',
                textDecoration: 'none', letterSpacing: '0.02em',
              }}
            >
              <span style={{ fontSize: '0.95rem' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <div style={{ borderTop: '1px solid #4a3a28', margin: '0.4rem 0' }} />
          <button
            onClick={() => { setOpen(false); onSignOut() }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem', width: '100%',
              padding: '0.625rem 0.75rem', borderRadius: '0.625rem',
              fontSize: '0.85rem', fontWeight: 700, color: '#ff8f8f',
              background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.02em',
            }}
          >
            <span style={{ fontSize: '0.95rem' }}>🚪</span>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
