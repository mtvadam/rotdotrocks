'use client'

import { type HTMLAttributes, useState } from 'react'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  status?: 'online' | 'offline' | 'away' | 'busy'
  bordered?: boolean
  glow?: boolean
}

const sizes = {
  xs: 'w-6 h-6 text-2xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-14 h-14 text-lg',
  '2xl': 'w-20 h-20 text-2xl',
}

const statusSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
  '2xl': 'w-4 h-4',
}

const statusColors = {
  online: 'bg-neon-green',
  offline: 'bg-text-tertiary',
  away: 'bg-status-warning',
  busy: 'bg-status-error',
}

// Generate a consistent color based on name
function getAvatarColor(name?: string): string {
  if (!name) return 'from-neon-pink to-neon-purple'

  const colors = [
    'from-neon-pink to-neon-purple',
    'from-neon-cyan to-status-info',
    'from-neon-orange to-neon-pink',
    'from-neon-green to-neon-cyan',
    'from-neon-yellow to-neon-orange',
    'from-neon-purple to-status-info',
  ]

  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[index % colors.length]
}

// Get initials from name
function getInitials(name?: string): string {
  if (!name) return '?'

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  status,
  bordered = false,
  glow = false,
  className,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  const showImage = src && !imageError
  const initials = getInitials(name || alt)
  const gradientColor = getAvatarColor(name || alt)

  return (
    <div className={cn('relative inline-flex', className)} {...props}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full overflow-hidden',
          'font-semibold text-white',
          sizes[size],
          !showImage && `bg-gradient-to-br ${gradientColor}`,
          bordered && 'ring-2 ring-bg-primary ring-offset-2 ring-offset-bg-secondary',
          glow && 'shadow-neon-pink'
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-bg-secondary',
            statusSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  )
}

// Avatar Group for showing multiple avatars
export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  avatars: Array<{
    src?: string | null
    name?: string
  }>
  max?: number
  size?: AvatarProps['size']
}

export function AvatarGroup({
  avatars,
  max = 4,
  size = 'md',
  className,
  ...props
}: AvatarGroupProps) {
  const visible = avatars.slice(0, max)
  const remaining = avatars.length - max

  const overlapClasses = {
    xs: '-ml-2',
    sm: '-ml-2.5',
    md: '-ml-3',
    lg: '-ml-4',
    xl: '-ml-5',
    '2xl': '-ml-6',
  }

  return (
    <div className={cn('flex items-center', className)} {...props}>
      {visible.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          name={avatar.name}
          size={size}
          className={cn(index > 0 && overlapClasses[size])}
          bordered
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'relative flex items-center justify-center rounded-full',
            'bg-bg-tertiary text-text-secondary font-medium',
            'ring-2 ring-bg-secondary',
            sizes[size],
            overlapClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}

// User Avatar with name and optional info
export interface UserAvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null
  name: string
  info?: string
  size?: AvatarProps['size']
  status?: AvatarProps['status']
  reversed?: boolean
}

export function UserAvatar({
  src,
  name,
  info,
  size = 'md',
  status,
  reversed = false,
  className,
  ...props
}: UserAvatarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        reversed && 'flex-row-reverse text-right',
        className
      )}
      {...props}
    >
      <Avatar src={src} name={name} size={size} status={status} />
      <div className="min-w-0">
        <p className="font-medium text-text-primary truncate">{name}</p>
        {info && (
          <p className="text-sm text-text-secondary truncate">{info}</p>
        )}
      </div>
    </div>
  )
}
