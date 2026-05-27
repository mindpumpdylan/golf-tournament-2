'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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
      const { data } = await supabase.from('availability_dates').select('date').eq('user_id', session.user.id)
      if (data) setSelectedDates(data.map(d => new Date(d.date)))
    })
  }, [])

  const toggleDate = (date: Date) => {
    setSelectedDates(prev =>
      prev.some(d => isSameDay(d, date))
        ? prev.filter(d => !isSameDay(d, date))
        : [...prev, date]
    )
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('availability_dates').delete().eq('user_id', userId)
    if (selectedDates.length > 0) {
      await supabase.from('availability_dates').insert(
        selectedDates.map(d => ({ user_id: userId, date: format(d, 'yyyy-MM-dd') }))
      )
    }
    setSaving(false); setSaved(true)
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startPad = startOfMonth(currentMonth).getDay()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold" style={{color:'var(--green-deep)'}}>Date Availability</h1>
        <p className="mt-1" style={{color:'var(--text-mid)'}}>
          Tap the dates that work for you. Your selections help admin pick the best tournament date.
        </p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentMonth(m => addMonths(m, -1))}
            className="px-3 py-1 rounded-lg text-sm font-medium" style={{background:'var(--gray-soft)'}}>← Prev</button>
          <h2 className="font-display text-xl font-bold" style={{color:'var(--green-deep)'}}>
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            className="px-3 py-1 rounded-lg text-sm font-medium" style={{background:'var(--gray-soft)'}}>Next →</button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-xs font-semibold py-1" style={{color:'var(--text-mid)'}}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({length: startPad}).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const selected = selectedDates.some(d => isSameDay(d, day))
            const today = isToday(day)
            return (
              <button key={day.toISOString()} onClick={() => toggleDate(day)}
                className="aspect-square rounded-xl text-sm font-medium transition-all"
                style={{
                  background: selected ? 'var(--green-mid)' : today ? 'var(--gray-soft)' : 'transparent',
                  color: selected ? 'white' : today ? 'var(--green-mid)' : 'var(--text-dark)',
                  border: today && !selected ? '2px solid var(--green-light)' : '2px solid transparent',
                  fontWeight: selected ? '600' : '400',
                }}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm" style={{color:'var(--text-mid)'}}>
            {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
          </p>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save My Availability'}
          </button>
        </div>
      </div>

      {selectedDates.length > 0 && (
        <div className="card">
          <h3 className="font-display font-bold mb-3" style={{color:'var(--green-deep)'}}>Your Selected Dates</h3>
          <div className="flex flex-wrap gap-2">
            {[...selectedDates].sort((a,b) => a.getTime()-b.getTime()).map(d => (
              <span key={d.toISOString()} className="px-3 py-1 rounded-full text-sm font-medium"
                style={{background:'var(--green-light)', color:'white'}}>
                {format(d, 'MMM d, yyyy')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}