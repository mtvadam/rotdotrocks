import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { Providers } from '@/components/Providers'
import SeasonalEffects from '@/components/effects/SeasonalEffects'
import { MOTD } from '@/components/MOTD'
import { CookieConsent } from '@/components/CookieConsent'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'rot.rocks - Brainrot Trading',
  description: 'The ultimate trading hub for Steal a Brainrot collectors.',
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
    description: 'The ultimate trading hub for Steal a Brainrot collectors.',
    type: 'website',
    url: 'https://rot.rocks',
    siteName: 'rot.rocks',
  },
  twitter: {
    card: 'summary',
    title: 'rot.rocks - Brainrot Trading',
    description: 'The ultimate trading hub for Steal a Brainrot collectors.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17864892799"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17864892799');
          `}
        </Script>
      </head>
      <body className={`${spaceGrotesk.className} bg-darkbg-950 min-h-screen flex flex-col`}>
        <Providers>
          <SeasonalEffects />
          <NavBar />
          <MOTD />
          <main className="relative z-[10] flex-1">
            {children}
          </main>
          <Footer />
          <CookieConsent />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
