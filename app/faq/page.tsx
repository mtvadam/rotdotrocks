'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Gem, BadgeCheck, MessageSquare, Calculator, Shield, HelpCircle, ExternalLink } from 'lucide-react'
import { PageTransition } from '@/components/ui'
import { easeOut } from '@/lib/animations'

interface FAQItem {
  question: string
  answer: React.ReactNode
  icon: React.ReactNode
}

const faqs: FAQItem[] = [
  {
    question: 'How do I get my trade verified?',
    icon: <BadgeCheck className="w-5 h-5 text-green-400" />,
    answer: (
      <div className="space-y-3">
        <p>
          To get your trade verified and earn <span className="text-green-400 font-semibold">+5 bonus gems</span>:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-300">
          <li>Complete a successful trade with another player in-game</li>
          <li>Take a screenshot of the completed trade</li>
          <li>
            Post it in the{' '}
            <span className="text-green-400 font-semibold">#success</span> channel on our{' '}
            <a
              href="https://discord.gg/N5fnmraeee"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:underline inline-flex items-center gap-1"
            >
              Discord server
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Include a link to your trade on rot.rocks</li>
          <li>A moderator will verify your trade and you&apos;ll receive your gems!</li>
        </ol>
      </div>
    ),
  },
  {
    question: 'What are gems and how do I earn them?',
    icon: <Gem className="w-5 h-5 text-emerald-400" />,
    answer: (
      <div className="space-y-3">
        <p>
          Gems are the currency used on rot.rocks to create trade listings.
        </p>
        <div className="space-y-2">
          <p className="font-semibold text-white">How to earn gems:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li>
              <span className="text-green-400 font-semibold">Daily login bonus</span> - You receive gems automatically every day
            </li>
            <li>
              <span className="text-green-400 font-semibold">+5 bonus</span> for each verified trade (post in #success on Discord)
            </li>
          </ul>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-white">Gem costs:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li>Creating a new trade listing: <span className="text-amber-400 font-semibold">5 gems</span></li>
            <li>Counter offers are <span className="text-green-400 font-semibold">free</span></li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    question: 'How does the trade calculator work?',
    icon: <Calculator className="w-5 h-5 text-blue-400" />,
    answer: (
      <div className="space-y-3">
        <p>
          The trade calculator helps you compare the total income value of items on each side of a trade.
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Add brainrots to each side of the trade</li>
          <li>Select mutations and traits for accurate income calculations</li>
          <li>The calculator shows you which side has more value</li>
          <li>Use the percentage difference to gauge trade fairness</li>
        </ul>
        <p className="text-sm text-gray-400">
          Note: The calculator uses base income values. Actual in-game value may vary based on demand and rarity.
        </p>
      </div>
    ),
  },
  {
    question: 'How are income values calculated?',
    icon: <HelpCircle className="w-5 h-5 text-purple-400" />,
    answer: (
      <div className="space-y-3">
        <p>Income calculation formula:</p>
        <div className="bg-darkbg-800 rounded-lg p-3 font-mono text-sm">
          <p className="text-gray-300">Base Income × Combined Multiplier</p>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-white">Multiplier stacking:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
            <li><span className="text-white">No traits:</span> Just mutation multiplier</li>
            <li><span className="text-white">1 trait:</span> Trait + (Mutation - 1)</li>
            <li><span className="text-white">Multiple traits:</span> (First trait - 1) + Other traits + (Mutation - 1)</li>
            <li><span className="text-white">Sleepy trait:</span> Halves final income (×0.5)</li>
          </ul>
        </div>
        <p className="text-sm text-gray-400">
          Found an error? Use the &quot;Is something incorrect?&quot; link in the calculator to report it.
        </p>
      </div>
    ),
  },
  {
    question: 'How do counter offers work?',
    icon: <MessageSquare className="w-5 h-5 text-amber-400" />,
    answer: (
      <div className="space-y-3">
        <p>
          Counter offers let you propose a different trade to the original poster.
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>Counter offers are <span className="text-green-400 font-semibold">free</span> (no gem cost)</li>
          <li>The trade owner can accept your counter offer</li>
          <li>If accepted, the trade moves to &quot;Pending&quot; status</li>
          <li>Complete the trade in-game, then mark it as completed</li>
        </ul>
      </div>
    ),
  },
  {
    question: 'Is my account safe?',
    icon: <Shield className="w-5 h-5 text-red-400" />,
    answer: (
      <div className="space-y-3">
        <p>
          Yes! We take security seriously.
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-300">
          <li>We use official Roblox OAuth for login - we never see your password</li>
          <li>We only store your public Roblox username and ID</li>
          <li>All trades happen in-game, not through our site</li>
          <li>We don&apos;t have access to your Roblox account or inventory</li>
        </ul>
        <p className="text-sm text-amber-400">
          Never share your Roblox password with anyone, including people claiming to be from rot.rocks.
        </p>
      </div>
    ),
  },
]

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-darkbg-900/90 backdrop-blur-sm rounded-xl border border-darkbg-700 overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-darkbg-800/50 transition-colors"
      >
        {item.icon}
        <span className="flex-1 font-semibold text-white">{item.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: easeOut }}
          >
            <div className="px-4 pb-4 pt-0 text-gray-400 border-t border-darkbg-700">
              <div className="pt-4">{item.answer}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <PageTransition className="min-h-[calc(100vh-64px)] bg-darkbg-950">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: easeOut }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-400">
            Everything you need to know about rot.rocks
          </p>
        </motion.div>

        {/* FAQ List */}
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <FAQAccordion
              key={index}
              item={faq}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        {/* Discord CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2, ease: easeOut }}
          className="mt-8 text-center"
        >
          <p className="text-gray-400 mb-4">Still have questions?</p>
          <a
            href="https://discord.gg/N5fnmraeee"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Join our Discord
          </a>
        </motion.div>
      </div>
    </PageTransition>
  )
}
