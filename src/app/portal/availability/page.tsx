'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR } from '@/lib/constants'
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay } from 'date-fns'

export default function AvailabilityPage() {
  const [userId, setUserId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tournamentDate, setTournamentDate] = useState<string | null>(null)
  const [settingDate, setSettingDate] = useState(false)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)

    const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
    setIsAdmin(prof?.is_admin || false)

    // My selections
    const { data: myDates } = await supabase
      .from('availability_dates').select('date')
      .eq('user_id', session.user.id).eq('tournament_year', CURRENT_YEAR)
    if (myDates) setSelectedDates(myDates.map((d: any) => {
      const [y, m, day] = d.date.split('-').map(Number)
      return new Date(y, m - 1, day)
    }))

    // All players' votes
    const { data: allDates } = await supabase
      .from('availability_dates').select('date').eq('tournament_year', CURRENT_YEAR)
    if (allDates) {
      const counts: Record<string, number> = {}
      allDates.forEach((d: any) => { counts[d.date] = (counts[d.date] || 0) + 1 })
      setVoteCounts(counts)
    }

    // Total player count for percentages
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
    setTotalPlayers(count || 0)

    // Current tournament date if admin already picked one
    const { data: setting } = await supabase.from('tournament_settings').select('value').eq('key', 'tournament_date').maybeSingle()
    setTournamentDate(setting?.value || null)
  }

  useEffect(() => { load() }, [])

  const toggleDate = (date: Date) => {
    setSelectedDates(prev =>
      prev.some(d => isSameDay(d, date)) ? prev.filter(d => !isSameDay(d, date)) : [...prev, date]
    )
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('availability_dates').delete().eq('user_id', userId)
    if (selectedDates.length > 0) {
      await supabase.from('availability_dates').insert(
        selectedDates.map(d => ({ user_id: userId, date: format(d, 'yyyy-MM-dd'), tournament_year: CURRENT_YEAR }))
      )
    }
    setSaving(false); setSaved(true)
    load()
  }

  const handleSetTournamentDate = async (dateStr: string) => {
    setSettingDate(true)
    if (dateStr) {
      await supabase.from('tournament_settings').upsert({ key: 'tournament_date', value: dateStr })
      setTournamentDate(dateStr)
    } else {
      await supabase.from('tournament_settings').delete().eq('key', 'tournament_date')
      setTournamentDate(null)
    }
    setSettingDate(false)
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startPad = startOfMonth(currentMonth).getDay()

  const sortedVotes = Object.entries(voteCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([date, count]) => ({ date, count }))
  const maxVotes = sortedVotes[0]?.count || 1

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Date Poll</h1>
        <p style={{ color: 'var(--text-muted)' }}>Select every date that works for you. Results update live as players respond.</p>
      </div>

      {/* Tournament date banner */}
      {tournamentDate && (
        <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '1.25rem', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.5rem' }}>📅</span>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.15rem' }}>TOURNAMENT DATE CONFIRMED</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>
              {format(new Date(tournamentDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <button onClick={() => setCurrentMonth(m => addMonths(m, -1))} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', background: 'var(--navy-light)', border: '1px solid var(--navy-border)', borderRadius: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>← Prev</button>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--white)' }}>{format(currentMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', background: 'var(--navy-light)', border: '1px solid var(--navy-border)', borderRadius: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Next →</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.5rem' }}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.5rem 0', letterSpacing: '0.05em' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const selected = selectedDates.some(d => isSameDay(d, day))
            const today = isToday(day)
            const votes = voteCounts[dateStr] || 0
            const heat = totalPlayers > 0 ? votes / totalPlayers : 0
            const isChosen = tournamentDate === dateStr

            return (
              <button
                key={day.toISOString()}
                onClick={() => toggleDate(day)}
                style={{
                  aspectRatio: '1', borderRadius: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
                  border: isChosen
                    ? '2px solid var(--gold)'
                    : selected
                    ? '2px solid var(--gold)'
                    : today
                    ? '2px solid rgba(201,168,76,0.4)'
                    : '2px solid transparent',
                  background: selected
                    ? 'var(--gold)'
                    : isChosen
                    ? 'rgba(201,168,76,0.22)'
                    : votes > 0
                    ? `rgba(201,168,76,${(0.06 + heat * 0.22).toFixed(2)})`
                    : today
                    ? 'rgba(201,168,76,0.06)'
                    : 'var(--navy-light)',
                  color: selected ? '#0d0f0a' : votes > 0 || today ? 'var(--gold)' : 'var(--white)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px',
                }}
              >
                <span style={{ fontSize: '0.88rem', fontWeight: selected || votes > 0 ? 700 : 400 }}>{format(day, 'd')}</span>
                {votes > 0 && (
                  <span style={{ fontSize: '0.55rem', fontWeight: 700, opacity: 0.85, lineHeight: 1 }}>{votes}✓</span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected</p>
          <button onClick={handleSave} className="btn-electric" disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save My Dates'}
          </button>
        </div>
      </div>

      {/* Poll Results — visible to everyone */}
      {sortedVotes.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.3rem' }}>Poll Results</h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', background: 'var(--navy-light)', padding: '0.25rem 0.75rem', borderRadius: '999px' }}>
              {totalPlayers} players · {sortedVotes.length} date{sortedVotes.length !== 1 ? 's' : ''} voted
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {sortedVotes.map(({ date, count }, idx) => {
              const pct = totalPlayers > 0 ? Math.round((count / totalPlayers) * 100) : 0
              const barPct = (count / maxVotes) * 100
              const isChosen = tournamentDate === date
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null

              return (
                <div key={date} style={{
                  padding: '0.75rem 1rem', borderRadius: '0.875rem',
                  background: isChosen ? 'rgba(201,168,76,0.1)' : idx === 0 ? 'rgba(201,168,76,0.06)' : 'var(--navy-light)',
                  border: isChosen ? '1px solid rgba(201,168,76,0.35)' : '1px solid transparent',
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <span style={{ fontSize: medal ? '1.1rem' : '0.78rem', width: '28px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>
                    {isChosen ? '📅' : medal || (idx + 1)}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.88rem', color: isChosen || idx === 0 ? 'var(--gold)' : 'var(--white)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {format(new Date(date + 'T12:00:00'), 'EEE, MMM d, yyyy')}
                      {isChosen && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.06em', background: 'rgba(201,168,76,0.15)', padding: '0.1rem 0.5rem', borderRadius: '999px' }}>TOURNAMENT DATE</span>}
                    </p>
                    <div style={{ height: '5px', background: 'rgba(61,50,32,0.5)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '999px', width: `${barPct}%`, background: isChosen ? 'var(--gold)' : idx === 0 ? 'var(--gold)' : 'rgba(201,168,76,0.45)', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gold)', lineHeight: 1 }}>{count}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{pct}%</p>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleSetTournamentDate(isChosen ? '' : date)}
                      disabled={settingDate}
                      style={{
                        padding: '0.35rem 0.7rem', borderRadius: '0.625rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                        background: isChosen ? 'rgba(255,107,107,0.1)' : 'rgba(201,168,76,0.12)',
                        border: isChosen ? '1px solid rgba(255,107,107,0.3)' : '1px solid rgba(201,168,76,0.3)',
                        color: isChosen ? '#ff8f8f' : 'var(--gold)',
                      }}
                    >
                      {settingDate ? '...' : isChosen ? 'Unset' : 'Set Date'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
