'use client'

import { motion } from 'framer-motion'
import { ReactNode, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MotionButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
}

const variants = {
  primary: `
    bg-green-600 text-white
    hover:bg-green-500 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]
    focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-darkbg-900
    disabled:bg-gray-600 disabled:shadow-none
  `,
  secondary: `
    bg-transparent border border-darkbg-600 text-gray-300
    hover:border-green-500/50 hover:bg-green-500/5 hover:text-green-500
    focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-darkbg-900
    disabled:border-gray-600 disabled:text-gray-600
  `,
  ghost: `
    bg-transparent text-gray-400
    hover:bg-darkbg-800 hover:text-white
    focus-visible:ring-2 focus-visible:ring-green-500
    disabled:text-gray-600
  `,
  danger: `
    bg-red-600 text-white
    hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]
    focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-darkbg-900
    disabled:bg-gray-600 disabled:shadow-none
  `,
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      className = '',
      onClick,
      type = 'button',
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        onClick={onClick}
        whileHover={disabled ? {} : { scale: 1.02 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 outline-none',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </motion.button>
    )
  }
)

MotionButton.displayName = 'MotionButton'
