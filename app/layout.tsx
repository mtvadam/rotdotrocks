import type { Metadata, Viewport } from 'next'
import { Inter, Oswald, Bebas_Neue } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from '@/components/Providers'
import { CasinoLayout } from '@/components/layout'
import './globals.css'

// Fonts
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
})

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'GTA.BET - Vice City Casino',
    template: '%s | GTA.BET',
  },
  description: 'The ultimate GTA-themed crypto casino. Play Dice, Crash, Mines, and more. Fast payouts, provably fair games, and VIP rewards.',
  keywords: ['crypto casino', 'bitcoin gambling', 'dice game', 'crash game', 'mines game', 'provably fair'],
  authors: [{ name: 'GTA.BET' }],
  creator: 'GTA.BET',
  publisher: 'GTA.BET',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://gta.bet'),
  openGraph: {
    title: 'GTA.BET - Vice City Casino',
    description: 'The ultimate GTA-themed crypto casino. Play Dice, Crash, Mines, and more.',
    type: 'website',
    url: 'https://gta.bet',
    siteName: 'GTA.BET',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GTA.BET Casino',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GTA.BET - Vice City Casino',
    description: 'The ultimate GTA-themed crypto casino. Play Dice, Crash, Mines, and more.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A0A0B',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${oswald.variable} ${bebasNeue.variable}`}
    >
      <body className="font-body antialiased">
        <Providers>
          <CasinoLayout>
            {children}
          </CasinoLayout>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
