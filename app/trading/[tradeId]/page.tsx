'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRightLeft, BadgeCheck, MessageSquare, Clock, Send, Trash2, Check, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { TradeItemDisplay, TradeBuilderModal } from '@/components/trading'
import { useAuth } from '@/components/Providers'
import { RobloxAvatar } from '@/components/ui'

interface TradeItem {
  id: string
  side: 'OFFER' | 'REQUEST'
  brainrot: {
    id: string
    name: string
    localImage: string | null
    baseIncome: string
  }
  mutation?: {
    id: string
    name: string
    multiplier: number
  } | null
  event?: {
    id: string
    name: string
  } | null
  traits?: Array<{
    trait: {
      id: string
      name: string
      localImage: string | null
      multiplier: number
    }
  }>
  calculatedIncome?: string | null
}

interface Trade {
  id: string
  status: string
  isVerified: boolean
  createdAt: string
  user: {
    id: string
    robloxUsername: string
    robloxUserId: string
    robloxAvatarUrl?: string | null
  }
  items: TradeItem[]
  counterOffers?: Array<{
    id: string
    status: string
    createdAt: string
    user: {
      id: string
      robloxUsername: string
      robloxUserId: string
      robloxAvatarUrl?: string | null
    }
    items: TradeItem[]
  }>
  requests?: Array<{
    id: string
    status: string
    message?: string
    createdAt: string
    requester: {
      id: string
      robloxUsername: string
      robloxUserId: string
      robloxAvatarUrl?: string | null
    }
  }>
}

export default function TradePage({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = use(params)
  const router = useRouter()
  const { user } = useAuth()
  const [trade, setTrade] = useState<Trade | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCounterOffer, setShowCounterOffer] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchTrade = async () => {
    try {
      const res = await fetch(`/api/trades/${tradeId}`)
      const data = await res.json()
      if (data.trade) {
        setTrade(data.trade)
      }
    } catch (err) {
      console.error('Failed to fetch trade:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrade()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId])

  const isOwner = user?.id === trade?.user.id
  const isAdmin = user?.role === 'ADMIN'

  const handleUpdateStatus = async (status: string) => {
    if (!trade) return
    setActionLoading(status)
    try {
      await fetch(`/api/trades/${trade.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchTrade()
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleVerify = async (isVerified: boolean) => {
    if (!trade) return
    setActionLoading('verify')
    try {
      await fetch(`/api/trades/${trade.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified }),
      })
      fetchTrade()
    } catch (err) {
      console.error('Failed to verify:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleAcceptCounter = async (counterOfferId: string) => {
    if (!trade) return
    setActionLoading(counterOfferId)
    try {
      await fetch(`/api/trades/${trade.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptCounterOfferId: counterOfferId }),
      })
      fetchTrade()
    } catch (err) {
      console.error('Failed to accept counter:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRequestResponse = async (requestId: string, status: 'ACCEPTED' | 'DECLINED') => {
    setActionLoading(requestId)
    try {
      await fetch(`/api/trade-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchTrade()
    } catch (err) {
      console.error('Failed to respond to request:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendRequest = async () => {
    if (!trade) return
    setActionLoading('request')
    try {
      await fetch('/api/trade-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId: trade.id }),
      })
      fetchTrade()
    } catch (err) {
      console.error('Failed to send request:', err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-darkbg-950">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="h-5 w-32 skeleton rounded mb-6" />
          <div className="bg-darkbg-900 rounded-2xl border border-darkbg-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 skeleton rounded-full" />
              <div className="h-5 w-32 skeleton rounded" />
              <div className="h-5 w-20 skeleton rounded" />
            </div>
            <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4">
              <div className="space-y-3">
                <div className="h-4 w-20 skeleton rounded" />
                <div className="h-16 w-full skeleton rounded-lg" />
                <div className="h-16 w-full skeleton rounded-lg" />
              </div>
              <div className="hidden md:flex items-center">
                <div className="h-6 w-6 skeleton rounded" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-24 skeleton rounded" />
                <div className="h-16 w-full skeleton rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!trade) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-darkbg-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Trade not found</p>
          <Link href="/trading" className="text-green-500 hover:underline">
            Back to Trading
          </Link>
        </div>
      </div>
    )
  }

  const offerItems = trade.items.filter((i) => i.side === 'OFFER')
  const requestItems = trade.items.filter((i) => i.side === 'REQUEST')

  return (
    <div className="min-h-[calc(100vh-64px)] bg-darkbg-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Link */}
        <Link
          href="/trading"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-green-500 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Trading
        </Link>

        {/* Trade Card */}
        <div className="bg-darkbg-900 rounded-2xl border border-darkbg-700 p-6 mb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <RobloxAvatar
                avatarUrl={trade.user.robloxAvatarUrl}
                username={trade.user.robloxUsername}
                size="md"
              />
              <span className="text-lg font-bold text-white">
                {trade.user.robloxUsername}
              </span>
              {trade.isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/30 text-green-400 text-sm font-medium rounded-lg">
                  <BadgeCheck className="w-4 h-4" />
                  Verified
                </span>
              )}
              <span className={`px-2 py-1 text-sm font-medium rounded-lg ${
                trade.status === 'OPEN' ? 'bg-blue-900/30 text-blue-400' :
                trade.status === 'PENDING' ? 'bg-amber-900/30 text-amber-400' :
                trade.status === 'COMPLETED' ? 'bg-green-900/30 text-green-400' :
                'bg-darkbg-700 text-gray-400'
              }`}>
                {trade.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              {formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })}
            </div>
          </div>

          {/* Trade Content */}
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 mb-6">
            {/* Offer Side */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                Offering
              </h3>
              <div className="space-y-2">
                {offerItems.map((item) => (
                  <TradeItemDisplay key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <ArrowRightLeft className="w-6 h-6 text-gray-400" />
            </div>

            {/* Request Side */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
                Looking For
              </h3>
              <div className="space-y-2">
                {requestItems.map((item) => (
                  <TradeItemDisplay key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-darkbg-700">
            {/* Owner Actions */}
            {isOwner && trade.status === 'OPEN' && (
              <>
                <button
                  onClick={() => handleUpdateStatus('CANCELLED')}
                  disabled={actionLoading === 'CANCELLED'}
                  className="px-4 py-2 bg-red-900/30 text-red-400 rounded-lg font-medium hover:bg-red-900/50 transition-colors"
                >
                  Cancel Trade
                </button>
              </>
            )}
            {isOwner && trade.status === 'PENDING' && (
              <button
                onClick={() => handleUpdateStatus('COMPLETED')}
                disabled={actionLoading === 'COMPLETED'}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Mark Completed
              </button>
            )}

            {/* Mod Actions */}
            {isAdmin && (
              <button
                onClick={() => handleVerify(!trade.isVerified)}
                disabled={actionLoading === 'verify'}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  trade.isVerified
                    ? 'bg-darkbg-800 text-gray-300'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {trade.isVerified ? 'Remove Verification' : 'Verify Trade'}
              </button>
            )}

            {/* Non-owner Actions */}
            {user && !isOwner && trade.status === 'OPEN' && (
              <>
                <button
                  onClick={() => setShowCounterOffer(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Counter Offer
                </button>
                <button
                  onClick={handleSendRequest}
                  disabled={actionLoading === 'request'}
                  className="px-4 py-2 bg-darkbg-800 text-gray-300 rounded-lg font-medium hover:bg-darkbg-700 transition-colors"
                >
                  <Send className="w-4 h-4 inline mr-2" />
                  Request to Trade
                </button>
              </>
            )}
          </div>
        </div>

        {/* Counter Offers */}
        {trade.counterOffers && trade.counterOffers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Counter Offers ({trade.counterOffers.length})
            </h2>
            <div className="space-y-4">
              {trade.counterOffers.map((counter) => {
                const counterOffer = counter.items.filter((i) => i.side === 'OFFER')
                const counterRequest = counter.items.filter((i) => i.side === 'REQUEST')

                return (
                  <div
                    key={counter.id}
                    className="bg-darkbg-900 rounded-xl border border-darkbg-700 p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <RobloxAvatar
                          avatarUrl={counter.user.robloxAvatarUrl}
                          username={counter.user.robloxUsername}
                          size="sm"
                        />
                        <span className="font-semibold text-white">
                          {counter.user.robloxUsername}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(counter.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-[1fr_auto_1fr] gap-2 mb-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">They Offer</p>
                        {counterOffer.map((item) => (
                          <TradeItemDisplay key={item.id} item={item} size="sm" />
                        ))}
                      </div>
                      <div className="flex items-center justify-center">
                        <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">They Want</p>
                        {counterRequest.map((item) => (
                          <TradeItemDisplay key={item.id} item={item} size="sm" />
                        ))}
                      </div>
                    </div>
                    {isOwner && trade.status === 'OPEN' && (
                      <button
                        onClick={() => handleAcceptCounter(counter.id)}
                        disabled={actionLoading === counter.id}
                        className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        Accept Counter Offer
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Trade Requests */}
        {isOwner && trade.requests && trade.requests.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">
              Trade Requests ({trade.requests.length})
            </h2>
            <div className="space-y-3">
              {trade.requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-darkbg-900 rounded-xl border border-darkbg-700 p-4 flex items-center justify-between"
                >
                  <div className="flex items-start gap-3">
                    <RobloxAvatar
                      avatarUrl={request.requester.robloxAvatarUrl}
                      username={request.requester.robloxUsername}
                      size="sm"
                    />
                    <div>
                      <p className="font-semibold text-white">
                        {request.requester.robloxUsername}
                      </p>
                      {request.message && (
                        <p className="text-sm text-gray-500">{request.message}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {request.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRequestResponse(request.id, 'ACCEPTED')}
                        disabled={actionLoading === request.id}
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRequestResponse(request.id, 'DECLINED')}
                        disabled={actionLoading === request.id}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {request.status !== 'PENDING' && (
                    <span className={`text-sm font-medium ${
                      request.status === 'ACCEPTED' ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {request.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Counter Offer Modal */}
      {showCounterOffer && (
        <TradeBuilderModal
          onClose={() => setShowCounterOffer(false)}
          onSuccess={fetchTrade}
          parentTradeId={trade.id}
          initialOfferItems={requestItems.map((item) => ({
            brainrotId: item.brainrot.id,
            brainrot: item.brainrot,
            mutationId: item.mutation?.id,
            mutation: item.mutation || undefined,
            traitIds: item.traits?.map((t) => t.trait.id),
            traits: item.traits?.map((t) => t.trait),
            calculatedIncome: item.calculatedIncome || undefined,
          }))}
          initialRequestItems={offerItems.map((item) => ({
            brainrotId: item.brainrot.id,
            brainrot: item.brainrot,
            mutationId: item.mutation?.id,
            mutation: item.mutation || undefined,
            traitIds: item.traits?.map((t) => t.trait.id),
            traits: item.traits?.map((t) => t.trait),
            calculatedIncome: item.calculatedIncome || undefined,
          }))}
        />
      )}
    </div>
  )
}
