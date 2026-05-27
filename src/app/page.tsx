'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/portal')
      else router.push('/login')
    })
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--green-deep)'}}>
      <div className="text-white text-center">
        <h1 className="text-4xl font-display mb-2">⛳</h1>
        <p className="text-green-light">Loading...</p>
      </div>
    </div>
  )
}