'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function BackNav() {
  const router = useRouter()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
      <button
        onClick={() => router.back()}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          background: 'none', border: 'none', color: 'var(--gold)', fontWeight: 700,
          fontSize: '0.85rem', cursor: 'pointer', padding: 0,
        }}
      >
        ← Back
      </button>
      <span style={{ color: 'var(--border)' }}>|</span>
      <Link href="/portal" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem' }}>
        🏠 Home
      </Link>
    </div>
  )
}
