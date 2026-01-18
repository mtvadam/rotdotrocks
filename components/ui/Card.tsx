'use client'

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'elevated' | 'outline' | 'ghost' | 'glow'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
  selected?: boolean
}

const variants = {
  default: 'bg-bg-secondary border-border-default',
  elevated: 'bg-bg-secondary border-border-default shadow-lg',
  outline: 'bg-transparent border-border-default',
  ghost: 'bg-transparent border-transparent',
  glow: 'bg-bg-secondary border-neon-pink/30 shadow-neon-pink',
}

const paddings = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      interactive = false,
      selected = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        whileHover={interactive ? { y: -2, scale: 1.01 } : undefined}
        whileTap={interactive ? { scale: 0.99 } : undefined}
        transition={{ duration: 0.15 }}
        className={cn(
          'rounded-lg border',
          'transition-all duration-200',
          variants[variant],
          paddings[padding],
          interactive && 'cursor-pointer hover:border-neon-pink/50 hover:shadow-md',
          selected && 'border-neon-pink ring-2 ring-neon-pink/20',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

Card.displayName = 'Card'

// Card Header
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: ReactNode
}

export function CardHeader({
  className,
  title,
  description,
  action,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)} {...props}>
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="font-heading text-lg font-semibold text-text-primary truncate">
            {title}
          </h3>
        )}
        {description && (
          <p className="mt-1 text-sm text-text-secondary">
            {description}
          </p>
        )}
        {children}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// Card Content
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

// Card Footer
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 pt-4 mt-4 border-t border-border-default',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Stat Card for dashboard metrics
export interface StatCardProps extends CardProps {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: ReactNode
}

export function StatCard({
  label,
  value,
  change,
  changeLabel = 'vs last period',
  icon,
  className,
  ...props
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <Card className={cn('', className)} {...props}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          <p className="mt-2 text-2xl font-display font-bold text-text-primary">
            {value}
          </p>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={cn(
                  'text-sm font-medium',
                  isPositive && 'text-neon-green',
                  isNegative && 'text-status-error',
                  !isPositive && !isNegative && 'text-text-secondary'
                )}
              >
                {isPositive && '+'}
                {change.toFixed(1)}%
              </span>
              <span className="text-xs text-text-tertiary">{changeLabel}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-bg-tertiary text-neon-pink">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

// Game Card for casino game selection
export interface GameCardProps extends CardProps {
  name: string
  slug: string
  thumbnail: string
  badge?: string
  playerCount?: number
  isLive?: boolean
  isNew?: boolean
  onClick?: () => void
}

export function GameCard({
  name,
  slug,
  thumbnail,
  badge,
  playerCount,
  isLive = false,
  isNew = false,
  onClick,
  className,
  ...props
}: GameCardProps) {
  return (
    <Card
      interactive
      padding="none"
      onClick={onClick}
      className={cn('group overflow-hidden', className)}
      {...props}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={thumbnail}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {isNew && (
            <span className="badge badge-neon">New</span>
          )}
          {badge && (
            <span className="badge badge-info">{badge}</span>
          )}
        </div>

        {/* Live indicator */}
        {isLive && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60">
            <span className="live-dot" />
            <span className="text-xs font-medium text-white">Live</span>
          </div>
        )}

        {/* Player count */}
        {playerCount !== undefined && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/60 text-xs text-white">
            {playerCount} playing
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-heading font-semibold text-text-primary group-hover:text-neon-pink transition-colors">
          {name}
        </h3>
      </div>
    </Card>
  )
}
