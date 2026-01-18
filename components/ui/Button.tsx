'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'outline' | 'neon'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon'
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children?: ReactNode
  fullWidth?: boolean
}

const variants = {
  primary: 'bg-neon-pink text-white border-neon-pink hover:bg-neon-pink/90 hover:shadow-neon-pink',
  secondary: 'bg-bg-tertiary text-text-primary border-border-default hover:bg-bg-hover hover:border-border-hover',
  ghost: 'bg-transparent text-text-secondary border-transparent hover:text-text-primary hover:bg-bg-tertiary',
  success: 'bg-status-success text-white border-status-success hover:brightness-110 hover:shadow-neon-green',
  danger: 'bg-status-error text-white border-status-error hover:brightness-110',
  outline: 'bg-transparent text-neon-pink border-neon-pink hover:bg-neon-pink/10',
  neon: 'bg-transparent text-neon-cyan border-neon-cyan hover:bg-neon-cyan/10 hover:shadow-neon-cyan',
}

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  xl: 'h-14 px-8 text-lg gap-3',
  icon: 'h-10 w-10 p-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading

    return (
      <motion.button
        ref={ref}
        whileHover={isDisabled ? undefined : { scale: 1.02 }}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.15 }}
        disabled={isDisabled}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center',
          'font-heading font-medium uppercase tracking-wider',
          'rounded-md border',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-neon-pink/50 focus:ring-offset-2 focus:ring-offset-bg-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          // Variant styles
          variants[variant],
          // Size styles
          sizes[size],
          // Full width
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {size !== 'icon' && <span>Loading...</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

// Icon Button variant
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: ReactNode
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, size = 'icon', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size={size}
        className={cn('p-0', className)}
        {...props}
      >
        {icon}
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'

// Button Group
export interface ButtonGroupProps {
  children: ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function ButtonGroup({ children, className, orientation = 'horizontal' }: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        '[&>button]:rounded-none',
        orientation === 'horizontal'
          ? '[&>button:first-child]:rounded-l-md [&>button:last-child]:rounded-r-md'
          : '[&>button:first-child]:rounded-t-md [&>button:last-child]:rounded-b-md',
        '[&>button:not(:first-child)]:border-l-0',
        className
      )}
    >
      {children}
    </div>
  )
}
