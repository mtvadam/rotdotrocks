'use client'

import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circle' | 'text'
  width?: number | string
  height?: number | string
  lines?: number
  animate?: boolean
}

export function Skeleton({
  variant = 'default',
  width,
  height,
  lines,
  animate = true,
  className,
  style,
  ...props
}: SkeletonProps) {
  // If lines is specified, render multiple text skeletons
  if (lines && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            width={i === lines - 1 ? '60%' : '100%'}
            animate={animate}
          />
        ))}
      </div>
    )
  }

  const variantClasses = {
    default: 'rounded-md',
    circle: 'rounded-full',
    text: 'rounded h-4 w-full',
  }

  return (
    <div
      className={cn(
        'bg-bg-tertiary',
        variantClasses[variant],
        animate && 'skeleton',
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  )
}

// Card Skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('card p-4 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton lines={3} />
      <div className="flex gap-2">
        <Skeleton width={80} height={32} />
        <Skeleton width={80} height={32} />
      </div>
    </div>
  )
}

// Game Card Skeleton
export function GameCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('card p-0 overflow-hidden', className)}>
      <Skeleton height={150} className="rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton width="70%" height={20} />
        <Skeleton width="40%" height={14} />
      </div>
    </div>
  )
}

// Table Row Skeleton
export function TableRowSkeleton({
  columns = 4,
  className,
}: {
  columns?: number
  className?: string
}) {
  return (
    <tr className={className}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton
            width={i === 0 ? 120 : i === columns - 1 ? 80 : '100%'}
            height={16}
          />
        </td>
      ))}
    </tr>
  )
}

// Stats Skeleton
export function StatsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('card p-4', className)}>
      <Skeleton width="50%" height={14} />
      <Skeleton width="70%" height={32} className="mt-2" />
      <div className="flex items-center gap-2 mt-2">
        <Skeleton width={60} height={14} />
        <Skeleton width={80} height={12} />
      </div>
    </div>
  )
}

// Bet History Row Skeleton
export function BetHistoryRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 p-3', className)}>
      <Skeleton variant="circle" width={32} height={32} />
      <div className="flex-1 space-y-1">
        <Skeleton width="40%" height={14} />
        <Skeleton width="60%" height={12} />
      </div>
      <div className="text-right space-y-1">
        <Skeleton width={60} height={14} />
        <Skeleton width={40} height={12} />
      </div>
    </div>
  )
}

// Full Page Loading Skeleton
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton width={200} height={32} />
        <Skeleton width={120} height={40} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsSkeleton key={i} />
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton width="30%" height={24} />
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton width="40%" height={24} />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  )
}
