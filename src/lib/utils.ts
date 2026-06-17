export function displayName(profile: { nickname?: string | null; full_name?: string | null } | null | undefined): string {
  return profile?.nickname?.trim() || profile?.full_name || 'Player'
}

export function fmtTime(t: string | null | undefined): string {
  if (!t) return ''
  if (t.toUpperCase().includes('AM') || t.toUpperCase().includes('PM')) return t
  const [h, m] = t.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export function toTimeInput(t: string | null | undefined): string {
  if (!t) return ''
  if (!t.toUpperCase().includes('AM') && !t.toUpperCase().includes('PM')) return t
  const match = t.match(/^(\d+):(\d+)\s*(AM|PM)$/i)
  if (!match) return ''
  let hours = parseInt(match[1])
  const mins = match[2]
  const ampm = match[3].toUpperCase()
  if (ampm === 'PM' && hours !== 12) hours += 12
  if (ampm === 'AM' && hours === 12) hours = 0
  return `${hours.toString().padStart(2, '0')}:${mins}`
}
