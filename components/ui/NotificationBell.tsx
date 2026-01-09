'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, CheckCheck, ArrowRightLeft, MessageSquare, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { RobloxAvatar } from './RobloxAvatar'

interface Notification {
  id: string
  type: 'TRADE_REQUEST' | 'COUNTER_OFFER' | 'REQUEST_ACCEPTED' | 'REQUEST_DECLINED' | 'COUNTER_ACCEPTED'
  message: string
  isRead: boolean
  tradeId: string | null
  createdAt: string
  fromUser: {
    id: string
    robloxUsername: string
    robloxAvatarUrl: string | null
  } | null
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, right: 0 })

  // For portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Update position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    setLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
    setLoading(false)
  }

  // Get icon based on notification type
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'TRADE_REQUEST':
        return <ArrowRightLeft className="w-4 h-4 text-blue-400" />
      case 'COUNTER_OFFER':
        return <MessageSquare className="w-4 h-4 text-purple-400" />
      case 'REQUEST_ACCEPTED':
      case 'COUNTER_ACCEPTED':
        return <Check className="w-4 h-4 text-green-400" />
      case 'REQUEST_DECLINED':
        return <X className="w-4 h-4 text-red-400" />
      default:
        return <Bell className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <>
      {/* Bell Button */}
      <motion.button
        ref={buttonRef}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown via Portal */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: position.top,
                right: position.right,
              }}
              className="w-80 sm:w-96 bg-darkbg-900/90 backdrop-blur-xl border border-darkbg-700 rounded-xl shadow-2xl overflow-hidden z-[100]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-darkbg-700">
                <h3 className="font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={notification.tradeId ? `/trading/${notification.tradeId}` : '#'}
                      onClick={() => {
                        if (!notification.isRead) {
                          markAsRead(notification.id)
                        }
                        setIsOpen(false)
                      }}
                      className={`flex items-start gap-3 p-3 hover:bg-darkbg-800 transition-colors border-b border-darkbg-800 last:border-0 ${
                        !notification.isRead ? 'bg-darkbg-800/50' : ''
                      }`}
                    >
                      {/* Avatar or Icon */}
                      <div className="flex-shrink-0">
                        {notification.fromUser ? (
                          <RobloxAvatar
                            avatarUrl={notification.fromUser.robloxAvatarUrl}
                            username={notification.fromUser.robloxUsername}
                            size="sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-darkbg-700 flex items-center justify-center">
                            {getIcon(notification.type)}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.isRead ? 'text-gray-400' : 'text-white'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.isRead && (
                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                      )}
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
