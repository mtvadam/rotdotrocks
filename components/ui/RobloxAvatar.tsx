'use client'

import Image from 'next/image'
import { User } from 'lucide-react'

interface RobloxAvatarProps {
  avatarUrl: string | null | undefined
  username: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  xs: 'w-5 h-5',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
}

const iconSizeMap = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export function RobloxAvatar({ avatarUrl, username, size = 'sm', className = '' }: RobloxAvatarProps) {
  const sizeClass = sizeMap[size]
  const iconSizeClass = iconSizeMap[size]

  if (!avatarUrl) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-darkbg-700 flex items-center justify-center flex-shrink-0 ${className}`}
        title={username}
      >
        <User className={`${iconSizeClass} text-gray-500`} />
      </div>
    )
  }

  return (
    <div className={`${sizeClass} relative rounded-full overflow-hidden flex-shrink-0 ${className}`} title={username}>
      <Image
        src={avatarUrl}
        alt={`${username}'s avatar`}
        fill
        className="object-cover"
        unoptimized
      />
    </div>
  )
}
