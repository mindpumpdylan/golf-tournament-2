import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const formData = await req.formData()
  const file = formData.get('file') as File
  const user_id = formData.get('user_id') as string
  const hole_number = formData.get('hole_number') as string
  const caption = formData.get('caption') as string
  const media_type = formData.get('media_type') as string

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { resource_type: media_type === 'video' ? 'video' : 'image', folder: 'high-country-classic' },
      (err, result) => err ? reject(err) : resolve(result)
    ).end(buffer)
  })

  await supabaseAdmin.from('media_posts').insert({
    user_id, cloudinary_url: result.secure_url,
    cloudinary_public_id: result.public_id,
    media_type, hole_number: hole_number ? parseInt(hole_number) : null,
    caption: caption || null,
    tournament_year: new Date().getFullYear(),
  })

  return NextResponse.json({ success: true })
}
