'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Send,
  X,
  Smile,
  Gift,
  Crown,
  Shield,
  ChevronDown,
  Volume2,
  VolumeX,
  Settings,
  Users,
} from 'lucide-react'
import { Button, IconButton } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, VipBadge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/Providers'
import type { VipTier, UserRole } from '@/lib/supabase/types'

interface ChatMessage {
  id: string
  user: {
    id: string
    username: string
    avatar?: string
    vipTier: VipTier
    role: UserRole
  }
  content: string
  timestamp: Date
  tip?: {
    amount: number
    currency: string
    recipientId: string
    recipientName: string
  }
}

interface ChatRoom {
  id: string
  name: string
  type: 'global' | 'game' | 'vip'
  unread: number
}

// Mock messages
const mockMessages: ChatMessage[] = [
  {
    id: '1',
    user: { id: '1', username: 'CryptoKing', vipTier: 'platinum', role: 'user' },
    content: 'Just hit 10x on crash! LFG!!!',
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: '2',
    user: { id: '2', username: 'LuckyDice', vipTier: 'gold', role: 'user' },
    content: 'Nice one! What was your cashout strategy?',
    timestamp: new Date(Date.now() - 240000),
  },
  {
    id: '3',
    user: { id: '3', username: 'ModeratorMike', vipTier: 'diamond', role: 'moderator' },
    content: 'Remember to gamble responsibly everyone!',
    timestamp: new Date(Date.now() - 180000),
  },
  {
    id: '4',
    user: { id: '4', username: 'NewPlayer', vipTier: 'bronze', role: 'user' },
    content: 'Hey everyone, just joined! Any tips for beginners?',
    timestamp: new Date(Date.now() - 120000),
  },
  {
    id: '5',
    user: { id: '1', username: 'CryptoKing', vipTier: 'platinum', role: 'user' },
    content: 'Start small and learn the games first. Mines is great for beginners!',
    timestamp: new Date(Date.now() - 60000),
  },
]

const chatRooms: ChatRoom[] = [
  { id: 'global', name: 'Global', type: 'global', unread: 0 },
  { id: 'vip', name: 'VIP Lounge', type: 'vip', unread: 2 },
]

// Role/VIP badge display
function UserBadges({ role, vipTier }: { role: UserRole; vipTier: VipTier }) {
  return (
    <div className="flex items-center gap-1">
      {role === 'moderator' && (
        <Shield className="w-3 h-3 text-neon-green" title="Moderator" />
      )}
      {role === 'admin' && (
        <Shield className="w-3 h-3 text-status-error" title="Admin" />
      )}
      {vipTier !== 'bronze' && (
        <VipBadge tier={vipTier} showLabel={false} size="xs" />
      )}
    </div>
  )
}

export function ChatWidget() {
  const { user } = useAuth()

  // State
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages)
  const [inputValue, setInputValue] = useState('')
  const [activeRoom, setActiveRoom] = useState<string>('global')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showRooms, setShowRooms] = useState(false)
  const [onlineCount, setOnlineCount] = useState(1234)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom()
    }
  }, [messages, isOpen, isMinimized, scrollToBottom])

  // Simulate receiving messages
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      // Randomly add a mock message
      if (Math.random() > 0.7) {
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          user: {
            id: Math.random().toString(),
            username: ['HighRoller', 'BetMaster', 'WhaleAlert', 'GamingPro'][Math.floor(Math.random() * 4)],
            vipTier: ['bronze', 'silver', 'gold', 'platinum'][Math.floor(Math.random() * 4)] as VipTier,
            role: 'user',
          },
          content: [
            'Just won big on dice!',
            'Anyone else playing crash?',
            'This game is addicting lol',
            'GG everyone!',
            'What a run!',
          ][Math.floor(Math.random() * 5)],
          timestamp: new Date(),
        }
        setMessages(prev => [...prev.slice(-49), newMessage])
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isOpen])

  // Send message
  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim() || !user) return

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar || undefined,
        vipTier: user.vipTier as VipTier,
        role: user.role as UserRole,
      },
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, newMessage])
    setInputValue('')
    inputRef.current?.focus()
  }, [inputValue, user])

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className={cn(
              'fixed bottom-4 right-4 z-50',
              'w-14 h-14 rounded-full',
              'bg-neon-pink text-white shadow-lg shadow-neon-pink/30',
              'flex items-center justify-center',
              'hover:scale-105 transition-transform'
            )}
          >
            <MessageSquare className="w-6 h-6" />
            {/* Unread indicator */}
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-status-error rounded-full text-xs flex items-center justify-center">
              3
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              'fixed bottom-4 right-4 z-50',
              'w-80 sm:w-96',
              'bg-bg-secondary border border-border-default rounded-xl',
              'shadow-2xl overflow-hidden',
              'flex flex-col',
              isMinimized ? 'h-12' : 'h-[500px]'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-12 bg-bg-tertiary border-b border-border-default flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-neon-pink" />
                <span className="font-medium text-text-primary">Chat</span>
                <Badge variant="success" size="sm" dot>
                  {onlineCount.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1.5 rounded hover:bg-bg-hover transition-colors"
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-text-tertiary" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-text-tertiary" />
                  )}
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded hover:bg-bg-hover transition-colors"
                >
                  <ChevronDown className={cn(
                    'w-4 h-4 text-text-tertiary transition-transform',
                    isMinimized && 'rotate-180'
                  )} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded hover:bg-bg-hover transition-colors"
                >
                  <X className="w-4 h-4 text-text-tertiary" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <>
                {/* Room Selector */}
                <div className="flex items-center gap-1 px-2 py-2 border-b border-border-default bg-bg-tertiary/50">
                  {chatRooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setActiveRoom(room.id)}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        activeRoom === room.id
                          ? 'bg-neon-pink/20 text-neon-pink'
                          : 'text-text-secondary hover:bg-bg-hover'
                      )}
                    >
                      {room.type === 'vip' && <Crown className="w-3 h-3 text-neon-yellow" />}
                      {room.name}
                      {room.unread > 0 && (
                        <span className="w-4 h-4 bg-status-error rounded-full text-[10px] flex items-center justify-center text-white">
                          {room.unread}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group"
                    >
                      <div className="flex items-start gap-2">
                        <Avatar
                          name={message.user.username}
                          src={message.user.avatar}
                          size="xs"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              'font-medium text-sm truncate',
                              message.user.role === 'moderator' && 'text-neon-green',
                              message.user.role === 'admin' && 'text-status-error',
                              message.user.role === 'user' && 'text-text-primary'
                            )}>
                              {message.user.username}
                            </span>
                            <UserBadges role={message.user.role} vipTier={message.user.vipTier} />
                            <span className="text-[10px] text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary break-words">
                            {message.content}
                          </p>
                          {message.tip && (
                            <div className="mt-1 inline-flex items-center gap-1 px-2 py-1 rounded bg-neon-yellow/10 text-neon-yellow text-xs">
                              <Gift className="w-3 h-3" />
                              Tipped {message.tip.recipientName} {message.tip.amount} {message.tip.currency}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-border-default bg-bg-tertiary/50">
                  {user ? (
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-tertiary">
                        <Smile className="w-5 h-5" />
                      </button>
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        maxLength={500}
                        className="flex-1 bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-neon-pink"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim()}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          inputValue.trim()
                            ? 'bg-neon-pink text-white hover:bg-neon-pink/80'
                            : 'bg-bg-tertiary text-text-tertiary'
                        )}
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-text-secondary">
                        <a href="/login" className="text-neon-pink hover:underline">Sign in</a>
                        {' '}to chat
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
