export function displayName(profile: { nickname?: string | null; full_name?: string | null } | null | undefined): string {
  return profile?.nickname?.trim() || profile?.full_name || 'Player'
}
