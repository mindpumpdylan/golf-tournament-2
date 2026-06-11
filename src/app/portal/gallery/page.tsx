'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR, ALL_HOLES } from '@/lib/constants'
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
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const { data } = await supabase.from('media_posts').select('*, profiles(full_name)').eq('tournament_year', CURRENT_YEAR).order('created_at', { ascending: false })
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

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f))
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
      setMessage('Posted!'); load()
    } else setMessage('Upload failed.')
    setUploading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('media_posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    setConfirmDelete(null)
  }

  const filtered = filter === 'All' ? posts : posts.filter(p => p.hole_number?.toString() === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Gallery</h1>
        <p style={{ color: 'var(--text-muted)' }}>Share your moments from the course</p>
      </div>

      {/* Upload */}
      <div className="card">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Share a Moment</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div onClick={() => fileRef.current?.click()} style={{
            border: `2px dashed ${file ? 'rgba(201,168,76,0.5)' : 'var(--navy-border)'}`,
            borderRadius: '1rem', padding: '2rem', textAlign: 'center', cursor: 'pointer',
            background: file ? 'rgba(201,168,76,0.04)' : 'var(--navy-light)', transition: 'all 0.2s',
          }}>
            {preview ? (
              file?.type.startsWith('video')
                ? <video src={preview} style={{ maxHeight: '200px', borderRadius: '0.75rem', margin: '0 auto' }} controls />
                : <img src={preview} style={{ maxHeight: '200px', borderRadius: '0.75rem', objectFit: 'cover', margin: '0 auto' }} alt="preview" />
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📁</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Click to select photo or video</p>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFile} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>HOLE (optional)</label>
              <select className="input" value={form.hole_number} onChange={e => setForm({ ...form, hole_number: e.target.value })}>
                <option value="">No hole selected</option>
                {ALL_HOLES.map(h => <option key={h} value={h}>Hole {h}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>CAPTION (optional)</label>
              <input className="input" value={form.caption} onChange={e => setForm({ ...form, caption: e.target.value })} placeholder="What a shot!" />
            </div>
          </div>
          {message && <p style={{ color: message.includes('failed') ? '#ff6b6b' : 'var(--gold)', fontSize: '0.9rem' }}>{message}</p>}
          <button onClick={handleUpload} disabled={!file || uploading} className="btn-electric" style={{ alignSelf: 'flex-start' }}>
            {uploading ? 'Uploading...' : 'Post to Gallery →'}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['All', ...ALL_HOLES.map(String)].map(h => (
          <button key={h} onClick={() => setFilter(h)} style={{
            padding: '0.4rem 0.875rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            background: filter === h ? 'var(--gold)' : 'var(--navy-card)',
            color: filter === h ? '#0d0f0a' : 'var(--text-muted)',
            border: `1px solid ${filter === h ? 'var(--gold)' : 'var(--navy-border)'}`,
          }}>{h === 'All' ? 'All Holes' : `Hole ${h}`}</button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '5rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📷</div>
          <p style={{ color: 'var(--text-muted)' }}>No posts yet. Be the first to share!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {filtered.map(post => (
            <div key={post.id} className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
              {post.media_type === 'video'
                ? <video src={post.cloudinary_url} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} controls />
                : <img src={post.cloudinary_url} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} alt={post.caption || ''} />
              }
              {/* Admin delete button */}
              {isAdmin && (
                <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                  {confirmDelete === post.id ? (
                    <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(13,15,10,0.9)', borderRadius: '0.625rem', padding: '0.25rem' }}>
                      <button onClick={() => handleDelete(post.id)} style={{ padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: 'rgba(255,107,107,0.2)', border: '1px solid rgba(255,107,107,0.4)', color: '#ff6b6b' }}>Delete</button>
                      <button onClick={() => setConfirmDelete(null)} style={{ padding: '0.3rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', background: 'transparent', border: '1px solid #3d3220', color: '#8b7d6b' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(post.id)} style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', cursor: 'pointer', background: 'rgba(13,15,10,0.85)', border: '1px solid rgba(255,107,107,0.35)', color: '#ff6b6b', fontWeight: 700 }}>✕</button>
                  )}
                </div>
              )}
              <div style={{ padding: '1rem' }}>
                {post.caption && <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{post.caption}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{post.profiles?.full_name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {post.hole_number && <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)' }}>Hole {post.hole_number}</span>}
                    <a href={post.cloudinary_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--gold)', textDecoration: 'none', fontWeight: 700 }}>⬇ Save</a>
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{format(new Date(post.created_at), 'MMM d, h:mm a')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
