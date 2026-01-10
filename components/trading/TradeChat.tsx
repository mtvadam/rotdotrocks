'use client'

import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react'
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

interface MentionUser {
  id: string
  robloxUsername: string
  robloxUserId: string
  robloxAvatarUrl?: string | null
}

interface TradeChatProps {
  tradeId: string
  tradeStatus: string
  tradeOwnerId: string
}

// Regex to find roblox.com URLs for making them clickable
const ROBLOX_URL_REGEX = /https?:\/\/(?:www\.)?(?:[a-z0-9-]+\.)*roblox\.com[^\s<>"{}|\\^`\[\]]*/gi

// Regex to find @mentions in messages
const MENTION_REGEX = /@([a-zA-Z0-9_]+)/g

// Render message content with clickable links and highlighted mentions
function renderMessageContent(content: string, currentUserId?: string) {
  // First, find all URLs and mentions with their positions
  const elements: Array<{ type: 'text' | 'url' | 'mention'; content: string; start: number; end: number }> = []

  // Find URLs
  const urlRegex = new RegExp(ROBLOX_URL_REGEX.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = urlRegex.exec(content)) !== null) {
    elements.push({ type: 'url', content: match[0], start: match.index, end: match.index + match[0].length })
  }

  // Find mentions
  const mentionRegex = new RegExp(MENTION_REGEX.source, 'g')
  while ((match = mentionRegex.exec(content)) !== null) {
    elements.push({ type: 'mention', content: match[0], start: match.index, end: match.index + match[0].length })
  }

  // Sort by position
  elements.sort((a, b) => a.start - b.start)

  // Build result
  const result: (string | JSX.Element)[] = []
  let lastIndex = 0

  elements.forEach((el, i) => {
    // Add text before this element
    if (el.start > lastIndex) {
      result.push(content.slice(lastIndex, el.start))
    }

    if (el.type === 'url') {
      result.push(
        <a
          key={`url-${i}`}
          href={el.content}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-400 hover:text-green-300 underline inline-flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {el.content.length > 50 ? el.content.slice(0, 50) + '...' : el.content}
          <ExternalLink className="w-3 h-3 inline-block" />
        </a>
      )
    } else if (el.type === 'mention') {
      result.push(
        <span
          key={`mention-${i}`}
          className="text-cyan-400 font-medium bg-cyan-500/20 px-1 rounded"
        >
          {el.content}
        </span>
      )
    }

    lastIndex = el.end
  })

  // Add remaining text
  if (lastIndex < content.length) {
    result.push(content.slice(lastIndex))
  }

  return result.length > 0 ? result : content
}

// Mention autocomplete dropdown
function MentionAutocomplete({
  query,
  onSelect,
  onClose,
  selectedIndex,
}: {
  query: string
  onSelect: (user: MentionUser) => void
  onClose: () => void
  selectedIndex: number
}) {
  const [users, setUsers] = useState<MentionUser[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query) {
      setUsers([])
      return
    }

    const controller = new AbortController()
    setLoading(true)

    fetch(`/api/users/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || [])
        setLoading(false)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to search users:', err)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [query])

  if (!query) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full left-0 right-0 mb-2 bg-darkbg-800 border border-darkbg-600 rounded-lg shadow-xl overflow-hidden z-50"
    >
      {loading ? (
        <div className="px-3 py-2 flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Searching...
        </div>
      ) : users.length === 0 ? (
        <div className="px-3 py-2 text-gray-500 text-sm">No users found</div>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          {users.map((user, index) => (
            <button
              key={user.id}
              onClick={() => onSelect(user)}
              className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-darkbg-700 transition-colors ${
                index === selectedIndex ? 'bg-darkbg-700' : ''
              }`}
            >
              <RobloxAvatar
                avatarUrl={user.robloxAvatarUrl}
                username={user.robloxUsername}
                size="xs"
              />
              <span className="text-white text-sm font-medium">{user.robloxUsername}</span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// Message component
const ChatMessage = memo(function ChatMessage({
  message,
  isOwn,
  isTradeOwner,
  currentUserId,
}: {
  message: Message
  isOwn: boolean
  isTradeOwner: boolean
  currentUserId?: string
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
            renderMessageContent(message.content, currentUserId)
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

  // Mention state
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const [mentionStartPos, setMentionStartPos] = useState(0)

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

  // Handle input change with mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || value.length
    setInput(value)

    // Check if we're typing a mention
    const textBeforeCursor = value.slice(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/)

    if (mentionMatch) {
      setShowMentions(true)
      setMentionQuery(mentionMatch[1])
      setMentionStartPos(mentionMatch.index || 0)
      setMentionIndex(0)
    } else {
      setShowMentions(false)
      setMentionQuery('')
    }
  }

  // Handle selecting a mention
  const handleSelectMention = (mentionUser: MentionUser) => {
    const beforeMention = input.slice(0, mentionStartPos)
    const afterMention = input.slice(mentionStartPos + mentionQuery.length + 1) // +1 for @
    const newValue = `${beforeMention}@${mentionUser.robloxUsername} ${afterMention}`
    setInput(newValue)
    setShowMentions(false)
    setMentionQuery('')
    inputRef.current?.focus()
  }

  // Handle keyboard navigation in mention list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showMentions) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMentionIndex((i) => i + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMentionIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && showMentions) {
      e.preventDefault()
      // Will be handled by the autocomplete component
    } else if (e.key === 'Escape') {
      setShowMentions(false)
    }
  }

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (showMentions) return // Don't send if mention dropdown is open
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
            <p className="text-gray-600 text-xs mt-0.5">Use @username to mention someone</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isOwn={message.user.id === user.id}
                isTradeOwner={message.user.id === tradeOwnerId}
                currentUserId={user.id}
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
      <form onSubmit={handleSend} className="p-3 border-t border-darkbg-700 relative">
        {/* Mention autocomplete */}
        <AnimatePresence>
          {showMentions && (
            <MentionAutocomplete
              query={mentionQuery}
              onSelect={handleSelectMention}
              onClose={() => setShowMentions(false)}
              selectedIndex={mentionIndex}
            />
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isChatEnabled ? "Type a message... Use @ to mention" : "Chat disabled"}
            disabled={!isChatEnabled || sending}
            maxLength={1000}
            className="flex-1 px-3 py-2 bg-darkbg-800 border border-darkbg-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending || !isChatEnabled || showMentions}
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
          Use @username to mention someone. Only roblox.com links allowed.
        </p>
      </form>
    </div>
  )
}
