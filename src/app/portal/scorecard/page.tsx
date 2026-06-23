'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR, HOLES, PAR } from '@/lib/constants'
import type { Score } from '@/lib/types'
import { useRequireAuth } from '@/lib/auth-hooks'

const FRONT = HOLES.slice(0, 9)
const BACK  = HOLES.slice(9)

function scoreCellStyle(strokes: number, par: number): React.CSSProperties {
  if (!strokes) return { background: 'rgba(90,74,50,0.25)', color: 'var(--text-muted)' }
  if (strokes < par)  return { background: 'rgba(201,168,76,0.22)', color: 'var(--gold)', fontWeight: 700 }
  if (strokes === par) return { background: 'rgba(240,230,204,0.07)', color: 'var(--cream)' }
  return { background: 'rgba(255,107,107,0.14)', color: '#ff8f8f' }
}

const th: React.CSSProperties = {
  padding: '0.4rem 0.5rem', fontSize: '0.7rem', fontWeight: 700,
  letterSpacing: '0.06em', color: 'var(--text-muted)', background: 'var(--bg)',
  border: '1px solid var(--border)', textAlign: 'left', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '0.4rem 0.5rem', fontSize: '0.78rem', border: '1px solid var(--border)',
  textAlign: 'center', whiteSpace: 'nowrap',
}
const labelCell: React.CSSProperties = { ...td, textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg)', fontSize: '0.7rem', letterSpacing: '0.05em' }
const totalCell: React.CSSProperties = { ...td, fontWeight: 700, color: 'var(--gold)', background: 'rgba(201,168,76,0.06)', minWidth: '2.5rem' }

const TAB_ACTIVE: React.CSSProperties = {
  padding: '0.5rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.82rem', fontWeight: 700,
  letterSpacing: '0.05em', cursor: 'pointer', border: '1px solid rgba(201,168,76,0.35)',
  background: 'rgba(201,168,76,0.12)', color: 'var(--gold)', transition: 'all 0.15s',
}
const TAB_IDLE: React.CSSProperties = {
  padding: '0.5rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.82rem', fontWeight: 700,
  letterSpacing: '0.05em', cursor: 'pointer', border: '1px solid transparent',
  background: 'transparent', color: 'var(--text-muted)', transition: 'all 0.15s',
}

export default function ScorecardPage() {
  const { ready } = useRequireAuth()
  const [userId, setUserId] = useState('')
  const [myTeam, setMyTeam] = useState<any>(null)
  const [scores, setScores] = useState<Score[]>([])
  const [editing, setEditing] = useState<{ [hole: number]: string }>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [flash, setFlash] = useState<number | null>(null)
  const [birdieFlash, setBirdieFlash] = useState<number | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const [view, setView] = useState<'team' | 'tournament'>('team')
  const [allTeams, setAllTeams] = useState<any[]>([])
  const [allScores, setAllScores] = useState<Score[]>([])
  const [loadingTournament, setLoadingTournament] = useState(false)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)
    const { data: member } = await supabase.from('team_members').select('team_id, teams(*)').eq('player_id', session.user.id).maybeSingle()
    if (member?.teams) {
      const team = member.teams as any
      if (team.tournament_year === CURRENT_YEAR) {
        setMyTeam(team)
        const { data: sc } = await supabase.from('scores').select('*').eq('team_id', team.id)
        setScores(sc || [])
        const editMap: { [hole: number]: string } = {}
        sc?.forEach((s: Score) => { editMap[s.hole_number] = s.strokes.toString() })
        setEditing(editMap)
      }
    }
  }

  const loadTournament = async () => {
    setLoadingTournament(true)
    const { data: teamsData } = await supabase
      .from('teams').select('id, name').eq('tournament_year', CURRENT_YEAR).order('name')
    const teamIds = (teamsData || []).map((t: any) => t.id)
    const { data: scoresData } = teamIds.length
      ? await supabase.from('scores').select('*').in('team_id', teamIds)
      : { data: [] }
    setAllTeams(teamsData || [])
    setAllScores((scoresData as Score[]) || [])
    setLoadingTournament(false)
  }

  useEffect(() => {
    if (!ready) return
    load()
    const sub = supabase.channel('my-scores').on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, load).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [ready])

  useEffect(() => {
    if (ready && view === 'tournament') loadTournament()
  }, [ready, view])

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleSave = async () => {
    if (!myTeam) return
    setSaving(true)
    let hasError = false
    for (const [hole, strokes] of Object.entries(editing)) {
      const holeNum = parseInt(hole)
      const existing = scores.find(s => s.hole_number === holeNum)
      if (!strokes) {
        if (existing) {
          const { error } = await supabase.from('scores').delete().eq('id', existing.id)
          if (error) hasError = true
        }
        continue
      }
      const { error } = await supabase.from('scores').upsert(
        { team_id: myTeam.id, hole_number: holeNum, strokes: parseInt(strokes), entered_by: userId },
        { onConflict: 'team_id,hole_number' }
      )
      if (error) hasError = true
    }
    setMessage(hasError ? 'Some scores failed to save.' : 'Scores saved!')
    setTimeout(() => setMessage(''), 3000)
    setIsDirty(false)
    setSaving(false)
    load()
  }

  const getStrokes = (holeNum: number) => parseInt(editing[holeNum]) || 0
  const frontTotal = FRONT.reduce((s, h) => s + getStrokes(h.number), 0)
  const backTotal  = BACK.reduce((s, h)  => s + getStrokes(h.number), 0)
  const grandTotal = frontTotal + backTotal
  const frontPar   = FRONT.reduce((s, h) => s + h.par, 0)
  const backPar    = BACK.reduce((s, h)  => s + h.par, 0)

  const holesEntered = HOLES.filter(h => !!editing[h.number]).length
  const overUnder = grandTotal - PAR
  const overUnderStr = grandTotal === 0 ? '—' : overUnder === 0 ? 'E' : overUnder > 0 ? `+${overUnder}` : `${overUnder}`
  const overUnderColor = grandTotal === 0 ? 'var(--text-muted)' : overUnder < 0 ? 'var(--gold)' : overUnder === 0 ? 'var(--cream)' : '#ff8f8f'

  const teamLabel = myTeam ? myTeam.name.toUpperCase() : 'YOUR TEAM'
  const isLocked = !!myTeam?.is_locked
  const canEdit = !!myTeam && !isLocked
  const progressPct = (holesEntered / 18) * 100

  // Build tournament scorecard rows
  const tournamentRows = allTeams.map(team => {
    const teamScores = allScores.filter(s => s.team_id === team.id)
    const holeMap: Record<number, number> = {}
    teamScores.forEach(s => { holeMap[s.hole_number] = s.strokes })
    const total = Object.values(holeMap).reduce((a, b) => a + b, 0)
    return { team, holeMap, total, holesPlayed: Object.keys(holeMap).length }
  }).sort((a, b) => {
    if (a.total === 0 && b.total === 0) return 0
    if (a.total === 0) return 1
    if (b.total === 0) return -1
    return a.total - b.total
  })

  if (!ready) return null

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <style>{`
        @keyframes flashGold { 0%{opacity:1} 50%{opacity:0.4} 100%{opacity:1} }
        .flash-cell { animation: flashGold 0.4s ease }
        .birdie-cell { animation: burst 0.5s ease forwards }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.25rem' }}>Scorecard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Apple Mountain Golf Resort · Par {PAR}</p>
        </div>
        {view === 'team' && myTeam && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {message && (
              <span style={{ fontSize: '0.85rem', color: message.includes('failed') ? '#ff8f8f' : 'var(--gold)' }}>
                {message}
              </span>
            )}
            {canEdit && (
              <button onClick={handleSave} className="btn-electric" disabled={saving}>
                {saving ? 'Saving...' : 'Save Scores'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.375rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.875rem', padding: '0.3rem' }}>
        <button onClick={() => setView('team')} style={view === 'team' ? TAB_ACTIVE : TAB_IDLE}>
          Team Scorecard
        </button>
        <button onClick={() => setView('tournament')} style={view === 'tournament' ? TAB_ACTIVE : TAB_IDLE}>
          Tournament Scorecard
        </button>
      </div>

      {/* ── TEAM SCORECARD ── */}
      {view === 'team' && (
        <>
          {/* Progress bar */}
          {myTeam && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  {teamLabel}
                </span>
                <span style={{ fontSize: '0.8rem', color: holesEntered === 18 ? 'var(--gold)' : 'var(--text-muted)', fontWeight: 700 }}>
                  {holesEntered}/18 holes {holesEntered === 18 ? '✓' : ''}
                </span>
              </div>
              <div style={{ height: '6px', background: 'var(--navy-light)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: holesEntered === 18 ? 'var(--gold)' : 'var(--green-live)', borderRadius: '999px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}

          {!myTeam && (
            <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '1rem', padding: '0.875rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              You're not on a team yet — scores are view-only until the admin assigns teams.
            </div>
          )}

          {isLocked && (
            <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: '1rem', padding: '0.875rem 1.25rem', fontSize: '0.85rem', color: '#ff8f8f', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔒 Scoring is locked — scores cannot be edited.
            </div>
          )}

          {isDirty && canEdit && (
            <div style={{ position: 'sticky', top: '68px', zIndex: 10, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '1rem', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--gold)', fontWeight: 700 }}>⚠ Unsaved changes</span>
              <button onClick={handleSave} disabled={saving} style={{ padding: '0.35rem 0.875rem', borderRadius: '0.625rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: 'var(--gold)', color: '#0d0f0a', border: 'none' }}>Save Now</button>
            </div>
          )}

          <ScorecardTable
            label="FRONT 9" holes={FRONT} parTotal={frontPar} strokeTotal={frontTotal} totalLabel="OUT"
            editing={editing} setEditing={setEditing} markDirty={() => setIsDirty(true)}
            teamLabel={teamLabel} canEdit={canEdit}
            flash={flash} setFlash={setFlash} birdieFlash={birdieFlash} setBirdieFlash={setBirdieFlash}
          />

          <ScorecardTable
            label="BACK 9" holes={BACK} parTotal={backPar} strokeTotal={backTotal} totalLabel="IN"
            editing={editing} setEditing={setEditing} markDirty={() => setIsDirty(true)}
            teamLabel={teamLabel} canEdit={canEdit}
            flash={flash} setFlash={setFlash} birdieFlash={birdieFlash} setBirdieFlash={setBirdieFlash}
          />

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.5rem', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
              <Stat label="OUT" value={frontTotal || '—'} />
              <Stat label="IN" value={backTotal || '—'} />
              <Stat label="TOTAL" value={grandTotal || '—'} large />
              <Stat label="PAR" value={PAR} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>TO PAR</p>
              <p style={{ fontSize: '2.75rem', fontWeight: 700, color: overUnderColor, lineHeight: 1 }}>{overUnderStr}</p>
            </div>
          </div>
        </>
      )}

      {/* ── TOURNAMENT SCORECARD ── */}
      {view === 'tournament' && (
        <>
          {loadingTournament ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading…</div>
          ) : allTeams.length === 0 ? (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.5rem', padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏌️</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No teams yet — check back once the admin creates teams.</p>
            </div>
          ) : (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.5rem', overflowX: 'auto' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                  ALL TEAMS · {allTeams.length} TEAMS
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sorted by total score (low to high)</span>
              </div>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th style={{ ...th, minWidth: '130px', position: 'sticky', left: 0, zIndex: 1 }}>#  TEAM</th>
                    {HOLES.map(h => (
                      <th key={h.number} style={{ ...th, textAlign: 'center', minWidth: '2.25rem', padding: '0.4rem 0.25rem' }}>
                        {h.number}
                      </th>
                    ))}
                    <th style={{ ...th, textAlign: 'center', background: 'rgba(201,168,76,0.08)', color: 'var(--gold)', minWidth: '3rem' }}>TOT</th>
                  </tr>
                  <tr>
                    <td style={{ ...labelCell, position: 'sticky', left: 0, zIndex: 1 }}>PAR</td>
                    {HOLES.map(h => (
                      <td key={h.number} style={{ ...td, color: 'var(--gold)', fontWeight: 700, fontSize: '0.75rem', padding: '0.3rem 0.25rem', background: 'var(--bg)' }}>
                        {h.par}
                      </td>
                    ))}
                    <td style={{ ...totalCell, fontSize: '0.75rem' }}>{PAR}</td>
                  </tr>
                </thead>
                <tbody>
                  {tournamentRows.map((row, idx) => {
                    const rowTotal = row.total
                    const overUnder = rowTotal > 0 ? rowTotal - PAR : null
                    const ouStr = overUnder === null ? '—' : overUnder === 0 ? 'E' : overUnder > 0 ? `+${overUnder}` : `${overUnder}`
                    const ouColor = overUnder === null ? 'var(--text-muted)' : overUnder < 0 ? 'var(--gold)' : overUnder === 0 ? 'var(--cream)' : '#ff8f8f'
                    const isMyTeam = row.team.id === myTeam?.id
                    return (
                      <tr key={row.team.id} style={{ background: isMyTeam ? 'rgba(201,168,76,0.04)' : 'transparent' }}>
                        <td style={{
                          ...td, textAlign: 'left', fontWeight: 700, fontSize: '0.78rem',
                          color: isMyTeam ? 'var(--gold)' : 'var(--cream)',
                          background: isMyTeam ? 'rgba(201,168,76,0.08)' : 'var(--card-mid)',
                          position: 'sticky', left: 0, zIndex: 1,
                          borderLeft: isMyTeam ? '2px solid rgba(201,168,76,0.4)' : '1px solid var(--border)',
                          maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginRight: '0.4rem', fontSize: '0.68rem' }}>
                            {rowTotal > 0 ? idx + 1 : '—'}
                          </span>
                          {row.team.name}
                        </td>
                        {HOLES.map(h => {
                          const strokes = row.holeMap[h.number] || 0
                          const style = scoreCellStyle(strokes, h.par)
                          return (
                            <td key={h.number} style={{ ...td, ...style, fontSize: '0.8rem', fontWeight: strokes ? 700 : 400, padding: '0.35rem 0.2rem' }}>
                              {strokes || '—'}
                            </td>
                          )
                        })}
                        <td style={{ ...td, fontWeight: 700, fontSize: '0.85rem', color: ouColor, background: 'rgba(201,168,76,0.06)', minWidth: '3rem' }}>
                          {ouStr}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

    </div>
  )
}

function ScorecardTable({
  label, holes, parTotal, strokeTotal, totalLabel, editing, setEditing, markDirty, teamLabel, canEdit, flash, setFlash, birdieFlash, setBirdieFlash
}: {
  label: string
  holes: typeof HOLES
  parTotal: number
  strokeTotal: number
  totalLabel: string
  editing: { [hole: number]: string }
  setEditing: React.Dispatch<React.SetStateAction<{ [hole: number]: string }>>
  markDirty: () => void
  teamLabel: string
  canEdit: boolean
  flash: number | null
  setFlash: (n: number | null) => void
  birdieFlash: number | null
  setBirdieFlash: (n: number | null) => void
}) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1.5rem', overflowX: 'auto', overflowY: 'hidden' }}>
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '600px' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--border)' }}>·</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Apple Mountain Golf Resort</span>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '600px' }}>
        <tbody>
          <tr>
            <td style={{ ...labelCell }}>HOLE</td>
            {holes.map(h => (
              <td key={h.number} style={{ ...td, background: 'var(--bg)', color: 'var(--cream)', fontWeight: 700, fontSize: '0.8rem' }}>
                {h.number}
              </td>
            ))}
            <td style={{ ...totalCell }}>{totalLabel}</td>
          </tr>
          <tr>
            <td style={{ ...labelCell }}>NAME</td>
            {holes.map(h => (
              <td key={h.number} style={{ ...td, background: 'var(--card-mid)', color: 'var(--text-muted)', fontSize: '0.68rem', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {h.name}
              </td>
            ))}
            <td style={{ ...td, background: 'var(--card-mid)', color: 'var(--text-muted)', fontSize: '0.68rem' }}></td>
          </tr>
          <tr>
            <td style={{ ...labelCell }}>YARDS</td>
            {holes.map(h => (
              <td key={h.number} style={{ ...td, background: 'var(--card)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                {h.yards}
              </td>
            ))}
            <td style={{ ...td, background: 'var(--card)', color: 'var(--text-muted)', fontSize: '0.7rem' }}></td>
          </tr>
          <tr>
            <td style={{ ...labelCell }}>HCP</td>
            {holes.map(h => (
              <td key={h.number} style={{ ...td, background: 'var(--card-mid)', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                {h.handicap}
              </td>
            ))}
            <td style={{ ...td, background: 'var(--card-mid)', color: 'var(--text-muted)', fontSize: '0.72rem' }}></td>
          </tr>
          <tr>
            <td style={{ ...labelCell, color: 'var(--gold)' }}>PAR</td>
            {holes.map(h => (
              <td key={h.number} style={{ ...td, background: 'var(--bg)', color: 'var(--gold)', fontWeight: 700, fontSize: '0.8rem' }}>
                {h.par}
              </td>
            ))}
            <td style={{ ...totalCell }}>{parTotal}</td>
          </tr>
          <tr>
            <td style={{ ...labelCell, color: canEdit ? 'var(--cream)' : 'var(--text-muted)', background: 'var(--card-mid)', fontSize: '0.66rem', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {teamLabel}
            </td>
            {holes.map(h => {
              const val = editing[h.number] || ''
              const strokes = parseInt(val) || 0
              const cellStyle = scoreCellStyle(strokes, h.par)
              const isFlashing = flash === h.number
              const isBirdie = birdieFlash === h.number
              return (
                <td key={h.number} style={{ ...td, background: 'var(--card-mid)', padding: '0.25rem' }}>
                  {canEdit ? (
                    <input
                      id={`hole-${h.number}`}
                      type="number" min="1" max="15"
                      inputMode="numeric"
                      value={val}
                      className={isBirdie ? 'birdie-cell' : isFlashing ? 'flash-cell' : ''}
                      onChange={e => {
                        const v = e.target.value
                        setEditing(prev => ({ ...prev, [h.number]: v }))
                        markDirty()
                        const n = parseInt(v)
                        if (n >= 1 && n <= 15) {
                          if (n < h.par) {
                            setBirdieFlash(h.number)
                            setTimeout(() => setBirdieFlash(null), 600)
                          } else {
                            setFlash(h.number)
                            setTimeout(() => setFlash(null), 400)
                          }
                          const next = document.getElementById(`hole-${h.number + 1}`)
                          if (next) (next as HTMLInputElement).focus()
                        }
                      }}
                      style={{
                        width: '100%', minWidth: '2rem', textAlign: 'center',
                        padding: '0.35rem 0.2rem', borderRadius: '0.4rem',
                        border: val && (parseInt(val) < 1 || parseInt(val) > 15) ? '2px solid rgba(255,107,107,0.6)' : `1px solid ${val ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`,
                        fontSize: '0.85rem', fontWeight: 700, outline: 'none',
                        transition: 'all 0.15s', fontFamily: 'inherit',
                        ...cellStyle,
                      }}
                      placeholder="—"
                    />
                  ) : (
                    <span style={{ display: 'block', padding: '0.35rem', fontSize: '0.85rem', ...cellStyle, borderRadius: '0.4rem' }}>
                      {val || '—'}
                    </span>
                  )}
                </td>
              )
            })}
            <td style={{ ...totalCell, background: 'var(--card-mid)' }}>
              {strokeTotal > 0 ? strokeTotal : '—'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Stat({ label, value, large }: { label: string; value: number | string; large?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{label}</p>
      <p style={{ fontSize: large ? '2.25rem' : '1.4rem', fontWeight: 700, color: 'var(--cream)', lineHeight: 1 }}>{value}</p>
    </div>
  )
}
