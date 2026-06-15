'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { COURSE_NAME, COURSE_LOCATION } from '@/lib/constants'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/portal')
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    setLoading(false)
    if (error) setError(error.message)
    else setResetSent(true)
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.75)), url("/course.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="High Country Classic" style={{ width: '180px', height: '180px', objectFit: 'contain', marginBottom: '0.75rem', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.6))' }} />
          <p style={{ color: 'rgba(240,230,204,0.6)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>{COURSE_NAME.toUpperCase()} · {COURSE_LOCATION.toUpperCase()}</p>
        </div>

        <div style={{
          background: 'rgba(17, 26, 15, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: '1.5rem',
          padding: '2rem',
          boxShadow: '0 25px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,168,76,0.1)',
        }}>
          {mode === 'login' ? (
            <>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--gold)', textAlign: 'center' }}>Welcome Back</h2>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>EMAIL</label>
                  <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>PASSWORD</label>
                    <button type="button" onClick={() => { setMode('forgot'); setError('') }} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                      Forgot password?
                    </button>
                  </div>
                  <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                {error && (
                  <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '0.75rem', padding: '0.75rem', color: '#ff6b6b', fontSize: '0.85rem' }}>
                    {error}
                  </div>
                )}
                <button type="submit" className="btn-electric" disabled={loading} style={{ width: '100%', marginTop: '0.5rem', fontSize: '1rem', padding: '1rem' }}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            </>
          ) : resetSent ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <div style={{ fontSize: '3rem' }}>📬</div>
              <h2 style={{ fontSize: '1.3rem', color: 'var(--gold)' }}>Check your email</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                We sent a password reset link to <strong style={{ color: 'var(--cream)' }}>{email}</strong>. Click the link in the email to set a new password.
              </p>
              <button onClick={() => { setMode('login'); setResetSent(false) }} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                ← Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--gold)', textAlign: 'center' }}>Reset Password</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Enter your email and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>EMAIL</label>
                  <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
                </div>
                {error && (
                  <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '0.75rem', padding: '0.75rem', color: '#ff6b6b', fontSize: '0.85rem' }}>
                    {error}
                  </div>
                )}
                <button type="submit" className="btn-electric" disabled={loading} style={{ width: '100%', fontSize: '1rem', padding: '1rem' }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              <button onClick={() => { setMode('login'); setError('') }} style={{ display: 'block', width: '100%', marginTop: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', textAlign: 'center' }}>
                ← Back to sign in
              </button>
            </>
          )}

          {mode === 'login' && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                New to the tournament?{' '}
                <Link href="/signup" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }}>Create Account</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
