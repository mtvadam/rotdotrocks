import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/login', '/api/'],
    },
    sitemap: 'https://rot.rocks/sitemap.xml',
  }
}
