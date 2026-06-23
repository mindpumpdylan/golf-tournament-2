'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRequireAuth } from '@/lib/auth-hooks'

export default function SettingsPage() {
  const { ready, userId } = useRequireAuth()
  const [smsConsent, setSmsConsent] = useState(false)
  const [smsSaving, setSmsSaving] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwDone, setPwDone] = useState(false)

  useEffect(() => {
    if (!ready || !userId) return
    supabase.from('profiles').select('sms_consent').eq('id', userId).single()
      .then(({ data }) => setSmsConsent(!!data?.sms_consent))
  }, [ready, userId])

  const handleToggleSms = async (value: boolean) => {
    setSmsConsent(value)
    setSmsSaving(true)
    await supabase.from('profiles').update({ sms_consent: value }).eq('id', userId)
    setSmsSaving(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setPwError('Passwords do not match'); return }
    if (password.length < 6) { setPwError('Password must be at least 6 characters'); return }
    setPwSaving(true); setPwError('')
    const { error } = await supabase.auth.updateUser({ password })
    setPwSaving(false)
    if (error) setPwError(error.message)
    else {
      setPwDone(true); setPassword(''); setConfirm('')
      setTimeout(() => setPwDone(false), 3000)
    }
  }

  if (!ready) return null

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ fontSize: '2.5rem', color: 'var(--gold)' }}>Settings</h1>

      <div className="card">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Change Password</h2>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.08em' }}>NEW PASSWORD</label>
            <input className="input" type="password" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.08em' }}>CONFIRM PASSWORD</label>
            <input className="input" type="password" placeholder="Same as above" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          {pwError && (
            <div style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '0.75rem', padding: '0.75rem', color: '#ff6b6b', fontSize: '0.85rem' }}>
              {pwError}
            </div>
          )}
          {pwDone && <p style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>✓ Password updated!</p>}
          <button type="submit" className="btn-electric" disabled={pwSaving} style={{ alignSelf: 'flex-start' }}>
            {pwSaving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Notifications</h2>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 0', cursor: 'pointer' }}>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--cream)' }}>SMS Notifications</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Tournament reminders and updates via text message.</p>
          </div>
          <input
            type="checkbox" checked={smsConsent} disabled={smsSaving}
            onChange={e => handleToggleSms(e.target.checked)}
            style={{ width: '20px', height: '20px', accentColor: 'var(--gold)', flexShrink: 0 }}
          />
        </label>
      </div>
    </div>
  )
}
