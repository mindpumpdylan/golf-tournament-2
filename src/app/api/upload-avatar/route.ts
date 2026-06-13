import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

export async function POST(req: NextRequest) {
  const missingCloudinary = [
    !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
    !process.env.CLOUDINARY_API_KEY && 'CLOUDINARY_API_KEY',
    !process.env.CLOUDINARY_API_SECRET && 'CLOUDINARY_API_SECRET',
  ].filter(Boolean) as string[]

  if (missingCloudinary.length > 0) {
    return NextResponse.json({ error: `Missing env vars: ${missingCloudinary.join(', ')} — add them in Vercel dashboard` }, { status: 500 })
  }

  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  const buffer = Buffer.from(await file.arrayBuffer())
  try {
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'high-country-classic/avatars', resource_type: 'image' },
        (err, res) => err ? reject(err) : resolve(res)
      ).end(buffer)
    })
    return NextResponse.json({ url: result.secure_url })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || 'Cloudinary upload failed',
      detail: err.http_code ? `HTTP ${err.http_code}` : undefined,
    }, { status: 500 })
  }
}
