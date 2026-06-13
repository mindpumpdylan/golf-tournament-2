'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR } from '@/lib/constants'
import { displayName } from '@/lib/utils'
import Link from 'next/link'

export default function PlayersPage() {
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('tournament_registrations')
        .select('player_id, profiles(id, full_name, nickname, avatar_url, handicap, home_course, bio)')
        .eq('tournament_year', CURRENT_YEAR)
      const list = (data || [])
        .map((r: any) => r.profiles)
        .filter(Boolean)
        .sort((a: any, b: any) => (a.full_name || '').localeCompare(b.full_name || ''))
      setPlayers(list)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--electric)', marginBottom: '0.5rem' }}>👥 Players</h1>
        <p style={{ color: 'var(--text-muted)' }}>{CURRENT_YEAR} High Country Classic — {players.length} registered</p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : players.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No players registered yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {players.map((p: any) => (
            <Link key={p.id} href={`/portal/players/${p.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.5rem 1rem', gap: '0.75rem', cursor: 'pointer', transition: 'border-color 0.15s', borderColor: 'var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ width: '72px', height: '72px', borderRadius: '999px', overflow: 'hidden', flexShrink: 0, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 700, color: '#0d0f0a', border: '2px solid rgba(201,168,76,0.3)' }}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (p.full_name?.charAt(0) || '?')}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cream)', marginBottom: '0.15rem' }}>{displayName(p)}</p>
                  {p.full_name && p.nickname && p.nickname !== p.full_name && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.full_name}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {p.handicap != null && (
                    <span className="badge-electric" style={{ fontSize: '0.75rem' }}>HCP {p.handicap}</span>
                  )}
                  {p.home_course && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⛳ {p.home_course}</span>
                  )}
                </div>
                {p.bio && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, maxWidth: '100%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                    {p.bio}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
