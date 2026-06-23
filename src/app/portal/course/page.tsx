'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { HOLES, CURRENT_YEAR, COURSE_NAME, COURSE_LOCATION, PAR } from '@/lib/constants'
import { displayName } from '@/lib/utils'
import { useSession } from '@/lib/auth-hooks'

const GOLD = 'var(--gold)'
const CREAM = 'var(--cream)'
const MUTED = 'var(--text-muted)'
const CARD: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.5rem', padding: '1.5rem' }

function parBadgeStyle(par: number) {
  if (par === 3) return { background: 'rgba(201,168,76,0.15)', color: GOLD, border: '1px solid rgba(201,168,76,0.35)' }
  if (par === 5) return { background: 'rgba(0,255,135,0.08)', color: 'var(--green-live)', border: '1px solid rgba(0,255,135,0.2)' }
  return { background: 'rgba(240,230,204,0.06)', color: CREAM, border: '1px solid rgba(240,230,204,0.15)' }
}

export default function CoursePage() {
  const { isLoggedIn } = useSession()
  const [ctpLeaders, setCtpLeaders] = useState<Record<number, any>>({})

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('closest_to_pin')
        .select('hole_number, distance_feet, distance_inches, profiles(full_name, nickname)')
        .eq('tournament_year', CURRENT_YEAR)
        .order('distance_feet')
        .order('distance_inches')
      if (data) {
        const leaders: Record<number, any> = {}
        data.forEach((entry: any) => {
          if (!leaders[entry.hole_number]) leaders[entry.hole_number] = entry
        })
        setCtpLeaders(leaders)
      }
    }
    load()
  }, [])

  const maxYards = HOLES.reduce((sum, h) => {
    const max = parseInt((h.yards.split('–')[1] || h.yards).replace(/\D/g, ''))
    return sum + max
  }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2.5rem', color: GOLD, marginBottom: '0.5rem' }}>⛳ Course Guide</h1>
        <p style={{ color: MUTED, marginBottom: '0.75rem' }}>{COURSE_NAME} · {COURSE_LOCATION}</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(201,168,76,0.1)', color: GOLD, border: '1px solid rgba(201,168,76,0.25)', borderRadius: '999px', padding: '0.3rem 0.875rem', fontSize: '0.82rem', fontWeight: 700 }}>Par {PAR}</span>
          <span style={{ background: 'rgba(240,230,204,0.05)', color: CREAM, border: '1px solid rgba(240,230,204,0.12)', borderRadius: '999px', padding: '0.3rem 0.875rem', fontSize: '0.82rem', fontWeight: 600 }}>{maxYards.toLocaleString()} yds (max)</span>
          <span style={{ background: 'rgba(201,168,76,0.06)', color: GOLD, border: '1px solid rgba(201,168,76,0.15)', borderRadius: '999px', padding: '0.3rem 0.875rem', fontSize: '0.82rem', fontWeight: 600 }}>6 Par 3 · 8 Par 4 · 4 Par 5</span>
        </div>
      </div>

      {/* Scorecard summary table */}
      <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em', color: MUTED }}>FULL SCORECARD</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'var(--card-mid)' }}>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'center', color: MUTED, fontWeight: 700, letterSpacing: '0.06em', fontSize: '0.7rem' }}>#</th>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', color: MUTED, fontWeight: 700, letterSpacing: '0.06em', fontSize: '0.7rem' }}>NAME</th>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'center', color: MUTED, fontWeight: 700, letterSpacing: '0.06em', fontSize: '0.7rem' }}>PAR</th>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'center', color: MUTED, fontWeight: 700, letterSpacing: '0.06em', fontSize: '0.7rem' }}>HCP</th>
                <th style={{ padding: '0.6rem 1.25rem', textAlign: 'right', color: MUTED, fontWeight: 700, letterSpacing: '0.06em', fontSize: '0.7rem' }}>YARDS</th>
              </tr>
            </thead>
            <tbody>
              {HOLES.map(hole => (
                <tr key={hole.number} style={{
                  borderTop: hole.number === 10 ? '2px solid var(--border)' : '1px solid rgba(90,74,50,0.25)',
                  background: hole.par === 3 ? 'rgba(201,168,76,0.02)' : 'transparent',
                }}>
                  <td style={{ padding: '0.5rem 1rem', textAlign: 'center', fontWeight: 700, color: CREAM, fontSize: '0.85rem' }}>{hole.number}</td>
                  <td style={{ padding: '0.5rem 1rem', color: CREAM, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {hole.name}
                    {hole.par === 3 && <span style={{ marginLeft: '0.4rem', fontSize: '0.6rem', fontWeight: 700, color: GOLD, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '999px', padding: '0.05rem 0.35rem', letterSpacing: '0.05em', verticalAlign: 'middle' }}>CTP</span>}
                  </td>
                  <td style={{ padding: '0.5rem 1rem', textAlign: 'center' }}>
                    <span style={{ ...parBadgeStyle(hole.par), borderRadius: '999px', padding: '0.12rem 0.45rem', fontWeight: 700, fontSize: '0.75rem', display: 'inline-block' }}>{hole.par}</span>
                  </td>
                  <td style={{ padding: '0.5rem 1rem', textAlign: 'center', color: MUTED, fontSize: '0.78rem' }}>{hole.handicap}</td>
                  <td style={{ padding: '0.5rem 1.25rem', textAlign: 'right', color: MUTED, fontSize: '0.78rem', fontFamily: 'monospace' }}>{hole.yards}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--card-mid)' }}>
                <td colSpan={2} style={{ padding: '0.6rem 1.25rem', fontWeight: 700, color: GOLD, fontSize: '0.78rem', letterSpacing: '0.06em' }}>TOTAL</td>
                <td style={{ padding: '0.6rem', textAlign: 'center', fontWeight: 700, color: GOLD, fontSize: '1rem' }}>{PAR}</td>
                <td></td>
                <td style={{ padding: '0.6rem 1.25rem', textAlign: 'right', fontWeight: 700, color: CREAM, fontSize: '0.85rem' }}>{maxYards.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Hole cards */}
      <div>
        <h2 style={{ fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em', color: MUTED, marginBottom: '1rem' }}>HOLE DETAILS</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {HOLES.map(hole => {
            const ctpLeader = ctpLeaders[hole.number]
            return (
              <div key={hole.number} style={{ ...CARD, position: 'relative', overflow: 'hidden' }}>
                {/* Ghost hole number */}
                <div style={{ position: 'absolute', bottom: '-0.75rem', right: '0.75rem', fontSize: '5.5rem', fontWeight: 900, color: 'rgba(201,168,76,0.04)', lineHeight: 1, fontFamily: 'Georgia, serif', pointerEvents: 'none', userSelect: 'none' }}>
                  {hole.number}
                </div>

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', position: 'relative' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: MUTED, letterSpacing: '0.07em' }}>HOLE {hole.number}</span>
                      {hole.par === 3 && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: GOLD, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '999px', padding: '0.1rem 0.45rem', letterSpacing: '0.05em' }}>CTP</span>
                      )}
                      {hole.par === 5 && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--green-live)', background: 'rgba(0,255,135,0.07)', border: '1px solid rgba(0,255,135,0.18)', borderRadius: '999px', padding: '0.1rem 0.45rem', letterSpacing: '0.05em' }}>PAR 5</span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: CREAM, fontFamily: 'JerseyM54, Georgia, serif', lineHeight: 1.2 }}>{hole.name}</h3>
                  </div>
                  <div style={{ ...parBadgeStyle(hole.par), borderRadius: '1rem', padding: '0.4rem 0.875rem', textAlign: 'center', flexShrink: 0, marginLeft: '0.75rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{hole.par}</div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.07em', opacity: 0.7, marginTop: '0.1rem' }}>PAR</div>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '2rem', position: 'relative', marginBottom: (ctpLeader || hole.par === 3) ? '1rem' : 0 }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: MUTED, fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.2rem' }}>YARDS</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: CREAM, fontFamily: 'monospace' }}>{hole.yards}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: MUTED, fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.2rem' }}>HANDICAP</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: CREAM }}>{hole.handicap}</div>
                  </div>
                </div>

                {/* CTP leader for par 3 holes */}
                {ctpLeader ? (
                  <div style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '0.875rem', padding: '0.625rem 0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem' }}>🎯</span>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: MUTED, fontWeight: 700, letterSpacing: '0.06em', marginBottom: '0.1rem' }}>CLOSEST TO PIN</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: CREAM }}>{isLoggedIn ? displayName(ctpLeader.profiles) : 'A player'}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: GOLD, flexShrink: 0 }}>{ctpLeader.distance_feet}&apos;{ctpLeader.distance_inches}&quot;</div>
                  </div>
                ) : hole.par === 3 ? (
                  <div style={{ background: 'rgba(201,168,76,0.03)', border: '1px dashed rgba(201,168,76,0.15)', borderRadius: '0.875rem', padding: '0.625rem 0.875rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.78rem', color: MUTED }}>🎯 No shots submitted yet</p>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
