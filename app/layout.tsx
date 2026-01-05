import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { Providers } from '@/components/Providers'
import SeasonalEffects from '@/components/effects/SeasonalEffects'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'rot.rocks - Brainrot Trading',
  description: 'Trade Brainrot pets from Steal a Brainrot. Create trades, calculate values, and find fair deals.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://rot.rocks'),
  openGraph: {
    title: 'rot.rocks - Brainrot Trading',
    description: 'Trade Brainrot pets from Steal a Brainrot. Create trades, calculate values, and find fair deals.',
    type: 'website',
    url: 'https://rot.rocks',
    siteName: 'rot.rocks',
  },
  twitter: {
    card: 'summary',
    title: 'rot.rocks - Brainrot Trading',
    description: 'Trade Brainrot pets from Steal a Brainrot. Create trades, calculate values, and find fair deals.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.className} bg-darkbg-950 min-h-screen flex flex-col`}>
        <Providers>
          <SeasonalEffects />
          <NavBar />
          <main className="relative z-[10] flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
