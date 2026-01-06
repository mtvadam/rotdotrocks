import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Steal a Brainrot Calculator | rot.rocks',
  description: 'Compare Steal a Brainrot trades side-by-side. Add brainrots with mutations and traits to see total income and value before you trade.',
  keywords: ['steal a brainrot calculator', 'brainrot trade calculator', 'brainrot value checker'],
  openGraph: {
    title: 'Steal a Brainrot Calculator',
    description: 'Compare Steal a Brainrot trades side-by-side. Add brainrots with mutations and traits to see total income and value before you trade.',
    url: 'https://rot.rocks/trading/calculator',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Steal a Brainrot Calculator',
    description: 'Compare Steal a Brainrot trades side-by-side. Add brainrots with mutations and traits to see total income and value.',
  },
  alternates: {
    canonical: 'https://rot.rocks/trading/calculator',
  },
}

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
