'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { TOURNAMENT_NAME, COURSE_NAME, COURSE_LOCATION } from '@/lib/constants'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError('')

    const { error: signupError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name } }
    })

    if (signupError) { setError(signupError.message); setLoading(false); return }

    // If invited via token, link this account to the reservation
    if (token) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        await fetch('/api/claim-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ token })
        })
      }
    }

    router.push('/portal')
  }

  const fields = [
    { label: 'FULL NAME', key: 'full_name', type: 'text', placeholder: 'John Smith', autoComplete: 'name' },
    { label: 'EMAIL', key: 'email', type: 'email', placeholder: 'you@email.com', autoComplete: 'email' },
    { label: 'PASSWORD', key: 'password', type: 'password', placeholder: '••••••••', autoComplete: 'new-password' },
    { label: 'CONFIRM PASSWORD', key: 'confirm', type: 'password', placeholder: '••••••••', autoComplete: 'new-password' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.75)), url("/course.jpg")',
      backgroundSize: 'cover', backgroundPosition: 'center',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>⛳</div>
          <h1 style={{ fontSize: '3rem', color: 'var(--gold)', marginBottom: '0.25rem', lineHeight: 1.1 }}>{TOURNAMENT_NAME}</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{COURSE_NAME} · {COURSE_LOCATION}</p>
        </div>

        <div style={{
          background: 'rgba(17,26,15,0.9)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(201,168,76,0.2)', borderRadius: '1.5rem',
          padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}>
          {token && (
            <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '0.875rem', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--gold)', textAlign: 'center' }}>
              🎟 You've been invited — create your account to claim your spot!
            </div>
          )}
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--white)' }}>Join the Tournament</h2>
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.08em' }}>{f.label}</label>
                <input className="input" type={f.type} placeholder={f.placeholder}
                  autoComplete={f.autoComplete}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })} required />
              </div>
            ))}
            {error && (
              <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '0.75rem', padding: '0.75rem', color: '#ff6b6b', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn-electric" disabled={loading} style={{ width: '100%', marginTop: '0.5rem', fontSize: '1rem', padding: '1rem' }}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--navy-border)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
          High Country Classic · Apple Mountain Golf Resort
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}
