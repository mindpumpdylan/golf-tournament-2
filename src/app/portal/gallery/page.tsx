'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { MediaPost, Profile } from '@/lib/types'
import { format } from 'date-fns'

const CURRENT_YEAR = new Date().getFullYear()
const HOLES = ['All', ...Array.from({length: 18}, (_, i) => (i + 1).toString())]

export default function GalleryPage() {
  const [posts, setPosts] = useState<(MediaPost & { profile: Profile })[]>([])
  const [filter, setFilter] = useState('All')
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ hole_number: '', caption: '' })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    const { data } = await supabase.from('media_posts')
      .select('*, profiles(full_name)')
      .eq('tournament_year', CURRENT_YEAR)
      .order('created_at', { ascending: false })
    setPosts((data || []).map((p: any) => ({...p, profile: p.profiles})))
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id)
    })
    load()
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
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
      setForm({ hole_number: '', caption: '' })
      setFile(null); setPreview('')
      if (fileRef.current) fileRef.current.value = ''
      setMessage('Posted!')
      load()
    } else setMessage('Upload failed. Try again.')
    setUploading(false)
  }

  const filtered = filter === 'All' ? posts : posts.filter(p => p.hole_number?.toString() === filter)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold" style={{color:'var(--green-deep)'}}>📸 Gallery</h1>
        <p className="mt-1" style={{color:'var(--text-mid)'}}>Share your moments from the course</p>
      </div>

      <div className="card">
        <h2 className="font-display font-bold text-lg mb-4" style={{color:'var(--green-deep)'}}>Share a Moment</h2>
        <div className="space-y-3">
          <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
            style={{borderColor: file ? 'var(--green-mid)' : '#d0ccc4', background: file ? '#f0f9f4' : 'var(--gray-soft)'}}
            onClick={() => fileRef.current?.click()}>
            {preview ? (
              file?.type.startsWith('video') ?
                <video src={preview} className="max-h-48 mx-auto rounded-lg" controls /> :
                <img src={preview} className="max-h-48 mx-auto rounded-lg object-cover" alt="preview" />
            ) : (
              <>
                <div className="text-3xl mb-2">📁</div>
                <p className="text-sm" style={{color:'var(--text-mid)'}}>Click to select photo or video</p>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Hole (optional)</label>
              <select value={form.hole_number} onChange={e => setForm({...form, hole_number: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <option value="">Select hole</option>
                {Array.from({length: 18}, (_, i) => i + 1).map(h => <option key={h} value={h}>Hole {h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Caption (optional)</label>
              <input value={form.caption} onChange={e => setForm({...form, caption: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="What a shot!" />
            </div>
          </div>

          {message && <p className="text-sm" style={{color:'var(--green-mid)'}}>{message}</p>}

          <button onClick={handleUpload} disabled={!file || uploading} className="btn-primary">
            {uploading ? 'Uploading...' : 'Post to Gallery'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {HOLES.map(h => (
          <button key={h} onClick={() => setFilter(h)}
            className="px-3 py-1 rounded-full text-sm font-medium transition-colors"
            style={{
              background: filter === h ? 'var(--green-mid)' : 'white',
              color: filter === h ? 'white' : 'var(--text-mid)',
              border: '1px solid #e0ddd6'
            }}>
            {h === 'All' ? 'All Holes' : `Hole ${h}`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">📷</div>
          <p style={{color:'var(--text-mid)'}}>No posts yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(post => (
            <div key={post.id} className="card p-0 overflow-hidden">
              {post.media_type === 'video' ? (
                <video src={post.cloudinary_url} className="w-full aspect-video object-cover" controls />
              ) : (
                <img src={post.cloudinary_url} className="w-full aspect-video object-cover" alt={post.caption || 'Golf photo'} />
              )}
              <div className="p-3">
                {post.caption && <p className="text-sm font-medium mb-1">{post.caption}</p>}
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{color:'var(--text-mid)'}}>{post.profile?.full_name}</p>
                  <div className="flex items-center gap-2">
                    {post.hole_number && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'var(--green-light)', color:'white'}}>
                        Hole {post.hole_number}
                      </span>
                    )}
                    <a href={post.cloudinary_url} download target="_blank" rel="noreferrer"
                      className="text-xs" style={{color:'var(--green-mid)'}}>⬇ Save</a>
                  </div>
                </div>
                <p className="text-xs mt-1" style={{color:'#aaa'}}>{format(new Date(post.created_at), 'MMM d, h:mm a')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}