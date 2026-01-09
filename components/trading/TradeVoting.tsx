'use client'

import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, Scale } from 'lucide-react'

interface VoteData {
  votes: {
    WIN: number
    FAIR: number
    LOSS: number
  }
  userVote: 'WIN' | 'FAIR' | 'LOSS' | null
  totalVotes: number
}

type VoteType = 'WIN' | 'FAIR' | 'LOSS'

const VOTE_CONFIG = [
  {
    type: 'WIN' as VoteType,
    label: 'W',
    fullLabel: 'Win',
    icon: ThumbsUp,
    activeClass: 'bg-green-600 text-white',
    inactiveClass: 'text-green-400 hover:bg-green-900/40',
  },
  {
    type: 'FAIR' as VoteType,
    label: 'F',
    fullLabel: 'Fair',
    icon: Scale,
    activeClass: 'bg-amber-600 text-white',
    inactiveClass: 'text-amber-400 hover:bg-amber-900/40',
  },
  {
    type: 'LOSS' as VoteType,
    label: 'L',
    fullLabel: 'Loss',
    icon: ThumbsDown,
    activeClass: 'bg-red-600 text-white',
    inactiveClass: 'text-red-400 hover:bg-red-900/40',
  },
]

// Full voting UI for trade detail page
export function TradeVoting({ tradeId }: { tradeId: string }) {
  const [data, setData] = useState<VoteData>({
    votes: { WIN: 0, FAIR: 0, LOSS: 0 },
    userVote: null,
    totalVotes: 0,
  })
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)

  const fetchVotes = async () => {
    try {
      const res = await fetch(`/api/trades/${tradeId}/vote`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to fetch votes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId])

  const handleVote = async (vote: VoteType) => {
    if (voting) return
    setVoting(true)

    // Optimistic update
    const prevData = data
    const isRemoving = data.userVote === vote

    setData(prev => {
      const newVotes = { ...prev.votes }
      if (isRemoving) {
        newVotes[vote] = Math.max(0, newVotes[vote] - 1)
        return { ...prev, votes: newVotes, userVote: null, totalVotes: prev.totalVotes - 1 }
      } else {
        if (prev.userVote) {
          newVotes[prev.userVote] = Math.max(0, newVotes[prev.userVote] - 1)
        }
        newVotes[vote] = newVotes[vote] + 1
        return {
          ...prev,
          votes: newVotes,
          userVote: vote,
          totalVotes: prev.userVote ? prev.totalVotes : prev.totalVotes + 1
        }
      }
    })

    try {
      if (isRemoving) {
        const res = await fetch(`/api/trades/${tradeId}/vote`, { method: 'DELETE' })
        if (res.ok) {
          const json = await res.json()
          setData(json)
        } else {
          setData(prevData) // Rollback
        }
      } else {
        const res = await fetch(`/api/trades/${tradeId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vote }),
        })
        if (res.ok) {
          const json = await res.json()
          setData(json)
        } else {
          setData(prevData) // Rollback
        }
      }
    } catch (err) {
      console.error('Failed to vote:', err)
      setData(prevData) // Rollback
    } finally {
      setVoting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-sm text-gray-400">
        Rate this trade
        {data.totalVotes > 0 && (
          <span className="ml-1 text-gray-500">({data.totalVotes} vote{data.totalVotes !== 1 ? 's' : ''})</span>
        )}
      </p>
      <div className="flex gap-2">
        {VOTE_CONFIG.map(({ type, fullLabel, icon: Icon, activeClass, inactiveClass }) => {
          const isActive = data.userVote === type
          const count = data.votes[type]

          return (
            <button
              key={type}
              onClick={() => handleVote(type)}
              disabled={voting || loading}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                ${isActive ? activeClass : `bg-darkbg-800 ${inactiveClass}`}
                ${(voting || loading) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{fullLabel}</span>
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-darkbg-700'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Compact voting UI for trade cards
export function CompactTradeVoting({ tradeId }: { tradeId: string }) {
  const [data, setData] = useState<VoteData>({
    votes: { WIN: 0, FAIR: 0, LOSS: 0 },
    userVote: null,
    totalVotes: 0,
  })
  const [loaded, setLoaded] = useState(false)
  const [voting, setVoting] = useState(false)

  const fetchVotes = async () => {
    try {
      const res = await fetch(`/api/trades/${tradeId}/vote`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to fetch votes:', err)
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => {
    fetchVotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId])

  const handleVote = async (e: React.MouseEvent, vote: VoteType) => {
    e.preventDefault()
    e.stopPropagation()

    if (voting) return
    setVoting(true)

    const prevData = data
    const isRemoving = data.userVote === vote

    // Optimistic update
    setData(prev => {
      const newVotes = { ...prev.votes }
      if (isRemoving) {
        newVotes[vote] = Math.max(0, newVotes[vote] - 1)
        return { ...prev, votes: newVotes, userVote: null, totalVotes: prev.totalVotes - 1 }
      } else {
        if (prev.userVote) {
          newVotes[prev.userVote] = Math.max(0, newVotes[prev.userVote] - 1)
        }
        newVotes[vote] = newVotes[vote] + 1
        return {
          ...prev,
          votes: newVotes,
          userVote: vote,
          totalVotes: prev.userVote ? prev.totalVotes : prev.totalVotes + 1
        }
      }
    })

    try {
      if (isRemoving) {
        const res = await fetch(`/api/trades/${tradeId}/vote`, { method: 'DELETE' })
        if (res.ok) {
          const json = await res.json()
          setData(json)
        } else {
          setData(prevData)
        }
      } else {
        const res = await fetch(`/api/trades/${tradeId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vote }),
        })
        if (res.ok) {
          const json = await res.json()
          setData(json)
        } else {
          setData(prevData)
        }
      }
    } catch (err) {
      console.error('Failed to vote:', err)
      setData(prevData)
    } finally {
      setVoting(false)
    }
  }

  return (
    <div
      className="flex items-center gap-1"
      onClick={e => e.stopPropagation()}
    >
      {VOTE_CONFIG.map(({ type, label, icon: Icon, activeClass, inactiveClass }) => {
        const isActive = data.userVote === type
        const count = data.votes[type]

        return (
          <button
            key={type}
            onClick={(e) => handleVote(e, type)}
            disabled={voting || !loaded}
            className={`
              flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all
              ${isActive ? activeClass : `bg-darkbg-800/80 ${inactiveClass}`}
              ${(voting || !loaded) ? 'opacity-50' : ''}
            `}
          >
            <Icon className="w-3 h-3" />
            {count > 0 && <span>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
