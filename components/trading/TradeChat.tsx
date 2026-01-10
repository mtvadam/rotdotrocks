'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, AlertCircle, ExternalLink, Loader2, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { RobloxAvatar } from '@/components/ui'
import { useAuth } from '@/components/Providers'

interface Message {
  id: string
  content: string
  isSystem: boolean
  createdAt: string
  user: {
    id: string
    robloxUsername: string
    robloxUserId: string
    robloxAvatarUrl?: string | null
  }
}

interface TradeChatProps {
  tradeId: string
  tradeStatus: string
  tradeOwnerId: string
}

// Regex to find roblox.com URLs for making them clickable
const ROBLOX_URL_REGEX = /https?:\/\/(?:www\.)?(?:[a-z0-9-]+\.)*roblox\.com[^\s<>"{}|\\^`\[\]]*/gi

// Make roblox.com links clickable
function renderMessageContent(content: string) {
  const parts: (string | JSX.Element)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const regex = new RegExp(ROBLOX_URL_REGEX.source, 'gi')
  while ((match = regex.exec(content)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    // Add the clickable link
    parts.push(
      <a
        key={match.index}
        href={match[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-green-400 hover:text-green-300 underline inline-flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        {match[0].length > 50 ? match[0].slice(0, 50) + '...' : match[0]}
        <ExternalLink className="w-3 h-3 inline-block" />
      </a>
    )
    lastIndex = match.index + match[0].length
  }
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts.length > 0 ? parts : content
}

// Message component
const ChatMessage = memo(function ChatMessage({
  message,
  isOwn,
  isTradeOwner,
}: {
  message: Message
  isOwn: boolean
  isTradeOwner: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <RobloxAvatar
        avatarUrl={message.user.robloxAvatarUrl}
        username={message.user.robloxUsername}
        size="sm"
      />
      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-xs font-medium ${isTradeOwner ? 'text-green-400' : 'text-gray-400'}`}>
            {message.user.robloxUsername}
            {isTradeOwner && <span className="text-[10px] text-green-500/70 ml-1">(OP)</span>}
          </span>
          <span className="text-[10px] text-gray-600">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
        </div>
        <div
          className={`px-3 py-2 rounded-xl text-sm break-words ${
            isOwn
              ? 'bg-green-600 text-white rounded-tr-sm'
              : 'bg-darkbg-700 text-gray-200 rounded-tl-sm'
          }`}
        >
          {message.isSystem ? (
            <span className="italic text-gray-400">{message.content}</span>
          ) : (
            renderMessageContent(message.content)
          )}
        </div>
      </div>
    </motion.div>
  )
})

export function TradeChat({ tradeId, tradeStatus, tradeOwnerId }: TradeChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [blockedLinkWarning, setBlockedLinkWarning] = useState<string[] | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isChatEnabled = ['OPEN', 'PENDING'].includes(tradeStatus)

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/trades/${tradeId}/messages`)
      if (!res.ok) throw new Error('Failed to fetch messages')
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setLoading(false)
    }
  }, [tradeId])

  // Initial fetch
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!isChatEnabled) return
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchMessages, isChatEnabled])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      if (isNearBottom) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [messages])

  // Track scroll position for scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      setShowScrollButton(!isNearBottom && messages.length > 5)
    }
  }, [messages.length])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending || !user || !isChatEnabled) return

    const messageContent = input.trim()
    setInput('')
    setSending(true)
    setError(null)
    setBlockedLinkWarning(null)

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      isSystem: false,
      createdAt: new Date().toISOString(),
      user: {
        id: user.id,
        robloxUsername: user.robloxUsername,
        robloxUserId: user.robloxUserId || '',
        robloxAvatarUrl: user.robloxAvatarUrl,
      },
    }
    setMessages((prev) => [...prev, optimisticMessage])

    try {
      const res = await fetch(`/api/trades/${tradeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMessage.id ? data.message : m))
      )

      // Show warning if links were blocked
      if (data.blockedLinks && data.blockedLinks.length > 0) {
        setBlockedLinkWarning(data.blockedLinks)
        setTimeout(() => setBlockedLinkWarning(null), 5000)
      }

      // Focus input again
      inputRef.current?.focus()
    } catch (err) {
      console.error('Failed to send message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
      setInput(messageContent) // Restore input
      setTimeout(() => setError(null), 3000)
    } finally {
      setSending(false)
    }
  }

  if (!user) {
    return (
      <div className="bg-darkbg-800/50 rounded-xl p-6 text-center">
        <MessageCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">Log in to chat about this trade</p>
      </div>
    )
  }

  return (
    <div className="bg-darkbg-900/90 backdrop-blur-sm rounded-xl border border-darkbg-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-darkbg-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-500" />
          <h3 className="font-semibold text-white text-sm">Trade Chat</h3>
          <span className="text-xs text-gray-500">({messages.length} messages)</span>
        </div>
        {!isChatEnabled && (
          <span className="text-xs text-gray-500 bg-darkbg-700 px-2 py-1 rounded">
            Chat disabled - trade {tradeStatus.toLowerCase()}
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="h-64 overflow-y-auto p-4 space-y-3 scrollbar-green relative"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="w-10 h-10 text-gray-600 mb-2" />
            <p className="text-gray-500 text-sm">No messages yet</p>
            <p className="text-gray-600 text-xs mt-1">Start the conversation to negotiate!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwn={message.user.id === user.id}
                isTradeOwner={message.user.id === tradeOwnerId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-2 right-2 p-2 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Link warning */}
      <AnimatePresence>
        {blockedLinkWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-amber-900/30 border-t border-amber-500/30"
          >
            <div className="flex items-start gap-2 text-amber-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Some links were removed</p>
                <p className="text-amber-400/70">Only roblox.com links are allowed for safety</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-red-900/30 border-t border-red-500/30"
          >
            <p className="text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-darkbg-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isChatEnabled ? "Type a message... (only roblox.com links allowed)" : "Chat disabled"}
            disabled={!isChatEnabled || sending}
            maxLength={1000}
            className="flex-1 px-3 py-2 bg-darkbg-800 border border-darkbg-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending || !isChatEnabled}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 px-1">
          Only roblox.com links are allowed. Other links will be removed.
        </p>
      </form>
    </div>
  )
}
