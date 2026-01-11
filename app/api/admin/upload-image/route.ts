import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { put } from '@vercel/blob'

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

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    // Validate file type - check both MIME type and file name extension
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
    const fileName = file.name.toLowerCase()
    const hasValidExtension = /\.(png|jpg|jpeg|webp|gif)$/i.test(fileName)

    if (!allowedMimeTypes.includes(file.type) && !hasValidExtension) {
      return NextResponse.json({
        error: `Invalid file type: ${file.type}. Only PNG, JPEG, WebP, and GIF are allowed.`
      }, { status: 400 })
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({
        error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 5MB.`
      }, { status: 400 })
    }

    // Get file extension - handle both from MIME type and filename
    let ext = ''
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      ext = 'jpg'
    } else if (file.type) {
      ext = file.type.split('/')[1]
    } else {
      // Fallback to file extension from filename
      const match = file.name.match(/\.([^.]+)$/)
      ext = match ? match[1].toLowerCase() : 'png'
    }

    const filename = `${slug}.${ext}`

    // Upload to Vercel Blob
    const blob = await put(`brainrot-images/brainrots/${filename}`, file, {
      access: 'public',
      contentType: file.type || 'image/png',
      addRandomSuffix: false,
      allowOverwrite: true,
    })

    return NextResponse.json({
      success: true,
      localImage: blob.url,
      filename,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to upload image'
    }, { status: 500 })
  }
}
