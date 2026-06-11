import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { CURRENT_YEAR } from '@/lib/constants'

export async function GET(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!prof?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await supabaseAdmin
    .from('availability_dates')
    .select('user_id, date, profiles(full_name, nickname)')
    .eq('tournament_year', CURRENT_YEAR)

  return NextResponse.json({ data: data || [] })
}
