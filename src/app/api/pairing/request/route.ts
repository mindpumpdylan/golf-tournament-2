import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { CURRENT_YEAR } from '@/lib/constants'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { target_id } = await req.json()
  if (!target_id) return NextResponse.json({ error: 'Missing target_id' }, { status: 400 })
  if (target_id === user.id) return NextResponse.json({ error: 'Cannot request yourself' }, { status: 400 })

  const { error } = await supabaseAdmin.from('pairing_requests').insert({
    requester_id: user.id,
    target_id,
    tournament_year: CURRENT_YEAR,
    status: 'pending',
  })

  if (error && error.code === '23505') {
    return NextResponse.json({ error: 'Request already exists' }, { status: 409 })
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
