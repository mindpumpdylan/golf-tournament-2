import twilio from 'twilio'

export async function notifyAdmin(body: string) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, ADMIN_PHONE_NUMBER } = process.env

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER || !ADMIN_PHONE_NUMBER) {
    console.error('notifyAdmin: missing Twilio/ADMIN_PHONE_NUMBER env vars, skipping admin SMS')
    return
  }

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    await client.messages.create({ from: TWILIO_PHONE_NUMBER, to: ADMIN_PHONE_NUMBER, body })
  } catch (err) {
    console.error('notifyAdmin: failed to send admin SMS', err)
  }
}
