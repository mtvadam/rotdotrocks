import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Steal a Brainrot Values | rot.rocks',
  description: 'Look up any Steal a Brainrot to see its income, rarity, and current Robux value. Search and filter by rarity.',
  keywords: ['steal a brainrot values', 'brainrot prices', 'brainrot income', 'brainrot rarity'],
  openGraph: {
    title: 'Steal a Brainrot Values',
    description: 'Look up any Steal a Brainrot to see its income, rarity, and current Robux value.',
    url: 'https://rot.rocks/brainrots',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Steal a Brainrot Values',
    description: 'Look up any Steal a Brainrot to see its income, rarity, and current Robux value.',
  },
  alternates: {
    canonical: 'https://rot.rocks/brainrots',
  },
}

export default function BrainrotsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
