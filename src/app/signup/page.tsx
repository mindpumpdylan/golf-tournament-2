'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { TOURNAMENT_NAME } from '@/lib/constants'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name } }
    })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/portal')
  }

  const fields = [
    { label: 'FULL NAME', key: 'full_name', type: 'text', placeholder: 'John Smith' },
    { label: 'EMAIL', key: 'email', type: 'email', placeholder: 'you@email.com' },
    { label: 'PASSWORD', key: 'password', type: 'password', placeholder: '••••••••' },
    { label: 'CONFIRM PASSWORD', key: 'confirm', type: 'password', placeholder: '••••••••' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>⛳</div>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--electric)', marginBottom: '0.25rem' }}>{TOURNAMENT_NAME}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Create your player account</p>
        </div>
        <div className="card-glow" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Join the Tournament</h2>
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>{f.label}</label>
                <input className="input" type={f.type} placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })} required />
              </div>
            ))}
            {error && <p style={{ color: '#ff6b6b', fontSize: '0.875rem', background: 'rgba(255,107,107,0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>{error}</p>}
            <button type="submit" className="btn-electric" disabled={loading} style={{ marginTop: '0.5rem', width: '100%' }}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--electric)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
