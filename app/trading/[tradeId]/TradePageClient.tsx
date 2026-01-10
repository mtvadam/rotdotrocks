'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRightLeft, BadgeCheck, MessageSquare, Clock, Send, Trash2, Check, X, ExternalLink, Loader2, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { TradeItemDisplay, TradeBuilderModal, TotalValueBreakdown, TradeVoting, TradeChat } from '@/components/trading'
import { useAuth } from '@/components/Providers'
import { RobloxAvatar } from '@/components/ui'
import { formatIncome } from '@/lib/utils'
import { calculateTraitValueMultiplier } from '@/lib/trait-value'
import type { DemandLevel, TrendDirection } from '@/components/trading/DemandTrendBadge'

interface TradeItem {
  id: string
  side: 'OFFER' | 'REQUEST'
  brainrot: {
    id: string
    name: string
    localImage: string | null
    baseIncome: string
    demand?: DemandLevel
    trend?: TrendDirection
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
  robuxValue?: number | null
  hasTraits?: boolean
  valueFallback?: boolean
  valueFallbackSource?: string | null
  addonType?: string | null
  robuxAmount?: number | null
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


export default function TradePageClient({ tradeId }: { tradeId: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const [trade, setTrade] = useState<Trade | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCounterOffer, setShowCounterOffer] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [requestSuccess, setRequestSuccess] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

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
    setRequestError(null)
    try {
      const res = await fetch('/api/trade-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId: trade.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send request')
      }
      setRequestSuccess(true)
      fetchTrade()
      // Clear success message after 3 seconds
      setTimeout(() => setRequestSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to send request:', err)
      setRequestError(err instanceof Error ? err.message : 'Failed to send request')
      setTimeout(() => setRequestError(null), 3000)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-darkbg-950">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Back Link skeleton */}
          <div className="h-5 w-32 skeleton rounded mb-6" />

          {/* Trade Card skeleton */}
          <div className="bg-darkbg-900/90 backdrop-blur-sm rounded-2xl border border-darkbg-700 p-6 mb-6">
            {/* Header - responsive layout with status badge in top-right */}
            <div className="flex flex-col gap-3 mb-6">
              {/* Top row: User info left, Status badge right */}
              <div className="flex items-start justify-between gap-3">
                {/* Left: Avatar, name, verified */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-10 h-10 skeleton rounded-full" />
                  <div className="min-w-0">
                    <div className="h-5 w-24 sm:w-32 skeleton rounded mb-1" />
                    <div className="h-4 w-16 skeleton rounded" />
                  </div>
                </div>
                {/* Right: Status badge */}
                <div className="h-7 w-16 sm:w-20 skeleton rounded-lg flex-shrink-0" />
              </div>
              {/* Time - separate row */}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 skeleton rounded" />
                <div className="h-4 w-24 skeleton rounded" />
              </div>
            </div>

            {/* Trade Content - grid layout */}
            <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 mb-6 overflow-hidden">
              {/* Offer Side */}
              <div className="min-w-0 overflow-hidden">
                <div className="h-4 w-20 skeleton rounded mb-3" />
                <div className="space-y-2">
                  <div className="h-20 w-full skeleton rounded-lg" />
                  <div className="h-20 w-full skeleton rounded-lg" />
                </div>
              </div>

              {/* Arrow - horizontal on mobile, vertical on md+ */}
              <div className="flex items-center justify-center py-2 md:py-0 flex-shrink-0">
                <div className="w-5 h-5 md:w-6 md:h-6 skeleton rounded" />
              </div>

              {/* Request Side */}
              <div className="min-w-0 overflow-hidden">
                <div className="h-4 w-24 skeleton rounded mb-3" />
                <div className="space-y-2">
                  <div className="h-20 w-full skeleton rounded-lg" />
                </div>
              </div>
            </div>

            {/* Actions - full-width grid on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-2 pt-4 border-t border-darkbg-700">
              <div className="flex-1 h-11 skeleton rounded-lg" />
              <div className="flex-1 h-11 skeleton rounded-lg" />
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

  // Calculate totals for a side
  const calculateTotals = (items: TradeItem[]) => {
    let totalIncome = BigInt(0)
    let totalValue = 0
    let hasEstimated = false
    const itemBreakdowns: Array<{
      brainrotName: string
      mutationName: string
      robuxValue: number
      traitNames: string[]
      valueFallback?: boolean
      valueFallbackSource?: string | null
    }> = []

    for (const item of items) {
      if (item.calculatedIncome) {
        totalIncome += BigInt(item.calculatedIncome)
      }
      if (item.robuxValue) {
        // Apply trait value multiplier
        const traitNames = item.traits?.map(t => t.trait.name) || []
        const traitMult = calculateTraitValueMultiplier(traitNames)
        totalValue += Math.round(item.robuxValue * traitMult)
        // Track for breakdown
        if (item.valueFallback) {
          hasEstimated = true
        }
        itemBreakdowns.push({
          brainrotName: item.brainrot.name,
          mutationName: item.mutation?.name || 'Default',
          robuxValue: item.robuxValue,
          traitNames,
          valueFallback: item.valueFallback,
          valueFallbackSource: item.valueFallbackSource,
        })
      }
      // Add robux from "Add Robux" addon
      if (item.addonType === 'ROBUX' && item.robuxAmount) {
        totalValue += item.robuxAmount
        itemBreakdowns.push({
          brainrotName: 'Robux',
          mutationName: '',
          robuxValue: item.robuxAmount,
          traitNames: [],
        })
      }
    }
    return { totalIncome, totalValue, hasEstimated, itemBreakdowns }
  }

  const offerTotals = calculateTotals(offerItems)
  const requestTotals = calculateTotals(requestItems)

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
        <div className="bg-darkbg-900/90 backdrop-blur-sm rounded-2xl border border-darkbg-700 p-6 mb-6">
          {/* Header - responsive layout */}
          <div className="flex flex-col gap-3 mb-6">
            {/* Top row: User info left, Status badge right */}
            <div className="flex items-start justify-between gap-3">
              {/* Left: Avatar, name, verified */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <RobloxAvatar
                  avatarUrl={trade.user.robloxAvatarUrl}
                  username={trade.user.robloxUsername}
                  size="md"
                />
                <div className="min-w-0">
                  <a
                    href={`https://www.roblox.com/users/${trade.user.robloxUserId}/profile`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base sm:text-lg font-bold text-white hover:text-green-400 transition-colors inline-flex items-center gap-1.5 group"
                  >
                    <span className="truncate max-w-[120px] sm:max-w-[200px]">{trade.user.robloxUsername}</span>
                    <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </a>
                  {trade.isVerified && (
                    <span className="flex items-center gap-1 text-green-400 text-xs sm:text-sm font-medium mt-0.5">
                      <BadgeCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>
              {/* Right: Status badge */}
              <span className={`px-2.5 py-1 text-xs sm:text-sm font-medium rounded-lg flex-shrink-0 ${
                trade.status === 'OPEN' ? 'bg-blue-900/30 text-blue-400' :
                trade.status === 'PENDING' ? 'bg-amber-900/30 text-amber-400' :
                trade.status === 'COMPLETED' ? 'bg-green-900/30 text-green-400' :
                'bg-darkbg-700 text-gray-400'
              }`}>
                {trade.status}
              </span>
            </div>
            {/* Time - separate row */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>{formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })}</span>
            </div>
          </div>

          {/* Trade Content */}
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 mb-6 overflow-hidden">
            {/* Offer Side */}
            <div className="min-w-0 overflow-hidden flex flex-col">
              <h3 className="text-sm font-semibold text-green-500 uppercase mb-3">
                {trade.isVerified ? 'Gave' : 'Offering'}
              </h3>
              <div className="space-y-2 flex-1">
                {offerItems.map((item) => (
                  <TradeItemDisplay key={item.id} item={item} />
                ))}
              </div>
              {/* Totals - pushed to bottom */}
              <div className="mt-3 pt-3 border-t border-darkbg-700 flex items-center justify-between text-sm">
                {offerTotals.totalIncome > 0 ? (
                  <div>
                    <span className="text-gray-500">Total: </span>
                    <span className="font-bold text-green-500">{formatIncome(offerTotals.totalIncome.toString())}</span>
                  </div>
                ) : <div />}
                {offerTotals.totalValue > 0 ? (
                  <TotalValueBreakdown
                    items={offerTotals.itemBreakdowns}
                    totalValue={offerTotals.totalValue}
                    hasEstimated={offerTotals.hasEstimated}
                    showLabel
                  />
                ) : <div />}
              </div>
            </div>

            {/* Arrow - horizontal on mobile, vertical on md+ */}
            <div className="flex items-center justify-center py-2 md:py-0 flex-shrink-0">
              <ArrowRightLeft className="w-5 h-5 md:w-6 md:h-6 text-green-500/60 rotate-90 md:rotate-0" />
            </div>

            {/* Request Side */}
            <div className="min-w-0 overflow-hidden flex flex-col">
              <h3 className="text-sm font-semibold text-green-500 uppercase mb-3">
                {trade.isVerified ? 'Received' : 'Looking For'}
              </h3>
              <div className="space-y-2 flex-1">
                {requestItems.map((item) => (
                  <TradeItemDisplay key={item.id} item={item} />
                ))}
              </div>
              {/* Totals - pushed to bottom */}
              <div className="mt-3 pt-3 border-t border-darkbg-700 flex items-center justify-between text-sm">
                {requestTotals.totalIncome > 0 ? (
                  <div>
                    <span className="text-gray-500">Total: </span>
                    <span className="font-bold text-green-500">{formatIncome(requestTotals.totalIncome.toString())}</span>
                  </div>
                ) : <div />}
                {requestTotals.totalValue > 0 ? (
                  <TotalValueBreakdown
                    items={requestTotals.itemBreakdowns}
                    totalValue={requestTotals.totalValue}
                    hasEstimated={requestTotals.hasEstimated}
                    showLabel
                  />
                ) : <div />}
              </div>
            </div>
          </div>

          {/* Voting - only for verified trades */}
          {trade.isVerified && (
            <div className="border-t border-darkbg-700">
              <TradeVoting tradeId={trade.id} />
            </div>
          )}

          {/* Actions - all buttons fill row evenly */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-2 pt-4 border-t border-darkbg-700">
            {/* Owner Actions */}
            {isOwner && trade.status === 'OPEN' && (
              <button
                onClick={() => handleUpdateStatus('CANCELLED')}
                disabled={actionLoading === 'CANCELLED'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-900/30 text-red-400 rounded-lg font-medium hover:bg-red-900/50 transition-colors"
              >
                Cancel Trade
              </button>
            )}
            {isOwner && trade.status === 'PENDING' && (
              <button
                onClick={() => handleUpdateStatus('COMPLETED')}
                disabled={actionLoading === 'COMPLETED'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Mark Completed
              </button>
            )}

            {/* Mod Actions */}
            {isAdmin && (
              <button
                onClick={() => handleVerify(!trade.isVerified)}
                disabled={actionLoading === 'verify'}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  trade.isVerified
                    ? 'bg-darkbg-800 text-gray-300 hover:bg-darkbg-700'
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Counter Offer</span>
                </button>
                <button
                  onClick={handleSendRequest}
                  disabled={actionLoading === 'request' || requestSuccess}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                    requestSuccess
                      ? 'bg-green-600 text-white'
                      : requestError
                        ? 'bg-red-600 text-white'
                        : 'bg-darkbg-800 text-gray-300 hover:bg-darkbg-700'
                  }`}
                >
                  {actionLoading === 'request' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : requestSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Request Sent!</span>
                    </>
                  ) : requestError ? (
                    <>
                      <X className="w-4 h-4" />
                      <span>{requestError}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Request Trade</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Trade Chat */}
        <div className="mb-6">
          <TradeChat
            tradeId={trade.id}
            tradeStatus={trade.status}
            tradeOwnerId={trade.user.id}
          />
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
                    className="bg-darkbg-900/90 backdrop-blur-sm rounded-xl border border-darkbg-700 p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <RobloxAvatar
                          avatarUrl={counter.user.robloxAvatarUrl}
                          username={counter.user.robloxUsername}
                          size="sm"
                        />
                        <a
                          href={`https://www.roblox.com/users/${counter.user.robloxUserId}/profile`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-white hover:text-green-400 transition-colors inline-flex items-center gap-1 group"
                        >
                          {counter.user.robloxUsername}
                          <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
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
                      <a
                        href={`https://www.roblox.com/users/${request.requester.robloxUserId}/profile`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-white hover:text-green-400 transition-colors inline-flex items-center gap-1 group"
                      >
                        {request.requester.robloxUsername}
                        <ExternalLink className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </a>
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
