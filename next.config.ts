import type { NextConfig } from 'next'

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    // Allow embedding only from adams.place (for portfolio modal)
    // This replaces X-Frame-Options with the more flexible CSP frame-ancestors
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'self' https://adams.place https://*.adams.place http://localhost:*"
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Vercel Blob storage — used for brainrot images and OG images
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      // Roblox avatar CDN — returned by the thumbnails.roblox.com API
      // and the Roblox OAuth userinfo picture field
      {
        protocol: 'https',
        hostname: 'tr.rbxcdn.com',
      },
      // Roblox thumbnails API (used as a fallback picture source)
      {
        protocol: 'https',
        hostname: 'thumbnails.roblox.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
