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

  const { data: prof } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!prof?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { team_id, hole_number, strokes, entered_by } = await req.json()
  if (!team_id || !hole_number) return NextResponse.json({ error: 'Missing team_id or hole_number' }, { status: 400 })

  if (strokes === null || strokes === undefined || strokes === '') {
    await supabaseAdmin.from('scores').delete().match({ team_id, hole_number })
  } else {
    const { error } = await supabaseAdmin.from('scores').upsert(
      { team_id, hole_number, strokes: Number(strokes), entered_by },
      { onConflict: 'team_id,hole_number' }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
