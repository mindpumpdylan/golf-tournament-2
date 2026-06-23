'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

export function useSession() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return
      if (!session) { setLoading(false); return }
      setUserId(session.user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (!active) return
      setProfile(data)
      setLoading(false)
    })
  }, [])

  return { loading, isLoggedIn: !!userId, userId, profile }
}

export function useRequireAuth() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      setReady(true)
    })
  }, [router])

  return { ready, userId }
}

export function useRequireAdmin() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
      if (!prof?.is_admin) { router.push('/portal'); return }
      setUserId(session.user.id)
      setReady(true)
    })
  }, [router])

  return { ready, userId }
}
