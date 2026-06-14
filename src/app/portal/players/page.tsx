'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR } from '@/lib/constants'
import { displayName } from '@/lib/utils'
import Link from 'next/link'

export default function PlayersPage() {
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'name' | 'handicap'>('name')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('tournament_registrations')
        .select('player_id, profiles(id, full_name, nickname, avatar_url, handicap, home_course, bio)')
        .eq('tournament_year', CURRENT_YEAR)
      const list = (data || []).map((r: any) => r.profiles).filter(Boolean)
      setPlayers(list)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let result = q
      ? players.filter(p =>
          (p.full_name || '').toLowerCase().includes(q) ||
          (p.nickname || '').toLowerCase().includes(q) ||
          (p.home_course || '').toLowerCase().includes(q)
        )
      : [...players]
    if (sort === 'name') result.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
    if (sort === 'handicap') result.sort((a, b) => {
      if (a.handicap == null && b.handicap == null) return 0
      if (a.handicap == null) return 1
      if (b.handicap == null) return -1
      return a.handicap - b.handicap
    })
    return result
  }, [players, search, sort])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--electric)', marginBottom: '0.5rem' }}>👥 Players</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {loading ? 'Loading...' : `${players.length} registered for the ${CURRENT_YEAR} High Country Classic`}
        </p>
      </div>

      {/* Search + sort */}
      {!loading && players.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
            <input
              className="input"
              type="text"
              placeholder="Search by name or home course..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.375rem' }}>
            {([['name', 'A–Z'], ['handicap', 'By HCP']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setSort(key)} style={{
                padding: '0.55rem 1rem', borderRadius: '0.875rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                background: sort === key ? 'rgba(201,168,76,0.15)' : 'var(--card)',
                color: sort === key ? 'var(--gold)' : 'var(--text-muted)',
                border: `1px solid ${sort === key ? 'rgba(201,168,76,0.35)' : 'var(--border)'}`,
              }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 1rem', opacity: 0.4 + i * 0.1 }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '999px', background: 'var(--card-mid)' }} />
              <div style={{ height: '14px', width: '70%', borderRadius: '8px', background: 'var(--card-mid)' }} />
              <div style={{ height: '10px', width: '50%', borderRadius: '8px', background: 'var(--card-mid)' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {search ? `No players match "${search}"` : 'No players registered yet.'}
          </p>
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>Clear search</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {filtered.map((p: any) => (
            <Link key={p.id} href={`/portal/players/${p.id}`} style={{ textDecoration: 'none' }}>
              <div
                className="card"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.5rem 1rem', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.15s', height: '100%' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(201,168,76,0.45)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'none' }}
              >
                <div style={{ width: '72px', height: '72px', borderRadius: '999px', overflow: 'hidden', flexShrink: 0, background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 700, color: '#0d0f0a', border: '2px solid rgba(201,168,76,0.3)' }}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (p.full_name?.charAt(0) || '?')}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cream)', marginBottom: '0.15rem', lineHeight: 1.2 }}>{displayName(p)}</p>
                  {p.nickname && p.full_name && p.nickname !== p.full_name && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.full_name}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {p.handicap != null && (
                    <span className="badge-electric" style={{ fontSize: '0.72rem' }}>HCP {p.handicap}</span>
                  )}
                </div>
                {p.home_course && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>⛳</span> {p.home_course}
                  </p>
                )}
                {p.bio && (
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
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
