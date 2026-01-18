'use client'

import { useEffect, useRef, type ReactNode, type HTMLAttributes } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  footer?: ReactNode
  className?: string
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-[95vw] max-h-[95vh]',
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className,
}: ModalProps) {
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Lock body scroll and manage focus
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      previousActiveElement.current?.focus()
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
    }

    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, closeOnEscape])

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleOverlayClick}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative w-full',
              sizes[size],
              'bg-bg-secondary border border-border-default rounded-lg',
              'shadow-2xl overflow-hidden',
              className
            )}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between p-4 border-b border-border-default">
                <div className="flex-1 min-w-0 pr-4">
                  {title && (
                    <h2 className="font-heading text-lg font-semibold text-text-primary">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1 text-sm text-text-secondary">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className={cn(
                      'flex-shrink-0 p-1.5 rounded-md',
                      'text-text-tertiary hover:text-text-primary',
                      'hover:bg-bg-tertiary transition-colors'
                    )}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 p-4 border-t border-border-default">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Confirm Modal Helper
export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    />
  )
}

// Alert Modal (single button)
export interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  buttonText?: string
  variant?: 'default' | 'success' | 'error'
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  description,
  buttonText = 'OK',
  variant = 'default',
}: AlertModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <Button
          variant={variant === 'error' ? 'danger' : variant === 'success' ? 'success' : 'primary'}
          onClick={onClose}
        >
          {buttonText}
        </Button>
      }
    />
  )
}
