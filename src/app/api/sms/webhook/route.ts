import twilio from 'twilio'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { TOURNAMENT_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/constants'

const STOP_WORDS = ['STOP', 'UNSUBSCRIBE', 'END', 'QUIT', 'HALT']
const HELP_WORDS = ['HELP', 'INFO', 'SUPPORT']
const START_WORDS = ['START', 'OPTIN', 'YES']

export async function POST(req: Request) {
  const rawBody = await req.text()
  const params = new URLSearchParams(rawBody)
  const body = (params.get('Body') || '').trim().toUpperCase()
  const from = params.get('From') || ''

  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (authToken) {
    const signature = req.headers.get('x-twilio-signature') || ''
    const valid = twilio.validateRequest(authToken, signature, req.url, Object.fromEntries(params))
    if (!valid) return new NextResponse('Forbidden', { status: 403 })
  }

  let reply = ''
  if (STOP_WORDS.includes(body)) {
    reply = `You are unsubscribed from ${TOURNAMENT_NAME} alerts. No more messages will be sent. Reply HELP for help.`
  } else if (HELP_WORDS.includes(body)) {
    reply = `${TOURNAMENT_NAME}: For help email ${SUPPORT_EMAIL} or call ${SUPPORT_PHONE}. Msg & data rates may apply. Reply STOP to cancel.`
  } else if (START_WORDS.includes(body)) {
    reply = `Welcome to ${TOURNAMENT_NAME}! Message frequency varies. Msg & data rates may apply. Reply HELP for help or STOP to cancel.`
  }

  if (from && (STOP_WORDS.includes(body) || START_WORDS.includes(body)) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    await supabaseAdmin.from('profiles').update({ sms_consent: START_WORDS.includes(body) }).eq('phone_number', from)
  }

  const twiml = new twilio.twiml.MessagingResponse()
  if (reply) twiml.message(reply)

  return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } })
}
