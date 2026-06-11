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

  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('availability_dates')
    .select('date')
    .eq('tournament_year', CURRENT_YEAR)

  const counts: Record<string, number> = {}
  ;(data || []).forEach((d: any) => { counts[d.date] = (counts[d.date] || 0) + 1 })

  return NextResponse.json({ counts })
}
