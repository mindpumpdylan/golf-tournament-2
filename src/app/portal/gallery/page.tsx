'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR, ALL_HOLES } from '@/lib/constants'
import { displayName } from '@/lib/utils'
import { format } from 'date-fns'

export default function GalleryPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [filter, setFilter] = useState('All')
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ hole_number: '', caption: '' })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ idx: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef(false)

  const load = async () => {
    const { data } = await supabase
      .from('media_posts')
      .select('*, profiles(full_name, nickname, avatar_url)')
      .eq('tournament_year', CURRENT_YEAR)
      .order('created_at', { ascending: false })
    setPosts(data || [])
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setUserId(session.user.id)
      const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
      if (prof?.is_admin) setIsAdmin(true)
    })
    load()
  }, [])

  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight') setLightbox(prev => prev && { idx: Math.min(prev.idx + 1, filtered.length - 1) })
      if (e.key === 'ArrowLeft') setLightbox(prev => prev && { idx: Math.max(prev.idx - 1, 0) })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox])

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleUpload = async () => {
    if (!file || !userId) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('hole_number', form.hole_number)
    formData.append('caption', form.caption)
    formData.append('user_id', userId)
    formData.append('media_type', file.type.startsWith('video') ? 'video' : 'photo')
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const json = await res.json()
    if (json.success) {
      setForm({ hole_number: '', caption: '' }); setFile(null); setPreview('')
      if (fileRef.current) fileRef.current.value = ''
      setMessage('Posted! 🎉'); load()
    } else setMessage('Upload failed — try again.')
    setUploading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('media_posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    setConfirmDelete(null)
    if (lightbox) setLightbox(null)
  }

  const filtered = filter === 'All' ? posts : posts.filter(p => p.hole_number?.toString() === filter)
  const holesWithContent = Array.from(new Set(posts.map(p => p.hole_number).filter(Boolean).map(String))).sort((a, b) => parseInt(a) - parseInt(b))

  const lightboxPost = lightbox !== null ? filtered[lightbox.idx] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        .gallery-item { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .gallery-item:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
      `}</style>

      {/* Lightbox */}
      {lightboxPost && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', maxWidth: '900px', maxHeight: '90vh', width: '100%', gap: '0.75rem' }}>
            {/* Nav row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => setLightbox(prev => prev && { idx: Math.max(prev.idx - 1, 0) })}
                disabled={lightbox.idx === 0}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#f0e6cc', cursor: lightbox.idx === 0 ? 'not-allowed' : 'pointer', opacity: lightbox.idx === 0 ? 0.3 : 1, fontSize: '0.9rem', fontWeight: 700 }}>
                ← Prev
              </button>
              <span style={{ fontSize: '0.82rem', color: 'rgba(240,230,204,0.5)' }}>{lightbox.idx + 1} / {filtered.length}</span>
              <button
                onClick={() => setLightbox(prev => prev && { idx: Math.min(prev.idx + 1, filtered.length - 1) })}
                disabled={lightbox.idx === filtered.length - 1}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#f0e6cc', cursor: lightbox.idx === filtered.length - 1 ? 'not-allowed' : 'pointer', opacity: lightbox.idx === filtered.length - 1 ? 0.3 : 1, fontSize: '0.9rem', fontWeight: 700 }}>
                Next →
              </button>
            </div>

            {/* Image */}
            <div style={{ flex: 1, borderRadius: '1rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
              {lightboxPost.media_type === 'video'
                ? <video src={lightboxPost.cloudinary_url} controls style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: '0.75rem' }} />
                : <img src={lightboxPost.cloudinary_url} alt={lightboxPost.caption || ''} style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '0.75rem' }} />
              }
            </div>

            {/* Caption row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '999px', overflow: 'hidden', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#0d0f0a', flexShrink: 0 }}>
                  {lightboxPost.profiles?.avatar_url
                    ? <img src={lightboxPost.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : lightboxPost.profiles?.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  {lightboxPost.caption && <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f0e6cc', marginBottom: '0.1rem' }}>{lightboxPost.caption}</p>}
                  <p style={{ fontSize: '0.78rem', color: 'rgba(240,230,204,0.5)' }}>
                    {displayName(lightboxPost.profiles)} · {format(new Date(lightboxPost.created_at), 'MMM d, h:mm a')}
                    {lightboxPost.hole_number && ` · Hole ${lightboxPost.hole_number}`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a href={lightboxPost.cloudinary_url} target="_blank" rel="noreferrer" style={{ padding: '0.4rem 0.875rem', borderRadius: '0.75rem', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700 }}>
                  ⬇ Save
                </a>
                {isAdmin && (
                  confirmDelete === lightboxPost.id ? (
                    <>
                      <button onClick={() => handleDelete(lightboxPost.id)} style={{ padding: '0.4rem 0.875rem', borderRadius: '0.75rem', background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.4)', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>Confirm Delete</button>
                      <button onClick={() => setConfirmDelete(null)} style={{ padding: '0.4rem 0.875rem', borderRadius: '0.75rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(240,230,204,0.5)', cursor: 'pointer', fontSize: '0.82rem' }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(lightboxPost.id)} style={{ padding: '0.4rem 0.875rem', borderRadius: '0.75rem', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', color: '#ff8f8f', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>✕ Delete</button>
                  )
                )}
                <button onClick={() => setLightbox(null)} style={{ padding: '0.4rem 0.875rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(240,230,204,0.6)', cursor: 'pointer', fontSize: '0.82rem' }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>📷 Gallery</h1>
          <p style={{ color: 'var(--text-muted)' }}>{posts.length} {posts.length === 1 ? 'photo' : 'photos'} from the course</p>
        </div>
      </div>

      {/* Upload */}
      <div className="card">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Share a Moment</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); dragRef.current = true }}
            onDragLeave={() => { dragRef.current = false }}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            style={{
              border: `2px dashed ${file ? 'rgba(201,168,76,0.6)' : 'var(--border)'}`,
              borderRadius: '1rem', padding: '2rem', textAlign: 'center', cursor: 'pointer',
              background: file ? 'rgba(201,168,76,0.04)' : 'var(--card-mid)', transition: 'all 0.2s',
              minHeight: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            }}>
            {preview ? (
              file?.type.startsWith('video')
                ? <video src={preview} style={{ maxHeight: '200px', borderRadius: '0.75rem' }} controls />
                : <img src={preview} style={{ maxHeight: '200px', borderRadius: '0.75rem', objectFit: 'cover' }} alt="preview" />
            ) : (
              <>
                <div style={{ fontSize: '2.5rem' }}>📁</div>
                <div>
                  <p style={{ color: 'var(--cream)', fontSize: '0.92rem', fontWeight: 600, marginBottom: '0.25rem' }}>Click or drag to upload</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Photos and videos supported</p>
                </div>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
          {file && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>HOLE (optional)</label>
                <select className="input" value={form.hole_number} onChange={e => setForm({ ...form, hole_number: e.target.value })}>
                  <option value="">No specific hole</option>
                  {ALL_HOLES.map(h => <option key={h} value={h}>Hole {h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>CAPTION (optional)</label>
                <input className="input" value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })} placeholder="What a shot!" />
              </div>
            </div>
          )}
          {message && <p style={{ color: message.includes('failed') ? '#ff6b6b' : 'var(--gold)', fontSize: '0.9rem' }}>{message}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={handleUpload} disabled={!file || uploading} className="btn-electric" style={{ alignSelf: 'flex-start' }}>
              {uploading ? 'Uploading...' : 'Post to Gallery →'}
            </button>
            {file && (
              <button onClick={() => { setFile(null); setPreview(''); if (fileRef.current) fileRef.current.value = '' }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter — only show holes that have content */}
      {posts.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>FILTER:</span>
          {['All', ...holesWithContent].map(h => (
            <button key={h} onClick={() => setFilter(h)} style={{
              padding: '0.35rem 0.875rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background: filter === h ? 'var(--gold)' : 'var(--card)',
              color: filter === h ? '#0d0f0a' : 'var(--text-muted)',
              border: `1px solid ${filter === h ? 'var(--gold)' : 'var(--border)'}`,
            }}>{h === 'All' ? `All (${posts.length})` : `Hole ${h}`}</button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '5rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📷</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No photos yet</h2>
          <p style={{ color: 'var(--text-muted)' }}>Be the first to share a moment from the course!</p>
        </div>
      ) : (
        <div style={{ columns: 'auto 280px', columnGap: '0.75rem', gap: '0.75rem' }}>
          {filtered.map((post, idx) => (
            <div
              key={post.id}
              className="gallery-item"
              style={{ breakInside: 'avoid', marginBottom: '0.75rem', borderRadius: '1.25rem', overflow: 'hidden', background: 'var(--card)', border: '1px solid var(--border)', cursor: 'pointer' }}
              onClick={() => setLightbox({ idx })}
            >
              {post.media_type === 'video'
                ? <video src={post.cloudinary_url} style={{ width: '100%', display: 'block' }} />
                : <img src={post.cloudinary_url} style={{ width: '100%', display: 'block' }} alt={post.caption || ''} loading="lazy" />
              }
              <div style={{ padding: '0.875rem' }}>
                {post.caption && <p style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.5rem', lineHeight: 1.4 }}>{post.caption}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '999px', overflow: 'hidden', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#0d0f0a', flexShrink: 0 }}>
                      {post.profiles?.avatar_url
                        ? <img src={post.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : post.profiles?.full_name?.charAt(0) || '?'}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName(post.profiles)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    {post.hole_number && (
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)' }}>
                        H{post.hole_number}
                      </span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={e => { e.stopPropagation(); confirmDelete === post.id ? handleDelete(post.id) : setConfirmDelete(post.id) }}
                        style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', cursor: 'pointer', background: confirmDelete === post.id ? 'rgba(255,107,107,0.2)' : 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.3)', color: '#ff6b6b', fontWeight: 700, flexShrink: 0 }}>
                        {confirmDelete === post.id ? '!' : '✕'}
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', opacity: 0.6 }}>
                  {format(new Date(post.created_at), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
