'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CURRENT_YEAR } from '@/lib/constants'
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay } from 'date-fns'

export default function AvailabilityPage() {
  const [userId, setUserId] = useState('')
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setUserId(session.user.id)
      const { data } = await supabase
        .from('availability_dates')
        .select('date')
        .eq('user_id', session.user.id)
        .eq('tournament_year', CURRENT_YEAR)
      if (data) setSelectedDates(data.map((d: any) => {
        const [year, month, day] = d.date.split('-').map(Number)
        return new Date(year, month - 1, day)
      }))
    })
  }, [])

  const toggleDate = (date: Date) => {
    setSelectedDates(prev =>
      prev.some(d => isSameDay(d, date)) ? prev.filter(d => !isSameDay(d, date)) : [...prev, date]
    )
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('availability_dates').delete().eq('user_id', userId).eq('tournament_year', CURRENT_YEAR)
    if (selectedDates.length > 0) {
      await supabase.from('availability_dates').insert(
        selectedDates.map(d => ({ user_id: userId, date: format(d, 'yyyy-MM-dd'), tournament_year: CURRENT_YEAR }))
      )
    }
    setSaving(false); setSaved(true)
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startPad = startOfMonth(currentMonth).getDay()

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Date Availability</h1>
        <p style={{ color: 'var(--text-muted)' }}>Tap the dates that work for you. We'll pick the date that works for the most players.</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <button onClick={() => setCurrentMonth(m => addMonths(m, -1))} className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>← Prev</button>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--white)' }}>{format(currentMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Next →</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.5rem' }}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.5rem 0', letterSpacing: '0.05em' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const selected = selectedDates.some(d => isSameDay(d, day))
            const today = isToday(day)
            return (
              <button key={day.toISOString()} onClick={() => toggleDate(day)} style={{
                aspectRatio: '1', borderRadius: '0.75rem', fontSize: '0.9rem', fontWeight: selected ? 700 : 400,
                border: today && !selected ? '2px solid rgba(201,168,76,0.5)' : '2px solid transparent',
                background: selected ? 'var(--gold)' : today ? 'rgba(201,168,76,0.08)' : 'var(--navy-light)',
                color: selected ? '#0d0f0a' : today ? 'var(--gold)' : 'var(--white)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {format(day, 'd')}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected</p>
          <button onClick={handleSave} className="btn-electric" disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Availability'}
          </button>
        </div>
      </div>

      {selectedDates.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--white)' }}>Your Selected Dates</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[...selectedDates].sort((a, b) => a.getTime() - b.getTime()).map(d => (
              <span key={d.toISOString()} style={{ padding: '0.3rem 0.875rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 700, background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.25)' }}>
                {format(d, 'MMM d, yyyy')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
