'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR, HOLES, PAR } from '@/lib/constants'
import type { Score } from '@/lib/types'

const GOLD = '#c9a84c'
const MUTED = '#8b7d6b'
const CREAM = '#f0e6cc'
const BG = '#0d0f0a'
const CARD = '#111a0f'
const CARD_MID = '#162012'
const BORDER = '#3d3220'

const FRONT = HOLES.slice(0, 9)
const BACK  = HOLES.slice(9)

function scoreCellStyle(strokes: number, par: number): React.CSSProperties {
  if (!strokes) return { background: 'rgba(61,50,32,0.2)', color: MUTED }
  if (strokes < par)  return { background: 'rgba(201,168,76,0.18)', color: GOLD, fontWeight: 700 }
  if (strokes === par) return { background: 'rgba(240,230,204,0.06)', color: CREAM }
  return { background: 'rgba(255,107,107,0.12)', color: '#ff8f8f' }
}

const th: React.CSSProperties = {
  padding: '0.4rem 0.5rem', fontSize: '0.7rem', fontWeight: 700,
  letterSpacing: '0.06em', color: MUTED, background: BG,
  border: `1px solid ${BORDER}`, textAlign: 'left', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '0.4rem 0.5rem', fontSize: '0.78rem', border: `1px solid ${BORDER}`,
  textAlign: 'center', whiteSpace: 'nowrap',
}
const labelCell: React.CSSProperties = { ...td, textAlign: 'left', fontWeight: 700, color: MUTED, background: BG, fontSize: '0.7rem', letterSpacing: '0.05em' }
const totalCell: React.CSSProperties = { ...td, fontWeight: 700, color: GOLD, background: 'rgba(201,168,76,0.06)', minWidth: '2.5rem' }

export default function ScorecardPage() {
  const [userId, setUserId] = useState('')
  const [myTeam, setMyTeam] = useState<any>(null)
  const [scores, setScores] = useState<Score[]>([])
  const [editing, setEditing] = useState<{ [hole: number]: string }>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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

  useEffect(() => {
    load()
    const sub = supabase.channel('my-scores').on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, load).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

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
      const strokesNum = parseInt(strokes)
      if (existing) {
        const { error } = await supabase.from('scores').update({ strokes: strokesNum }).eq('id', existing.id)
        if (error) hasError = true
      } else {
        const { error } = await supabase.from('scores').insert({ team_id: myTeam.id, hole_number: holeNum, strokes: strokesNum, entered_by: userId })
        if (error) hasError = true
      }
    }
    setMessage(hasError ? 'Some scores failed to save. Please try again.' : 'Scores saved!')
    setTimeout(() => setMessage(''), 3000)
    setSaving(false)
    load()
  }

  const getStrokes = (holeNum: number) => parseInt(editing[holeNum]) || 0
  const frontTotal = FRONT.reduce((s, h) => s + getStrokes(h.number), 0)
  const backTotal  = BACK.reduce((s, h)  => s + getStrokes(h.number), 0)
  const grandTotal = frontTotal + backTotal
  const frontPar   = FRONT.reduce((s, h) => s + h.par, 0)
  const backPar    = BACK.reduce((s, h)  => s + h.par, 0)

  const overUnder = grandTotal - PAR
  const overUnderStr = grandTotal === 0 ? '—' : overUnder === 0 ? 'E' : overUnder > 0 ? `+${overUnder}` : `${overUnder}`
  const overUnderColor = grandTotal === 0 ? MUTED : overUnder < 0 ? GOLD : overUnder === 0 ? CREAM : '#ff8f8f'

  const teamLabel = myTeam ? myTeam.name.toUpperCase() : 'YOUR TEAM'
  const canEdit = !!myTeam

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', color: GOLD, marginBottom: '0.25rem' }}>Scorecard</h1>
          <p style={{ color: MUTED, fontSize: '0.9rem' }}>Apple Mountain Golf Resort · Par {PAR}</p>
        </div>
        {myTeam && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {message && (
              <span style={{ fontSize: '0.85rem', color: message.includes('failed') ? '#ff8f8f' : GOLD }}>
                {message}
              </span>
            )}
            <button onClick={handleSave} className="btn-electric" disabled={saving}>
              {saving ? 'Saving...' : 'Save Scores'}
            </button>
          </div>
        )}
      </div>

      {!myTeam && (
        <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid rgba(201,168,76,0.2)`, borderRadius: '1rem', padding: '0.875rem 1.25rem', fontSize: '0.85rem', color: MUTED }}>
          You're not on a team yet — scores are view-only until the admin assigns teams.
        </div>
      )}

      {/* Front 9 */}
      <ScorecardTable
        label="FRONT 9"
        holes={FRONT}
        parTotal={frontPar}
        strokeTotal={frontTotal}
        totalLabel="OUT"
        editing={editing}
        setEditing={setEditing}
        teamLabel={teamLabel}
        canEdit={canEdit}
      />

      {/* Back 9 */}
      <ScorecardTable
        label="BACK 9"
        holes={BACK}
        parTotal={backPar}
        strokeTotal={backTotal}
        totalLabel="IN"
        editing={editing}
        setEditing={setEditing}
        teamLabel={teamLabel}
        canEdit={canEdit}
      />

      {/* Totals card */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '1.5rem', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
          <Stat label="OUT" value={frontTotal || '—'} />
          <Stat label="IN" value={backTotal || '—'} />
          <Stat label="TOTAL" value={grandTotal || '—'} large />
          <Stat label="PAR" value={PAR} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: MUTED, letterSpacing: '0.08em', marginBottom: '0.25rem' }}>TO PAR</p>
          <p style={{ fontSize: '2.75rem', fontWeight: 700, color: overUnderColor, lineHeight: 1 }}>{overUnderStr}</p>
        </div>
      </div>

    </div>
  )
}

function ScorecardTable({
  label, holes, parTotal, strokeTotal, totalLabel, editing, setEditing, teamLabel, canEdit
}: {
  label: string
  holes: typeof HOLES
  parTotal: number
  strokeTotal: number
  totalLabel: string
  editing: { [hole: number]: string }
  setEditing: React.Dispatch<React.SetStateAction<{ [hole: number]: string }>>
  teamLabel: string
  canEdit: boolean
}) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '1.5rem', overflow: 'hidden' }}>
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: MUTED }}>{label}</span>
        <span style={{ fontSize: '0.72rem', color: BORDER }}>·</span>
        <span style={{ fontSize: '0.72rem', color: MUTED }}>Apple Mountain Golf Resort</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '600px' }}>
          <tbody>

            {/* HOLE row */}
            <tr>
              <td style={{ ...labelCell, background: BG }}>HOLE</td>
              {holes.map(h => (
                <td key={h.number} style={{ ...td, background: BG, color: CREAM, fontWeight: 700, fontSize: '0.8rem' }}>
                  {h.number}
                </td>
              ))}
              <td style={{ ...totalCell }}>{totalLabel}</td>
            </tr>

            {/* NAME row */}
            <tr>
              <td style={{ ...labelCell }}>NAME</td>
              {holes.map(h => (
                <td key={h.number} style={{ ...td, background: CARD_MID, color: MUTED, fontSize: '0.68rem', maxWidth: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.name}
                </td>
              ))}
              <td style={{ ...td, background: CARD_MID, color: MUTED, fontSize: '0.68rem' }}></td>
            </tr>

            {/* YARDS row */}
            <tr>
              <td style={{ ...labelCell }}>YARDS</td>
              {holes.map(h => (
                <td key={h.number} style={{ ...td, background: CARD, color: MUTED, fontSize: '0.7rem' }}>
                  {h.yards}
                </td>
              ))}
              <td style={{ ...td, background: CARD, color: MUTED, fontSize: '0.7rem' }}></td>
            </tr>

            {/* HCP row */}
            <tr>
              <td style={{ ...labelCell }}>HCP</td>
              {holes.map(h => (
                <td key={h.number} style={{ ...td, background: CARD_MID, color: MUTED, fontSize: '0.72rem' }}>
                  {h.handicap}
                </td>
              ))}
              <td style={{ ...td, background: CARD_MID, color: MUTED, fontSize: '0.72rem' }}></td>
            </tr>

            {/* PAR row */}
            <tr>
              <td style={{ ...labelCell, color: GOLD }}>PAR</td>
              {holes.map(h => (
                <td key={h.number} style={{ ...td, background: BG, color: GOLD, fontWeight: 700, fontSize: '0.8rem' }}>
                  {h.par}
                </td>
              ))}
              <td style={{ ...totalCell }}>{parTotal}</td>
            </tr>

            {/* SCORE row */}
            <tr>
              <td style={{ ...labelCell, color: canEdit ? CREAM : MUTED, background: CARD_MID, fontSize: '0.68rem', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {teamLabel}
              </td>
              {holes.map(h => {
                const val = editing[h.number] || ''
                const strokes = parseInt(val) || 0
                const cellStyle = scoreCellStyle(strokes, h.par)
                return (
                  <td key={h.number} style={{ ...td, background: CARD_MID, padding: '0.25rem' }}>
                    {canEdit ? (
                      <input
                        type="number" min="1" max="20"
                        value={val}
                        onChange={e => setEditing(prev => ({ ...prev, [h.number]: e.target.value }))}
                        style={{
                          width: '100%', minWidth: '2rem', textAlign: 'center',
                          padding: '0.35rem 0.2rem', borderRadius: '0.4rem',
                          border: `1px solid ${val ? 'rgba(201,168,76,0.3)' : BORDER}`,
                          fontSize: '0.85rem', fontWeight: 700, outline: 'none',
                          transition: 'all 0.15s', MozAppearance: 'textfield',
                          ...cellStyle,
                        }}
                        placeholder="—"
                      />
                    ) : (
                      <span style={{ display: 'block', padding: '0.35rem', fontSize: '0.85rem', color: MUTED }}>—</span>
                    )}
                  </td>
                )
              })}
              <td style={{ ...totalCell, background: CARD_MID }}>
                {strokeTotal > 0 ? strokeTotal : '—'}
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value, large }: { label: string; value: number | string; large?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: MUTED, letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{label}</p>
      <p style={{ fontSize: large ? '2.25rem' : '1.4rem', fontWeight: 700, color: CREAM, lineHeight: 1 }}>{value}</p>
    </div>
  )
}
