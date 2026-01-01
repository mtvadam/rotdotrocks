'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { easeOut } from '@/lib/animations'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const toastIcons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const toastColors: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'bg-green-900/20',
    border: 'border-green-800',
    icon: 'text-green-500',
    text: 'text-green-200',
  },
  error: {
    bg: 'bg-red-900/20',
    border: 'border-red-800',
    icon: 'text-red-500',
    text: 'text-red-200',
  },
  warning: {
    bg: 'bg-amber-900/20',
    border: 'border-amber-800',
    icon: 'text-amber-500',
    text: 'text-amber-200',
  },
  info: {
    bg: 'bg-blue-900/20',
    border: 'border-blue-800',
    icon: 'text-blue-500',
    text: 'text-blue-200',
  },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const Icon = toastIcons[toast.type]
  const colors = toastColors[toast.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: easeOut }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm
        ${colors.bg} ${colors.border}
      `}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 }}
      >
        <Icon className={`w-5 h-5 ${colors.icon}`} />
      </motion.div>
      <p className={`flex-1 text-sm font-medium ${colors.text}`}>{toast.message}</p>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onRemove}
        className="p-1 rounded-lg hover:bg-white/5 transition-colors"
      >
        <X className="w-4 h-4 text-gray-500" />
      </motion.button>
    </motion.div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: Toast = { id, type, message, duration }

    setToasts((prev) => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }, [removeToast])

  const success = useCallback((message: string, duration?: number) => {
    addToast('success', message, duration)
  }, [addToast])

  const error = useCallback((message: string, duration?: number) => {
    addToast('error', message, duration)
  }, [addToast])

  const warning = useCallback((message: string, duration?: number) => {
    addToast('warning', message, duration)
  }, [addToast])

  const info = useCallback((message: string, duration?: number) => {
    addToast('info', message, duration)
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
