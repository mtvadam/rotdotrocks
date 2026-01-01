'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { cardVariants, easeOut } from '@/lib/animations'

interface MotionCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  href?: string
  delay?: number
  glowColor?: 'green' | 'purple' | 'amber'
}

const glowColors = {
  green: 'hover:border-green-500/50 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]',
  purple: 'hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
  amber: 'hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
}

export function MotionCard({
  children,
  className = '',
  onClick,
  delay = 0,
  glowColor = 'green',
}: MotionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay, ease: easeOut }}
      whileHover="hover"
      whileTap="tap"
      variants={cardVariants}
      onClick={onClick}
      className={`
        bg-darkbg-900 rounded-2xl
        border border-darkbg-700
        transition-all duration-200
        ${glowColors[glowColor]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

// Skeleton version for loading states
export function MotionCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`
        bg-darkbg-900 rounded-2xl
        border border-darkbg-700
        animate-pulse
        ${className}
      `}
    />
  )
}
