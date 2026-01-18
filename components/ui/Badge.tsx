'use client'

import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'neon' | 'vip' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  icon?: ReactNode
}

const variants = {
  default: 'bg-bg-tertiary text-text-secondary',
  success: 'bg-status-success/20 text-status-success',
  error: 'bg-status-error/20 text-status-error',
  warning: 'bg-status-warning/20 text-status-warning',
  info: 'bg-status-info/20 text-status-info',
  neon: 'bg-neon-pink/20 text-neon-pink',
  vip: 'bg-gradient-to-r from-neon-yellow to-neon-orange text-black font-semibold',
  outline: 'bg-transparent border border-border-default text-text-secondary',
}

const sizes = {
  sm: 'px-1.5 py-0.5 text-2xs',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium uppercase tracking-wide',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            variant === 'success' && 'bg-status-success',
            variant === 'error' && 'bg-status-error animate-pulse',
            variant === 'warning' && 'bg-status-warning',
            variant === 'info' && 'bg-status-info',
            variant === 'neon' && 'bg-neon-pink',
            (variant === 'default' || variant === 'outline') && 'bg-text-tertiary'
          )}
        />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  )
}

// Live Badge with pulsing animation
export function LiveBadge({ className, ...props }: Omit<BadgeProps, 'variant' | 'dot'>) {
  return (
    <Badge
      variant="error"
      className={cn('', className)}
      {...props}
    >
      <span className="live-dot mr-1" />
      Live
    </Badge>
  )
}

// VIP Level Badge
export interface VipBadgeProps extends Omit<BadgeProps, 'variant'> {
  level: number
}

export function VipBadge({ level, className, ...props }: VipBadgeProps) {
  const getLevelColor = (level: number) => {
    if (level >= 8) return 'from-neon-purple to-neon-pink'
    if (level >= 5) return 'from-neon-yellow to-neon-orange'
    if (level >= 3) return 'from-neon-cyan to-status-info'
    return 'from-text-secondary to-text-tertiary'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-xs font-bold uppercase tracking-wide',
        'bg-gradient-to-r text-white',
        getLevelColor(level),
        className
      )}
      {...props}
    >
      VIP {level}
    </span>
  )
}

// Status Badge for transactions/bets
export type StatusType = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: StatusType
}

const statusConfig: Record<StatusType, { variant: BadgeProps['variant']; label: string }> = {
  pending: { variant: 'warning', label: 'Pending' },
  processing: { variant: 'info', label: 'Processing' },
  completed: { variant: 'success', label: 'Completed' },
  failed: { variant: 'error', label: 'Failed' },
  cancelled: { variant: 'default', label: 'Cancelled' },
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      dot
      className={className}
      {...props}
    >
      {config.label}
    </Badge>
  )
}

// Multiplier Badge for game results
export interface MultiplierBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  multiplier: number
  size?: 'sm' | 'md' | 'lg'
}

export function MultiplierBadge({ multiplier, size = 'md', className, ...props }: MultiplierBadgeProps) {
  const isWin = multiplier > 1
  const isLoss = multiplier === 0

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-mono font-bold',
        sizeClasses[size],
        isWin && 'bg-neon-green/20 text-neon-green',
        isLoss && 'bg-status-error/20 text-status-error',
        !isWin && !isLoss && 'bg-bg-tertiary text-text-primary',
        className
      )}
      {...props}
    >
      {multiplier.toFixed(2)}x
    </span>
  )
}
