import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Steal a Brainrot Trading | rot.rocks',
  description: 'Browse active Steal a Brainrot trades or post your own. See what people are offering and find trades that work for you.',
  keywords: ['steal a brainrot trading', 'brainrot trades', 'brainrot marketplace'],
  openGraph: {
    title: 'Steal a Brainrot Trading',
    description: 'Browse active Steal a Brainrot trades or post your own. See what people are offering and find trades that work for you.',
    url: 'https://rot.rocks/trading',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Steal a Brainrot Trading',
    description: 'Browse active Steal a Brainrot trades or post your own.',
  },
  alternates: {
    canonical: 'https://rot.rocks/trading',
  },
}

export default function TradingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
