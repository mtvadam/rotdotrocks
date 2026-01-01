'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
  disabled?: boolean
}

export function Select({ value, onChange, options, className = '', disabled = false }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const selectedOption = options.find(o => o.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-2 pl-4 pr-3 py-2.5
          bg-darkbg-800 rounded-xl border-2
          ${isOpen ? 'border-green-500' : 'border-transparent hover:border-darkbg-600'}
          text-white transition-all duration-200 min-w-[140px]
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className="text-sm font-medium">{selectedOption?.label}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>

      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{ top: position.top, left: position.left, width: position.width }}
              className="fixed z-[100] bg-darkbg-950/95 backdrop-blur-xl border border-darkbg-600 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
            >
            {options.map((option, index) => {
              const isSelected = option.value === value
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.1, delay: index * 0.03 }}
                  onClick={() => handleSelect(option.value)}
                  className={`
                    relative w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm
                    transition-all duration-150
                    ${isSelected
                      ? 'bg-green-600/20 text-green-400'
                      : 'text-gray-300 hover:text-white hover:bg-darkbg-700 hover:pl-5'
                    }
                  `}
                >
                  <span className="font-medium">{option.label}</span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </div>
  )
}
