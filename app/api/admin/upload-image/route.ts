import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// POST /api/admin/upload-image - Upload a brainrot image
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const slug = formData.get('slug') as string | null

    if (!file || !slug) {
      return NextResponse.json({ error: 'File and slug required' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    // Get file extension
    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
    const filename = `${slug}.${ext}`

    // Ensure directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'brainrot-images', 'brainrots')
    await mkdir(uploadDir, { recursive: true })

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer())
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, buffer)

    const localImage = `/brainrot-images/brainrots/${filename}`

    return NextResponse.json({
      success: true,
      localImage,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}
