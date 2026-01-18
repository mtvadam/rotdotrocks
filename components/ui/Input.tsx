'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  leftElement?: ReactNode
  rightElement?: ReactNode
  variant?: 'default' | 'filled' | 'ghost'
  inputSize?: 'sm' | 'md' | 'lg'
}

const variants = {
  default: 'bg-bg-tertiary border-border-default hover:border-border-hover focus:border-neon-pink focus:ring-neon-pink/20',
  filled: 'bg-bg-secondary border-transparent hover:bg-bg-tertiary focus:bg-bg-tertiary focus:border-neon-pink focus:ring-neon-pink/20',
  ghost: 'bg-transparent border-transparent hover:bg-bg-tertiary focus:bg-bg-tertiary focus:border-neon-pink',
}

const sizes = {
  sm: 'h-8 text-xs px-3',
  md: 'h-10 text-sm px-4',
  lg: 'h-12 text-base px-4',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      leftElement,
      rightElement,
      variant = 'default',
      inputSize = 'md',
      type = 'text',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftElement && (
            <div className="absolute left-0 inset-y-0 flex items-center">
              {leftElement}
            </div>
          )}
          {leftIcon && !leftElement && (
            <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-text-tertiary">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            className={cn(
              'w-full rounded-md border',
              'text-text-primary placeholder:text-text-tertiary',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              variants[variant],
              sizes[inputSize],
              leftIcon && !leftElement && 'pl-10',
              rightIcon && !rightElement && 'pr-10',
              leftElement && 'pl-16',
              rightElement && 'pr-16',
              error && 'border-status-error focus:border-status-error focus:ring-status-error/20',
              className
            )}
            {...props}
          />
          {rightIcon && !rightElement && (
            <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none text-text-tertiary">
              {rightIcon}
            </div>
          )}
          {rightElement && (
            <div className="absolute right-0 inset-y-0 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {(error || hint) && (
          <p className={cn(
            'mt-1.5 text-xs',
            error ? 'text-status-error' : 'text-text-tertiary'
          )}>
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Number Input with formatting
export interface NumberInputProps extends Omit<InputProps, 'type' | 'onChange'> {
  value: number | string
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  precision?: number
  allowNegative?: boolean
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      step = 1,
      precision = 2,
      allowNegative = false,
      className,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value

      // Allow empty string for clearing
      if (rawValue === '') {
        onChange(0)
        return
      }

      // Remove non-numeric characters except decimal point and minus
      let cleaned = rawValue.replace(/[^0-9.-]/g, '')

      // Handle negative numbers
      if (!allowNegative) {
        cleaned = cleaned.replace(/-/g, '')
      }

      // Parse the value
      const parsed = parseFloat(cleaned)

      if (!isNaN(parsed)) {
        let finalValue = parsed

        // Apply min/max constraints
        if (min !== undefined && finalValue < min) finalValue = min
        if (max !== undefined && finalValue > max) finalValue = max

        onChange(finalValue)
      }
    }

    const displayValue = typeof value === 'number' && !isNaN(value)
      ? value.toFixed(precision).replace(/\.?0+$/, '')
      : value

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        className={cn('font-mono tabular-nums', className)}
        {...props}
      />
    )
  }
)

NumberInput.displayName = 'NumberInput'

// Search Input
export interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onSearch?: (value: string) => void
  onClear?: () => void
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onClear, value, onChange, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        leftIcon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        }
        placeholder="Search..."
        {...props}
      />
    )
  }
)

SearchInput.displayName = 'SearchInput'

// Password Input with toggle visibility
export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {}

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="h-full px-3 text-text-tertiary hover:text-text-primary transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        {...props}
      />
    )
  }
)

PasswordInput.displayName = 'PasswordInput'
