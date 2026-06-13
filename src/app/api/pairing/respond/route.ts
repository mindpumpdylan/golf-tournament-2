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

  const { request_id, action } = await req.json()
  if (!request_id || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Missing or invalid params' }, { status: 400 })
  }

  const status = action === 'accept' ? 'accepted' : 'declined'

  const { error } = await supabaseAdmin
    .from('pairing_requests')
    .update({ status })
    .eq('id', request_id)
    .eq('target_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
