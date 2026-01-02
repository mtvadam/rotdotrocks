import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'
import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { Providers } from '@/components/Providers'
import SeasonalEffects from '@/components/effects/SeasonalEffects'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'rot.rocks - Brainrot Trading',
  description: 'Trade Brainrot pets from Steal a Brainrot',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
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
      </body>
    </html>
  )
}
