'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

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
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:'var(--green-deep)'}}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⛳</div>
          <h1 className="text-4xl font-display text-white mb-2">Tournament Portal</h1>
          <p style={{color:'var(--green-light)'}}>Sign in to manage your spot</p>
        </div>
        <div className="card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{color:'var(--text-mid)'}}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-mid"
                placeholder="you@email.com" required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{color:'var(--text-mid)'}}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-mid"
                placeholder="••••••••" required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center mt-4 text-sm" style={{color:'var(--text-mid)'}}>
            No account?{' '}
            <Link href="/signup" className="font-semibold" style={{color:'var(--green-mid)'}}>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}