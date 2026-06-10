'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { TOURNAMENT_NAME, COURSE_NAME, COURSE_LOCATION } from '@/lib/constants'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/portal')
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.75)), url("/course.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>⛳</div>
          <h1 style={{ fontSize: '3rem', color: 'var(--electric)', marginBottom: '0.25rem', lineHeight: 1.1 }}>
            {TOURNAMENT_NAME}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{COURSE_NAME} · {COURSE_LOCATION}</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(15, 23, 41, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,255,135,0.15)',
          borderRadius: '1.5rem',
          padding: '2rem',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--white)' }}>Welcome Back</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.08em' }}>EMAIL</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.08em' }}>PASSWORD</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '0.75rem', padding: '0.75rem', color: '#ff6b6b', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn-electric" disabled={loading} style={{ width: '100%', marginTop: '0.5rem', fontSize: '1rem', padding: '1rem' }}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--navy-border)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              New to the tournament?{' '}
              <Link href="/signup" style={{ color: 'var(--electric)', fontWeight: 700, textDecoration: 'none' }}>Create Account</Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
          High Country Classic · Apple Mountain Golf Resort
        </p>
      </div>
    </div>
  )
}
