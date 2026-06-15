'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { COURSE_NAME, COURSE_LOCATION } from '@/lib/constants'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Supabase puts the user into a session when they click the reset link.
    // Wait for the session to populate from the URL hash.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
      else {
        // Listen for the auth state change triggered by the magic link
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            setReady(true)
            subscription.unsubscribe()
          }
        })
      }
    })
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else setDone(true)
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
          <img src="/logo.png" alt="High Country Classic" style={{ width: '140px', height: '140px', objectFit: 'contain', marginBottom: '0.75rem', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.6))' }} />
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
          {done ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <div style={{ fontSize: '3rem' }}>✅</div>
              <h2 style={{ fontSize: '1.3rem', color: 'var(--gold)' }}>Password updated!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>You're all set. Redirecting you to the portal…</p>
              {setTimeout(() => router.push('/portal'), 1500) && null}
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⏳</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Verifying your reset link…</p>
              <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--gold)', textAlign: 'center' }}>Set New Password</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' }}>Choose a new password for your account.</p>
              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>NEW PASSWORD</label>
                  <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>CONFIRM PASSWORD</label>
                  <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Same as above" required />
                </div>
                {error && (
                  <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '0.75rem', padding: '0.75rem', color: '#ff6b6b', fontSize: '0.85rem' }}>
                    {error}
                  </div>
                )}
                <button type="submit" className="btn-electric" disabled={loading} style={{ width: '100%', fontSize: '1rem', padding: '1rem' }}>
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
