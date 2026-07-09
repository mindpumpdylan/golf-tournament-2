'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR, HOLES } from '@/lib/constants'
import { displayName } from '@/lib/utils'
import { useRequireAuth } from '@/lib/auth-hooks'
import { format } from 'date-fns'

const PAR3_HOLES = HOLES.filter(h => h.par === 3)
const CROP_SIZE = 280
const OUTPUT_SIZE = 400

export default function AccountPage() {
  const { ready } = useRequireAuth()
  const [profile, setProfile] = useState<any>(null)
  const [reservations, setReservations] = useState<any[]>([])
  const [scores, setScores] = useState<any[]>([])
  const [pinEntries, setPinEntries] = useState<any[]>([])
  const [availability, setAvailability] = useState<any[]>([])
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [handicap, setHandicap] = useState('')
  const [ghin, setGhin] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [homeCourse, setHomeCourse] = useState('')
  const [yearsPlaying, setYearsPlaying] = useState('')
  const [shirtSize, setShirtSize] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [registration, setRegistration] = useState<any>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [tab, setTab] = useState<'profile' | 'reservations' | 'stats' | 'history'>('profile')
  const fileRef = useRef<HTMLInputElement>(null)

  // Crop modal state
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [cropScale, setCropScale] = useState(1)
  const [cropNatural, setCropNatural] = useState({ w: 0, h: 0 })
  const [cropDrag, setCropDrag] = useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const [pinchRef, setPinchRef] = useState<{ dist: number; scale: number; mx: number; my: number; imgLeft: number; imgTop: number } | null>(null)
  const cropAreaRef = useRef<HTMLDivElement>(null)

  const fillScale = cropNatural.w && cropNatural.h
    ? Math.max(CROP_SIZE / cropNatural.w, CROP_SIZE / cropNatural.h)
    : 1
  const dispW = cropNatural.w * fillScale * cropScale
  const dispH = cropNatural.h * fillScale * cropScale
  const imgLeft = CROP_SIZE / 2 + cropOffset.x - dispW / 2
  const imgTop  = CROP_SIZE / 2 + cropOffset.y - dispH / 2

  const getTouchDist = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const cropStart = (clientX: number, clientY: number) =>
    setCropDrag({ sx: clientX, sy: clientY, ox: cropOffset.x, oy: cropOffset.y })
  const cropMove = (clientX: number, clientY: number) => {
    if (!cropDrag) return
    setCropOffset({ x: cropDrag.ox + (clientX - cropDrag.sx), y: cropDrag.oy + (clientY - cropDrag.sy) })
  }
  const cropEnd = () => setCropDrag(null)

  const handleCropSave = () => {
    if (!cropSrc) return
    setAvatarUploading(true)
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')!
    const ratio = OUTPUT_SIZE / CROP_SIZE
    ctx.beginPath()
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, imgLeft * ratio, imgTop * ratio, dispW * ratio, dispH * ratio)
      canvas.toBlob(async (blob) => {
        if (!blob) { setAvatarUploading(false); return }
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload-avatar', { method: 'POST', body: fd })
        const json = await res.json()
        if (json.url) {
          const { data: { session: s2 } } = await supabase.auth.getSession()
          if (s2) {
            const { error } = await supabase.from('profiles').update({ avatar_url: json.url }).eq('id', s2.user.id)
            if (error) {
              setMessage('⚠️ Photo uploaded but not saved to profile — run the SQL migration (ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text). Error: ' + error.message)
              setAvatarUrl(json.url)
            } else {
              setMessage('Photo updated!')
              await load()
              setAvatarUrl(json.url)
            }
          }
        } else {
          setMessage((json.error || 'Upload failed — check Cloudinary env vars') + (json.detail ? ` | ${json.detail}` : ''))
        }
        setAvatarUploading(false)
        setCropSrc(null)
        setTimeout(() => setMessage(''), 4000)
      }, 'image/jpeg', 0.92)
    }
    img.src = cropSrc
  }

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const uid = session.user.id
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(prof)
    setFullName(prof?.full_name || '')
    setNickname(prof?.nickname || '')
    setHandicap(prof?.handicap?.toString() || '')
    setGhin(prof?.ghin_number || '')
    setPhone(prof?.phone_number || '')
    setBio(prof?.bio || '')
    setHomeCourse(prof?.home_course || '')
    setYearsPlaying(prof?.years_playing?.toString() || '')
    setShirtSize(prof?.shirt_size || '')
    setAvatarUrl(prof?.avatar_url || '')

    const { data: res } = await supabase.from('reservations').select('*').eq('reserver_id', uid).order('created_at', { ascending: false })
    setReservations(res || [])

    const { data: reg } = await supabase.from('tournament_registrations').select('tournament_year, created_at').eq('player_id', uid).eq('tournament_year', CURRENT_YEAR).maybeSingle()
    setRegistration(reg || null)

    const { data: member } = await supabase.from('team_members').select('team_id, teams(*)').eq('player_id', uid).maybeSingle()
    if (member?.team_id) {
      const { data: sc } = await supabase.from('scores').select('*').eq('team_id', member.team_id)
      setScores(sc || [])
    }

    const { data: pin } = await supabase.from('closest_to_pin').select('*').eq('player_id', uid).order('created_at', { ascending: false })
    setPinEntries(pin || [])

    const { data: av } = await supabase.from('availability_dates').select('date').eq('user_id', uid).order('date')
    setAvailability(av || [])
  }

  useEffect(() => { if (ready) load() }, [ready])

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaving(false); return }
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim() || null,
      nickname: nickname.trim() || null,
      handicap: parseFloat(handicap) || null,
      ghin_number: ghin || null,
      phone_number: phone.trim() || null,
      bio: bio.trim() || null,
      home_course: homeCourse.trim() || null,
      years_playing: parseInt(yearsPlaying) || null,
      shirt_size: shirtSize || null,
    }).eq('id', session.user.id)
    setSaving(false)
    if (error) {
      const isMissingCol = (error.message?.toLowerCase().includes('column') && error.message?.toLowerCase().includes('does not exist'))
        || error.message?.toLowerCase().includes('schema cache')
        || error.message?.toLowerCase().includes('could not find')
      setMessage(isMissingCol
        ? '⚠️ Database needs a migration — go to Supabase → SQL Editor and run: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text; ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_course text; ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_playing integer; ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shirt_size text;'
        : '❌ Save failed: ' + error.message)
    } else {
      setMessage('✓ Profile saved!')
      setTimeout(() => setMessage(''), 4000)
      load()

      fetch('/api/notify/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ message: `👤 ${fullName.trim() || 'A player'} updated their profile` }),
      }).catch(() => {})
    }
  }

  const totalScore = scores.reduce((sum, s) => sum + s.strokes, 0)
  const bestHole = scores.length > 0 ? scores.reduce((best, s) => s.strokes < best.strokes ? s : best) : null

  const statusStyle = (status: string) => {
    if (status === 'confirmed') return { background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.25)' }
    if (status === 'expired') return { background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', border: '1px solid rgba(255,107,107,0.2)' }
    return { background: 'rgba(255,215,0,0.1)', color: 'var(--gold)', border: '1px solid rgba(255,215,0,0.2)' }
  }

  const tabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'reservations', label: 'Reservations' },
    { key: 'stats', label: 'My Stats' },
    { key: 'history', label: 'History' },
  ]

  if (!ready) return null

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Crop modal */}
      {cropSrc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#111a0f', border: '1px solid #3d3220', borderRadius: '1.5rem', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', maxWidth: '360px', width: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#c9a84c', margin: '0 0 0.25rem' }}>Frame Your Photo</h3>
              <p style={{ fontSize: '0.8rem', color: '#8b7d6b', margin: 0 }}>Drag to reposition · Pinch to zoom</p>
            </div>

            {/* Circular crop area */}
            <div
              ref={cropAreaRef}
              style={{ width: CROP_SIZE, height: CROP_SIZE, borderRadius: '50%', overflow: 'hidden', cursor: cropDrag ? 'grabbing' : 'grab', position: 'relative', border: '3px solid rgba(201,168,76,0.5)', flexShrink: 0, userSelect: 'none', touchAction: 'none', background: '#0d0f0a' }}
              onMouseDown={e => cropStart(e.clientX, e.clientY)}
              onMouseMove={e => cropMove(e.clientX, e.clientY)}
              onMouseUp={cropEnd}
              onMouseLeave={cropEnd}
              onTouchStart={e => {
                e.preventDefault()
                if (e.touches.length === 2) {
                  cropEnd()
                  const rect = cropAreaRef.current?.getBoundingClientRect()
                  const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - (rect?.left ?? 0)
                  const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - (rect?.top ?? 0)
                  setPinchRef({ dist: getTouchDist(e.touches), scale: cropScale, mx, my, imgLeft, imgTop })
                } else {
                  setPinchRef(null)
                  cropStart(e.touches[0].clientX, e.touches[0].clientY)
                }
              }}
              onTouchMove={e => {
                e.preventDefault()
                if (e.touches.length === 2 && pinchRef) {
                  const rawRatio = getTouchDist(e.touches) / pinchRef.dist
                  const newScale = Math.max(0.5, Math.min(3, pinchRef.scale * rawRatio))
                  const scaleRatio = newScale / pinchRef.scale
                  const newImgLeft = pinchRef.mx - (pinchRef.mx - pinchRef.imgLeft) * scaleRatio
                  const newImgTop  = pinchRef.my - (pinchRef.my - pinchRef.imgTop)  * scaleRatio
                  const newDispW = cropNatural.w * fillScale * newScale
                  const newDispH = cropNatural.h * fillScale * newScale
                  setCropScale(newScale)
                  setCropOffset({ x: newImgLeft - CROP_SIZE / 2 + newDispW / 2, y: newImgTop - CROP_SIZE / 2 + newDispH / 2 })
                } else if (e.touches.length === 1) {
                  cropMove(e.touches[0].clientX, e.touches[0].clientY)
                }
              }}
              onTouchEnd={() => { setPinchRef(null); cropEnd() }}
            >
              <img
                src={cropSrc}
                onLoad={e => {
                  const img = e.target as HTMLImageElement
                  setCropNatural({ w: img.naturalWidth, h: img.naturalHeight })
                }}
                style={{ position: 'absolute', left: imgLeft, top: imgTop, width: dispW, height: dispH, pointerEvents: 'none', userSelect: 'none', draggable: false } as React.CSSProperties}
                draggable={false}
                alt=""
              />
            </div>

            {/* Zoom slider */}
            <div style={{ width: '100%' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#8b7d6b', marginBottom: '0.5rem', letterSpacing: '0.06em', fontWeight: 700 }}>ZOOM</label>
              <input
                type="range" min="0.5" max="3" step="0.01"
                value={cropScale}
                onChange={e => {
                  const newScale = parseFloat(e.target.value)
                  const ratio = newScale / cropScale
                  setCropScale(newScale)
                  setCropOffset(prev => ({ x: prev.x * ratio, y: prev.y * ratio }))
                }}
                style={{ width: '100%', accentColor: '#c9a84c' }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button
                onClick={() => { setCropSrc(null); setCropOffset({ x: 0, y: 0 }); setCropScale(1) }}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '0.875rem', background: 'transparent', border: '1px solid #3d3220', color: '#8b7d6b', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCropSave}
                disabled={avatarUploading || !cropNatural.w}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '0.875rem', background: '#c9a84c', border: 'none', color: '#0d0f0a', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
              >
                {avatarUploading ? 'Saving...' : 'Use Photo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => !avatarUploading && fileRef.current?.click()}
            style={{ width: '72px', height: '72px', borderRadius: '999px', overflow: 'hidden', cursor: 'pointer', border: '2px solid rgba(201,168,76,0.3)', position: 'relative' }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 700, color: '#0d0f0a' }}>
                {profile?.full_name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            style={{ position: 'absolute', bottom: '-2px', right: '-4px', width: '22px', height: '22px', borderRadius: '999px', background: 'var(--gold)', border: '2px solid #0d0f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', cursor: 'pointer' }}
          >📷</button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0]
              if (!f) return
              if (fileRef.current) fileRef.current.value = ''
              setCropOffset({ x: 0, y: 0 })
              setCropScale(1)
              setCropNatural({ w: 0, h: 0 })
              setCropSrc(URL.createObjectURL(f))
            }}
          />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--white)', marginBottom: '0.2rem' }}>{displayName(profile)}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{profile?.email}</p>
          {profile?.is_admin && <span className="badge-gold" style={{ marginTop: '0.4rem', display: 'inline-block' }}>Admin</span>}
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
        {[
          { label: 'Handicap', value: profile?.handicap ?? 'N/A', color: 'var(--electric)' },
          { label: 'Tournament Score', value: totalScore || '—', color: 'var(--gold)' },
          { label: 'Holes Played', value: scores.length + '/18', color: 'var(--electric)' },
          { label: 'Pin Submissions', value: pinEntries.length, color: 'var(--gold)' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <p style={{ fontSize: '1.75rem', fontFamily: 'Georgia, serif', fontWeight: 700, color: stat.color, lineHeight: 1, marginBottom: '0.3rem' }}>{stat.value}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>{stat.label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '0.6rem 1.25rem', borderRadius: '0.875rem', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
            background: tab === t.key ? 'rgba(201,168,76,0.15)' : 'var(--navy-card)',
            color: tab === t.key ? 'var(--gold)' : 'var(--text-muted)',
            border: '1px solid ' + (tab === t.key ? 'rgba(201,168,76,0.3)' : 'var(--navy-border)'),
          }}>{t.label}</button>
        ))}
      </div>

      {message && (() => {
        const isErr = message.startsWith('❌') || message.includes('failed') || message.includes('Failed')
        const isWarn = message.startsWith('⚠️')
        return (
          <div style={{
            background: isErr ? 'rgba(255,107,107,0.08)' : isWarn ? 'rgba(201,168,76,0.07)' : 'rgba(0,212,106,0.07)',
            border: `1px solid ${isErr ? 'rgba(255,107,107,0.25)' : isWarn ? 'rgba(201,168,76,0.3)' : 'rgba(0,212,106,0.2)'}`,
            borderRadius: '1rem', padding: '1rem',
            color: isErr ? '#ff8f8f' : isWarn ? 'var(--gold)' : '#00d46a',
            fontSize: '0.85rem', lineHeight: 1.6,
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
          }}>
            <span style={{ flexShrink: 0, marginTop: '0.05rem' }}>{isErr ? '✗' : isWarn ? '⚠' : '✓'}</span>
            <span>{message.replace(/^[❌⚠️✓]\s*/, '')}</span>
          </div>
        )
      })()}

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="card">
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>My Profile</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>FULL NAME</label>
                <input className="input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>NICKNAME <span style={{ fontWeight: 400, fontSize: '0.72rem', letterSpacing: 0, textTransform: 'none' }}>(shown app-wide)</span></label>
                <input className="input" type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. Big D, Duke, Flash" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>EMAIL</label>
              <div style={{ padding: '0.85rem 1rem', background: 'var(--navy-light)', borderRadius: '0.875rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>{profile?.email}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>HANDICAP INDEX</label>
                <input className="input" type="number" step="0.1" value={handicap} onChange={e => setHandicap(e.target.value)} placeholder="e.g. 12.4" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>GHIN NUMBER</label>
                <input className="input" value={ghin} onChange={e => setGhin(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>PHONE NUMBER <span style={{ fontWeight: 400, fontSize: '0.72rem', letterSpacing: 0, textTransform: 'none' }}>(optional — visible to admin)</span></label>
              <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555" autoComplete="tel" />
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>BIO <span style={{ fontWeight: 400, fontSize: '0.72rem', letterSpacing: 0, textTransform: 'none' }}>(optional — {160 - bio.length} chars left)</span></label>
              <textarea className="input" value={bio} onChange={e => setBio(e.target.value.slice(0, 160))} placeholder="Tell us about your golf game..." rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>HOME COURSE</label>
                <input className="input" type="text" value={homeCourse} onChange={e => setHomeCourse(e.target.value)} placeholder="e.g. Pebble Beach" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>YEARS PLAYING</label>
                <input className="input" type="number" min="0" max="80" value={yearsPlaying} onChange={e => setYearsPlaying(e.target.value)} placeholder="e.g. 15" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>SHIRT SIZE <span style={{ fontWeight: 400, fontSize: '0.72rem', letterSpacing: 0, textTransform: 'none' }}>(for tournament swag)</span></label>
              <select className="input" value={shirtSize} onChange={e => setShirtSize(e.target.value)}>
                <option value="">Select size...</option>
                {['S', 'M', 'L', 'XL', 'XXL'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={handleSaveProfile} className="btn-electric" disabled={saving} style={{ alignSelf: 'flex-start' }}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

          {availability.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--navy-border)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>MY AVAILABILITY SELECTIONS</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {availability.map((a: any) => (
                  <span key={a.date} className="badge-electric" style={{ fontSize: '0.8rem' }}>
                    {format(new Date(a.date + 'T12:00:00'), 'MMM d, yyyy')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reservations Tab */}
      {tab === 'reservations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Tournament participation card */}
          <div className="card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>{CURRENT_YEAR} Tournament Participation</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Your account is permanent — you opt in or out each year.</p>
            <div style={{ background: registration ? 'rgba(201,168,76,0.08)' : 'rgba(61,50,32,0.3)', border: `1px solid ${registration ? 'rgba(201,168,76,0.3)' : 'var(--navy-border)'}`, borderRadius: '1rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '1.05rem', color: registration ? 'var(--gold)' : 'var(--white)', marginBottom: '0.2rem' }}>
                  {registration ? `✓ Opted in for ${CURRENT_YEAR}` : `Not opted in for ${CURRENT_YEAR}`}
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {registration
                    ? `Opted in ${format(new Date(registration.created_at), 'MMM d, yyyy')}`
                    : 'Go to My Spots to opt in for this year'}
                </p>
              </div>
              {!registration && (
                <a href="/portal/reservations" style={{ padding: '0.5rem 1.1rem', borderRadius: '0.75rem', background: 'var(--gold)', color: '#0d0f0a', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
                  Opt In for {CURRENT_YEAR}
                </a>
              )}
            </div>
          </div>

          {/* Guest invitations */}
          <div className="card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Guest Invitations</h2>
            {reservations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No guest invitations sent yet. Go to <a href="/portal/reservations" style={{ color: 'var(--gold)' }}>My Spots</a> to invite guests.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {reservations.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--navy-light)', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
                    <div>
                      <p style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{r.guest_name}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.guest_email}</p>
                      {r.invite_expires_at && r.status === 'pending' && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--gold)', marginTop: '0.2rem' }}>
                          Expires {format(new Date(r.invite_expires_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <span style={{ padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'capitalize', ...statusStyle(r.status) }}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>{CURRENT_YEAR} Scorecard</h2>
            {scores.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No scores entered yet</p>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px', marginBottom: '4px' }}>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map(h => {
                    const score = scores.find(s => s.hole_number === h)
                    return (
                      <div key={h} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{h}</div>
                        <div style={{ height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, background: score ? 'var(--electric)' : 'var(--navy-light)', color: score ? 'var(--navy)' : 'var(--navy-border)' }}>
                          {score?.strokes || '·'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px', marginBottom: '1rem' }}>
                  {Array.from({ length: 9 }, (_, i) => i + 10).map(h => {
                    const score = scores.find(s => s.hole_number === h)
                    return (
                      <div key={h} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{h}</div>
                        <div style={{ height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 700, background: score ? 'var(--electric)' : 'var(--navy-light)', color: score ? 'var(--navy)' : 'var(--navy-border)' }}>
                          {score?.strokes || '·'}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--navy-border)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total Score</span>
                  <span style={{ fontSize: '2.5rem', fontFamily: 'Georgia, serif', fontWeight: 700, color: 'var(--electric)' }}>{totalScore}</span>
                </div>
                {bestHole && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    Best hole: <span style={{ color: 'var(--electric)', fontWeight: 700 }}>Hole {bestHole.hole_number} ({bestHole.strokes} strokes)</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Closest to Pin Submissions</h2>
            {pinEntries.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No pin submissions yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pinEntries.map(entry => {
                  const hole = PAR3_HOLES.find(h => h.number === entry.hole_number)
                  return (
                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--navy-light)', borderRadius: '0.875rem', padding: '0.75rem 1rem' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>Hole {entry.hole_number}{hole ? ' — ' + hole.name : ''}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.tournament_year}</p>
                      </div>
                      <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, color: 'var(--electric)', fontSize: '1.1rem' }}>
                        {entry.distance_feet}'{entry.distance_inches}"
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Tournament History</h2>
          <p style={{ color: 'var(--text-muted)' }}>Past tournament records will appear here after the first event. Check back after the {CURRENT_YEAR} High Country Classic!</p>
        </div>
      )}
    </div>
  )
}
