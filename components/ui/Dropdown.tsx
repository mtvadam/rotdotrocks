'use client'

import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type HTMLAttributes,
  createContext,
  useContext,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// Dropdown Context
interface DropdownContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  selected?: string
  onSelect?: (value: string) => void
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

function useDropdownContext() {
  const context = useContext(DropdownContext)
  if (!context) {
    throw new Error('Dropdown components must be used within a Dropdown')
  }
  return context
}

// Main Dropdown Component
export interface DropdownProps {
  children: ReactNode
  trigger: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  menuClassName?: string
  selected?: string
  onSelect?: (value: string) => void
  closeOnSelect?: boolean
}

export function Dropdown({
  children,
  trigger,
  align = 'left',
  className,
  menuClassName,
  selected,
  onSelect,
  closeOnSelect = true,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleSelect = (value: string) => {
    onSelect?.(value)
    if (closeOnSelect) {
      setIsOpen(false)
    }
  }

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  }

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, selected, onSelect: handleSelect }}>
      <div ref={dropdownRef} className={cn('relative inline-block', className)}>
        {/* Trigger */}
        <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
          {trigger}
        </div>

        {/* Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'absolute z-50 mt-2 min-w-[180px]',
                'bg-bg-elevated border border-border-default rounded-lg',
                'shadow-lg overflow-hidden',
                alignClasses[align],
                menuClassName
              )}
            >
              <div className="p-1">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DropdownContext.Provider>
  )
}

// Dropdown Item
export interface DropdownItemProps extends HTMLAttributes<HTMLButtonElement> {
  value?: string
  icon?: ReactNode
  description?: string
  disabled?: boolean
  danger?: boolean
}

export function DropdownItem({
  children,
  value,
  icon,
  description,
  disabled = false,
  danger = false,
  className,
  onClick,
  ...props
}: DropdownItemProps) {
  const { selected, onSelect } = useDropdownContext()
  const isSelected = value !== undefined && selected === value

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (value !== undefined) {
      onSelect?.(value)
    }
    onClick?.(e)
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-md',
        'text-left text-sm transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && !danger && 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
        !disabled && danger && 'text-status-error hover:bg-status-error/10',
        isSelected && 'text-neon-pink bg-neon-pink/10',
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="truncate">{children}</div>
        {description && (
          <div className="text-xs text-text-tertiary truncate">{description}</div>
        )}
      </div>
      {isSelected && <Check className="w-4 h-4 flex-shrink-0 text-neon-pink" />}
    </button>
  )
}

// Dropdown Separator
export function DropdownSeparator({ className }: { className?: string }) {
  return <div className={cn('my-1 h-px bg-border-default', className)} />
}

// Dropdown Label
export function DropdownLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('px-3 py-1.5 text-xs font-medium text-text-tertiary uppercase', className)}>
      {children}
    </div>
  )
}

// Simple Select Dropdown
export interface SelectDropdownProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string; icon?: ReactNode }>
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
  disabled = false,
}: SelectDropdownProps) {
  const selectedOption = options.find(opt => opt.value === value)

  return (
    <Dropdown
      selected={value}
      onSelect={onChange}
      className={className}
      trigger={
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex items-center justify-between gap-2 w-full',
            'px-4 py-2.5 rounded-md',
            'bg-bg-tertiary border border-border-default',
            'text-sm transition-colors',
            !disabled && 'hover:border-border-hover',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption?.icon}
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown className="w-4 h-4 flex-shrink-0 text-text-tertiary" />
        </button>
      }
    >
      {options.map(option => (
        <DropdownItem key={option.value} value={option.value} icon={option.icon}>
          {option.label}
        </DropdownItem>
      ))}
    </Dropdown>
  )
}
