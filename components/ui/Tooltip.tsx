'use client'

import { useState, type ReactNode, type HTMLAttributes } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface TooltipProps extends HTMLAttributes<HTMLDivElement> {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delay?: number
  disabled?: boolean
  className?: string
  contentClassName?: string
}

const sidePositions = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

const alignmentModifiers = {
  top: {
    start: '-translate-x-0 left-0',
    center: '-translate-x-1/2 left-1/2',
    end: 'translate-x-0 right-0 left-auto',
  },
  bottom: {
    start: '-translate-x-0 left-0',
    center: '-translate-x-1/2 left-1/2',
    end: 'translate-x-0 right-0 left-auto',
  },
  left: {
    start: '-translate-y-0 top-0',
    center: '-translate-y-1/2 top-1/2',
    end: 'translate-y-0 bottom-0 top-auto',
  },
  right: {
    start: '-translate-y-0 top-0',
    center: '-translate-y-1/2 top-1/2',
    end: 'translate-y-0 bottom-0 top-auto',
  },
}

const animations = {
  top: { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 } },
  bottom: { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 } },
  left: { initial: { opacity: 0, x: 4 }, animate: { opacity: 1, x: 0 } },
  right: { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 } },
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delay = 200,
  disabled = false,
  className,
  contentClassName,
  ...props
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (disabled) return
    const id = setTimeout(() => setIsVisible(true), delay)
    setTimeoutId(id)
  }

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId)
    setIsVisible(false)
  }

  if (disabled) {
    return <>{children}</>
  }

  return (
    <div
      className={cn('relative inline-flex', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={animations[side].initial}
            animate={animations[side].animate}
            exit={animations[side].initial}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 pointer-events-none',
              'px-3 py-1.5 rounded-md',
              'bg-bg-elevated border border-border-default shadow-lg',
              'text-xs text-text-primary whitespace-nowrap',
              sidePositions[side].split(' ').slice(0, -1).join(' '), // Position without alignment
              alignmentModifiers[side][align],
              contentClassName
            )}
          >
            {content}
            {/* Arrow */}
            <div
              className={cn(
                'absolute w-2 h-2 bg-bg-elevated border-border-default rotate-45',
                side === 'top' && 'bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r',
                side === 'bottom' && 'top-[-5px] left-1/2 -translate-x-1/2 border-t border-l',
                side === 'left' && 'right-[-5px] top-1/2 -translate-y-1/2 border-t border-r',
                side === 'right' && 'left-[-5px] top-1/2 -translate-y-1/2 border-b border-l'
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Simple text tooltip helper
export function TooltipText({
  text,
  children,
  ...props
}: Omit<TooltipProps, 'content'> & { text: string }) {
  return (
    <Tooltip content={text} {...props}>
      {children}
    </Tooltip>
  )
}
