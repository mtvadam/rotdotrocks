'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { BadgeCheck, MessageSquare, ArrowRightLeft } from 'lucide-react'
import { TradeItemDisplay } from './TradeItemDisplay'
import { RobloxAvatar } from '@/components/ui'
import { easeOut } from '@/lib/animations'

interface TradeCardProps {
  trade: {
    id: string
    status: string
    isVerified: boolean
    createdAt: string
    user: {
      id: string
      robloxUsername: string
      robloxUserId: string
      robloxAvatarUrl?: string | null
    }
    items: Array<{
      id: string
      side: 'OFFER' | 'REQUEST'
      brainrot: {
        id: string
        name: string
        localImage: string | null
        baseIncome: string
      }
      mutation?: {
        id: string
        name: string
        multiplier: number
      } | null
      event?: {
        id: string
        name: string
      } | null
      traits?: Array<{
        trait: {
          id: string
          name: string
          localImage: string | null
          multiplier: number
        }
      }>
      calculatedIncome?: string | null
    }>
    _count?: {
      counterOffers: number
    }
  }
  index?: number
}

export function TradeCard({ trade, index = 0 }: TradeCardProps) {
  const offerItems = trade.items.filter((i) => i.side === 'OFFER')
  const requestItems = trade.items.filter((i) => i.side === 'REQUEST')

  return (
    <Link href={`/trading/${trade.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.05, ease: easeOut }}
        whileHover={{
          y: -4,
          transition: { duration: 0.15, ease: easeOut },
        }}
        whileTap={{ scale: 0.98 }}
        className="
          bg-darkbg-900 rounded-2xl p-4
          border border-darkbg-700
          hover:border-green-500/50
          hover:shadow-[0_8px_30px_rgba(34,197,94,0.12)]
          transition-all duration-200 cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-darkbg-950
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <RobloxAvatar
              avatarUrl={trade.user.robloxAvatarUrl}
              username={trade.user.robloxUsername}
              size="sm"
            />
            <span className="font-semibold text-white truncate">
              {trade.user.robloxUsername}
            </span>
            {trade.isVerified && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="flex-shrink-0"
              >
                <BadgeCheck className="w-4 h-4 text-green-500" />
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-400 flex-shrink-0">
            {trade.status !== 'OPEN' && (
              <span
                className={`text-xs font-semibold px-1.5 md:px-2 py-0.5 rounded ${
                  trade.status === 'COMPLETED'
                    ? 'bg-green-500/10 text-green-500'
                    : trade.status === 'PENDING'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {trade.status}
              </span>
            )}
            {trade._count && trade._count.counterOffers > 0 && (
              <span className="flex items-center gap-1 text-green-500">
                <MessageSquare className="w-4 h-4" />
                {trade._count.counterOffers}
              </span>
            )}
            <span className="hidden sm:inline">{formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })}</span>
            <span className="sm:hidden">{formatDistanceToNow(new Date(trade.createdAt), { addSuffix: false })}</span>
          </div>
        </div>

        {/* Trade Content - Stack on mobile, side-by-side on md+ */}
        <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-2 md:items-start">
          {/* Offer Side */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Offering
            </p>
            {offerItems.map((item, i) => (
              <TradeItemDisplay key={item.id} item={item} size="sm" index={i} />
            ))}
          </div>

          {/* Arrow - horizontal on mobile, vertical on md+ */}
          <div className="flex items-center justify-center py-1 md:py-0 md:h-full md:px-2">
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="rotate-90 md:rotate-0"
            >
              <ArrowRightLeft className="w-5 h-5 text-green-500/60" />
            </motion.div>
          </div>

          {/* Request Side */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Looking For
            </p>
            {requestItems.map((item, i) => (
              <TradeItemDisplay key={item.id} item={item} size="sm" index={i} />
            ))}
          </div>
        </div>

      </motion.div>
    </Link>
  )
}

// Skeleton loader for TradeCard
export function TradeCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="bg-darkbg-900 rounded-2xl border border-darkbg-700 p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 skeleton rounded-full" />
          <div className="h-5 w-24 skeleton rounded" />
        </div>
        <div className="h-4 w-16 skeleton rounded" />
      </div>
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-2">
        <div className="space-y-2">
          <div className="h-3 w-16 skeleton rounded" />
          <div className="h-16 skeleton rounded-xl" />
          <div className="h-16 skeleton rounded-xl" />
        </div>
        <div className="hidden md:block w-5" />
        <div className="space-y-2">
          <div className="h-3 w-20 skeleton rounded" />
          <div className="h-16 skeleton rounded-xl" />
        </div>
      </div>
    </motion.div>
  )
}
