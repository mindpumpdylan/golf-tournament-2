'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { displayName } from '@/lib/utils'
import { useRequireAuth } from '@/lib/auth-hooks'

export default function TeamPage() {
  const { ready } = useRequireAuth()
  const [userId, setUserId] = useState('')
  const [myTeam, setMyTeam] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [teamNameInput, setTeamNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState('')
  const [newSuggestion, setNewSuggestion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [settingName, setSettingName] = useState<string | null>(null)

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)

    const { data: memberRow } = await supabase
      .from('team_members')
      .select('team_id, teams(*)')
      .eq('player_id', session.user.id)
      .maybeSingle()

    if (!memberRow?.teams) { setLoading(false); return }

    const team = memberRow.teams as any
    setMyTeam(team)
    setTeamNameInput(team.name)

    const { data: membersList } = await supabase
      .from('team_members')
      .select('player_id, profiles(*)')
      .eq('team_id', team.id)
    setMembers(membersList || [])

    const { data: suggData } = await supabase
      .from('team_name_suggestions')
      .select('*, profiles(full_name, nickname, avatar_url), team_name_votes(voter_id)')
      .eq('team_id', team.id)
      .order('created_at', { ascending: false })
    setSuggestions(suggData || [])

    setLoading(false)
  }

  useEffect(() => { if (ready) load() }, [ready])

  const handleSaveName = async () => {
    if (!myTeam || !teamNameInput.trim() || savingName) return
    setSavingName(true)
    setNameMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/team/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ teamId: myTeam.id, name: teamNameInput }),
    })
    setSavingName(false)
    if (res.ok) {
      setMyTeam((prev: any) => ({ ...prev, name: teamNameInput.trim() }))
      setNameMsg('Name updated!')
      setTimeout(() => setNameMsg(''), 3000)
    } else {
      const data = await res.json()
      setNameMsg(data.error || 'Failed to save name')
    }
  }

  const handleSuggest = async () => {
    if (!myTeam || !newSuggestion.trim() || submitting) return
    setSubmitting(true)
    const { error } = await supabase.from('team_name_suggestions').insert({
      team_id: myTeam.id,
      suggested_by: userId,
      name: newSuggestion.trim(),
    })
    setSubmitting(false)
    if (!error) { setNewSuggestion(''); load() }
  }

  const handleVote = async (suggestionId: string, hasVoted: boolean) => {
    if (hasVoted) {
      await supabase.from('team_name_votes')
        .delete()
        .eq('suggestion_id', suggestionId)
        .eq('voter_id', userId)
    } else {
      await supabase.from('team_name_votes').insert({ suggestion_id: suggestionId, voter_id: userId })
    }
    load()
  }

  const handleSetName = async (name: string) => {
    if (!myTeam) return
    setSettingName(name)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/team/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ teamId: myTeam.id, name }),
    })
    setSettingName(null)
    if (res.ok) {
      setMyTeam((prev: any) => ({ ...prev, name }))
      setTeamNameInput(name)
      setNameMsg(`Team name set to "${name}"!`)
      setTimeout(() => setNameMsg(''), 3000)
    }
  }

  const sortedSuggestions = [...suggestions].sort(
    (a, b) => (b.team_name_votes?.length || 0) - (a.team_name_votes?.length || 0)
  )

  if (!ready) return null

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
      <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
    </div>
  )

  if (!myTeam) return (
    <div style={{ maxWidth: '480px', margin: '4rem auto', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⛳</div>
      <h2 style={{ fontSize: '1.5rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>No Team Yet</h2>
      <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
        You haven&apos;t been assigned to a team yet. Check back after the admin creates teams — then you can name your squad here.
      </p>
    </div>
  )

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{`
        input[type=text]::-ms-clear { display: none }
      `}</style>

      <div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.25rem' }}>Team Hub</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage your team name and vote on suggestions from teammates</p>
      </div>

      {/* Current name + rename */}
      <div className="card">
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>CURRENT TEAM NAME</p>
        <h2 style={{ fontSize: '2rem', color: 'var(--gold)', marginBottom: '1.25rem', letterSpacing: '0.02em' }}>{myTeam.name}</h2>

        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>RENAME TEAM</p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <input
              className="input"
              type="text"
              value={teamNameInput}
              onChange={e => setTeamNameInput(e.target.value.slice(0, 20))}
              maxLength={20}
              placeholder="Enter team name…"
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
              style={{ paddingRight: '3.5rem' }}
            />
            <span style={{
              position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
              fontSize: '0.72rem', fontWeight: 700, pointerEvents: 'none',
              color: teamNameInput.length >= 20 ? '#ff8f8f' : 'var(--text-muted)',
            }}>{teamNameInput.length}/20</span>
          </div>
          <button onClick={handleSaveName} disabled={savingName || !teamNameInput.trim()} className="btn-electric" style={{ whiteSpace: 'nowrap' }}>
            {savingName ? 'Saving…' : 'Save Name'}
          </button>
        </div>
        {nameMsg && (
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: nameMsg.includes('Failed') || nameMsg.includes('error') ? '#ff8f8f' : 'var(--gold)', fontWeight: 600 }}>
            {nameMsg}
          </p>
        )}
      </div>

      {/* Team members */}
      <div className="card">
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          TEAM MEMBERS ({members.length})
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
          {members.map(m => (
            <div key={m.player_id} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--card-mid)', border: `1px solid ${m.player_id === userId ? 'rgba(201,168,76,0.35)' : 'var(--border)'}`,
              borderRadius: '999px', padding: '0.35rem 0.875rem 0.35rem 0.35rem',
            }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '999px', overflow: 'hidden', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#0d0f0a', flexShrink: 0 }}>
                {m.profiles?.avatar_url
                  ? <img src={m.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (m.profiles?.full_name?.charAt(0) || '?')}
              </div>
              <span style={{ fontSize: '0.83rem', fontWeight: m.player_id === userId ? 700 : 600, color: m.player_id === userId ? 'var(--gold)' : 'var(--cream)' }}>
                {displayName(m.profiles)}{m.player_id === userId ? ' (you)' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Name Poll */}
      <div className="card">
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.35rem' }}>Name Poll</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Suggest names and vote for your favorites. Click &quot;Set as Name&quot; to make one official — or type your own in the field above.
          </p>
        </div>

        {/* Suggest input */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <input
              className="input"
              type="text"
              value={newSuggestion}
              onChange={e => setNewSuggestion(e.target.value.slice(0, 20))}
              maxLength={20}
              placeholder="Suggest a name…"
              onKeyDown={e => { if (e.key === 'Enter') handleSuggest() }}
              style={{ paddingRight: newSuggestion.length > 0 ? '3.5rem' : '1rem' }}
            />
            {newSuggestion.length > 0 && (
              <span style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                fontSize: '0.72rem', fontWeight: 700, pointerEvents: 'none',
                color: newSuggestion.length >= 20 ? '#ff8f8f' : 'var(--text-muted)',
              }}>{newSuggestion.length}/20</span>
            )}
          </div>
          <button onClick={handleSuggest} disabled={submitting || !newSuggestion.trim()} className="btn-ghost" style={{ padding: '0.75rem 1.25rem', whiteSpace: 'nowrap' }}>
            {submitting ? 'Adding…' : '+ Suggest'}
          </button>
        </div>

        {/* Suggestions */}
        {sortedSuggestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏌️</div>
            <p style={{ fontSize: '0.9rem' }}>No suggestions yet — be the first!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sortedSuggestions.map((s, idx) => {
              const voteCount = s.team_name_votes?.length || 0
              const hasVoted = s.team_name_votes?.some((v: any) => v.voter_id === userId)
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
              const isCurrentName = s.name === myTeam.name
              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: '0.875rem', flexWrap: 'wrap',
                  background: isCurrentName ? 'rgba(201,168,76,0.1)' : idx === 0 && voteCount > 0 ? 'rgba(201,168,76,0.05)' : 'var(--card-mid)',
                  border: isCurrentName ? '1px solid rgba(201,168,76,0.35)' : '1px solid transparent',
                }}>
                  <span style={{ fontSize: medal ? '1.1rem' : '0.78rem', width: '28px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>
                    {voteCount > 0 ? (medal || (idx + 1)) : '—'}
                  </span>

                  <div style={{ flex: 1, minWidth: '100px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isCurrentName || (idx === 0 && voteCount > 0) ? 'var(--gold)' : 'var(--cream)' }}>
                        {s.name}
                      </span>
                      {isCurrentName && (
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.06em', background: 'rgba(201,168,76,0.12)', padding: '0.1rem 0.45rem', borderRadius: '999px', border: '1px solid rgba(201,168,76,0.25)' }}>
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>by {displayName(s.profiles)}</p>
                  </div>

                  {/* Vote toggle */}
                  <button
                    onClick={() => handleVote(s.id, hasVoted)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0,
                      padding: '0.35rem 0.75rem', borderRadius: '0.625rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                      background: hasVoted ? 'rgba(201,168,76,0.15)' : 'transparent',
                      border: hasVoted ? '1px solid rgba(201,168,76,0.4)' : '1px solid var(--border)',
                      color: hasVoted ? 'var(--gold)' : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {hasVoted ? '♥' : '♡'} {voteCount}
                  </button>

                  {/* Set as name */}
                  {!isCurrentName && (
                    <button
                      onClick={() => handleSetName(s.name)}
                      disabled={settingName === s.name}
                      style={{
                        padding: '0.35rem 0.75rem', borderRadius: '0.625rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                        background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--gold)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {settingName === s.name ? '…' : 'Set as Name'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
