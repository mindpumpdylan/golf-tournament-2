import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teamId, name } = await req.json()
  if (!teamId || !name) return NextResponse.json({ error: 'Missing teamId or name' }, { status: 400 })

  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 20) {
    return NextResponse.json({ error: 'Name must be 1–20 characters' }, { status: 400 })
  }

  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('team_id', teamId)
    .eq('player_id', user.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })

  const { error } = await supabaseAdmin.from('teams').update({ name: trimmed }).eq('id', teamId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
