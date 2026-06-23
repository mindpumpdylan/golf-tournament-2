'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR } from '@/lib/constants'
import { displayName } from '@/lib/utils'
import { useRequireAuth } from '@/lib/auth-hooks'
import Link from 'next/link'

export default function PlayerProfilePage() {
  const { ready } = useRequireAuth()
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [myId, setMyId] = useState('')
  const [pairingStatus, setPairingStatus] = useState<'none' | 'sent' | 'received' | 'accepted' | 'declined'>('none')
  const [pairingRequestId, setPairingRequestId] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [responding, setResponding] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const uid = session.user.id
    setMyId(uid)

    const { data: prof } = await supabase
      .from('profiles')
      .select('id, full_name, nickname, avatar_url, handicap, ghin_number, home_course, bio, years_playing, shirt_size')
      .eq('id', id)
      .single()
    setPlayer(prof)

    const { data: ph } = await supabase
      .from('media_posts')
      .select('id, cloudinary_url, media_type, caption, hole_number')
      .eq('user_id', id)
      .eq('tournament_year', CURRENT_YEAR)
      .eq('media_type', 'photo')
      .order('created_at', { ascending: false })
      .limit(6)
    setPhotos(ph || [])

    // Check existing pairing request between these two players
    const { data: sent } = await supabase
      .from('pairing_requests')
      .select('id, status')
      .eq('requester_id', uid)
      .eq('target_id', id)
      .eq('tournament_year', CURRENT_YEAR)
      .maybeSingle()

    const { data: received } = await supabase
      .from('pairing_requests')
      .select('id, status')
      .eq('requester_id', id)
      .eq('target_id', uid)
      .eq('tournament_year', CURRENT_YEAR)
      .maybeSingle()

    if (sent) {
      setPairingRequestId(sent.id)
      setPairingStatus(sent.status === 'accepted' ? 'accepted' : sent.status === 'declined' ? 'declined' : 'sent')
    } else if (received) {
      setPairingRequestId(received.id)
      setPairingStatus(received.status === 'accepted' ? 'accepted' : received.status === 'declined' ? 'declined' : 'received')
    } else {
      setPairingStatus('none')
      setPairingRequestId(null)
    }

    setLoading(false)
  }

  useEffect(() => { if (ready) load() }, [ready, id])

  const handleRequest = async () => {
    setRequesting(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/pairing/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ target_id: id }),
    })
    await load()
    setRequesting(false)
  }

  const handleRespond = async (action: 'accept' | 'decline') => {
    if (!pairingRequestId) return
    setResponding(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/pairing/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ request_id: pairingRequestId, action }),
    })
    await load()
    setResponding(false)
  }

  if (!ready) return null
  if (loading) return <p style={{ color: 'var(--text-muted)', padding: '2rem' }}>Loading...</p>
  if (!player) return <p style={{ color: '#ff6b6b', padding: '2rem' }}>Player not found.</p>

  const isSelf = myId === player.id

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <Link href="/portal/players" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
        ← All Players
      </Link>

      {/* Profile card */}
      <div className="card-glow" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ width: '88px', height: '88px', borderRadius: '999px', overflow: 'hidden', flexShrink: 0, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: '#0d0f0a', border: '2px solid rgba(201,168,76,0.35)' }}>
            {player.avatar_url
              ? <img src={player.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (player.full_name?.charAt(0) || '?')}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '2rem', color: 'var(--electric)', marginBottom: '0.2rem' }}>{displayName(player)}</h1>
            {player.nickname && player.full_name && player.nickname !== player.full_name && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{player.full_name}</p>
            )}
            {player.bio && (
              <p style={{ color: 'var(--cream-dim)', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: 1.5 }}>{player.bio}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {player.handicap != null && (
            <div style={{ background: 'var(--card-mid)', border: '1px solid var(--border)', borderRadius: '0.875rem', padding: '0.6rem 1rem', textAlign: 'center', minWidth: '80px' }}>
              <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--electric)', lineHeight: 1 }}>{player.handicap}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', letterSpacing: '0.05em' }}>HANDICAP</p>
            </div>
          )}
          {player.years_playing != null && (
            <div style={{ background: 'var(--card-mid)', border: '1px solid var(--border)', borderRadius: '0.875rem', padding: '0.6rem 1rem', textAlign: 'center', minWidth: '80px' }}>
              <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--electric)', lineHeight: 1 }}>{player.years_playing}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', letterSpacing: '0.05em' }}>YRS PLAYING</p>
            </div>
          )}
          {player.home_course && (
            <div style={{ background: 'var(--card-mid)', border: '1px solid var(--border)', borderRadius: '0.875rem', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>⛳</span>
              <span style={{ fontSize: '0.88rem', color: 'var(--cream-dim)' }}>{player.home_course}</span>
            </div>
          )}
        </div>

        {/* Pairing button — not shown for own profile */}
        {!isSelf && (
          <div>
            {pairingStatus === 'none' && (
              <button onClick={handleRequest} disabled={requesting} className="btn-electric" style={{ alignSelf: 'flex-start' }}>
                {requesting ? 'Sending...' : '⛳ Request to Play Together'}
              </button>
            )}
            {pairingStatus === 'sent' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', borderRadius: '999px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--gold)', fontSize: '0.9rem', fontWeight: 600 }}>
                ⏳ Pairing request sent
              </div>
            )}
            {pairingStatus === 'received' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--cream)', fontSize: '0.9rem', fontWeight: 600 }}>
                  {displayName(player)} wants to play with you!
                </span>
                <button onClick={() => handleRespond('accept')} disabled={responding} className="btn-electric" style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}>
                  Accept
                </button>
                <button onClick={() => handleRespond('decline')} disabled={responding} style={{ padding: '0.55rem 1.1rem', borderRadius: '0.875rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                  Decline
                </button>
              </div>
            )}
            {pairingStatus === 'accepted' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', borderRadius: '999px', background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.25)', color: '#00ff87', fontSize: '0.9rem', fontWeight: 600 }}>
                ✅ Pairing confirmed
              </div>
            )}
            {pairingStatus === 'declined' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', borderRadius: '999px', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', color: '#ff8f8f', fontSize: '0.9rem', fontWeight: 600 }}>
                Request declined
              </div>
            )}
          </div>
        )}
        {isSelf && (
          <Link href="/portal/account" style={{ color: 'var(--gold)', fontSize: '0.88rem', textDecoration: 'none', fontWeight: 600 }}>
            ✏️ Edit my profile →
          </Link>
        )}
      </div>

      {/* Gallery */}
      {photos.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Tournament Photos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {photos.map(photo => (
              <div key={photo.id} style={{ aspectRatio: '1', borderRadius: '0.75rem', overflow: 'hidden' }}>
                <img src={photo.cloudinary_url} alt={photo.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
