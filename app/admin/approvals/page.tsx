'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Loader2, ThumbsUp, ThumbsDown, Camera, Palette, Settings, Check, X } from 'lucide-react'

interface PriceReview {
  id: string
  snapshotIds: string[]
  verifiedBrainrotIds: string[]
  overrides: Record<string, Record<string, number>> | null
  status: string
  adminNote: string | null
  createdAt: string
  reviewedAt: string | null
  reviewer: { id: string; robloxUsername: string; robloxAvatarUrl: string | null }
  reviewedBy: { id: string; robloxUsername: string } | null
}

interface TraitEdit {
  id: string
  traitId: string
  oldValue: number
  newValue: number
  adminValue: number | null
  status: string
  adminNote: string | null
  createdAt: string
  reviewedAt: string | null
  trait: { id: string; name: string; localImage: string | null; valueMultiplier: number }
  submitter: { id: string; robloxUsername: string; robloxAvatarUrl: string | null }
  reviewedBy: { id: string; robloxUsername: string } | null
}

interface PendingEdit {
  id: string
  editType: string
  targetId: string | null
  description: string
  oldData: string
  newData: string
  status: string
  adminNote: string | null
  createdAt: string
  reviewedAt: string | null
  submitter: { id: string; robloxUsername: string; robloxAvatarUrl: string | null }
  reviewedBy: { id: string; robloxUsername: string } | null
}

type Tab = 'pending' | 'history'

const EDIT_TYPE_LABELS: Record<string, string> = {
  streak_config: 'Streak Config',
  brainrot_value: 'Brainrot Value',
  brainrot_demand: 'Demand',
  brainrot_trend: 'Trend',
  mutation_value: 'Mutation Value',
  mutation_demand_trend: 'Mutation Demand/Trend',
}

export default function ApprovalsPage() {
  const [priceReviews, setPriceReviews] = useState<PriceReview[]>([])
  const [traitEdits, setTraitEdits] = useState<TraitEdit[]>([])
  const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('pending')
  const [editOverrides, setEditOverrides] = useState<Record<string, string>>({})

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/approvals')
      if (res.ok) {
        const data = await res.json()
        setPriceReviews(data.priceReviews || [])
        setTraitEdits(data.traitEdits || [])
        setPendingEdits(data.pendingEdits || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleAction = async (type: 'price_review' | 'trait_edit' | 'pending_edit', id: string, action: 'approve' | 'reject') => {
    setProcessing(id)
    try {
      const body: Record<string, unknown> = { type, id, action }
      if (type === 'trait_edit' && action === 'approve' && editOverrides[id]) {
        body.adminValue = parseFloat(editOverrides[id])
      }
      const res = await fetch('/api/admin/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) await fetchData()
    } catch { /* ignore */ }
    setProcessing(null)
  }

  const pendingPriceReviews = priceReviews.filter(r => r.status === 'pending')
  const pendingTraitEdits = traitEdits.filter(e => e.status === 'pending')
  const pendingGenericEdits = pendingEdits.filter(e => e.status === 'pending')
  const historyPriceReviews = priceReviews.filter(r => r.status !== 'pending')
  const historyTraitEdits = traitEdits.filter(e => e.status !== 'pending')
  const historyGenericEdits = pendingEdits.filter(e => e.status !== 'pending')
  const totalPending = pendingPriceReviews.length + pendingTraitEdits.length + pendingGenericEdits.length

  const formatPct = (val: number) => {
    const pct = (val - 1) * 100
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Approvals</h1>
        <p className="text-sm text-gray-500">Review and approve mod submissions</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-darkbg-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'pending' ? 'bg-darkbg-700 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          Pending {totalPending > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">{totalPending}</span>}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'history' ? 'bg-darkbg-700 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          History
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
        </div>
      ) : tab === 'pending' ? (
        <div className="space-y-4">
          {totalPending === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">No pending approvals</div>
          )}

          {/* Pending generic edits (brainrot values, mutation values, streak config, etc.) */}
          {pendingGenericEdits.length > 0 && (
            <div className="bg-darkbg-800 rounded-xl border border-darkbg-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-darkbg-700 flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-white">Value & Config Changes</span>
                <span className="text-xs text-gray-500">{pendingGenericEdits.length} pending</span>
              </div>
              <div className="divide-y divide-darkbg-700/50">
                {pendingGenericEdits.map(edit => (
                  <div key={edit.id} className="px-4 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-darkbg-700 text-gray-400">
                          {EDIT_TYPE_LABELS[edit.editType] || edit.editType}
                        </span>
                        <span className="text-sm text-white truncate">{edit.description}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        by {edit.submitter.robloxUsername} &middot; {formatDate(edit.createdAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleAction('pending_edit', edit.id, 'approve')}
                        disabled={processing === edit.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all disabled:opacity-50"
                      >
                        {processing === edit.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction('pending_edit', edit.id, 'reject')}
                        disabled={processing === edit.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50"
                      >
                        <ThumbsDown className="w-3 h-3" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending trait edits */}
          {pendingTraitEdits.length > 0 && (
            <div className="bg-darkbg-800 rounded-xl border border-darkbg-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-darkbg-700 flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-white">Trait Value Changes</span>
                <span className="text-xs text-gray-500">{pendingTraitEdits.length} pending</span>
              </div>
              <div className="divide-y divide-darkbg-700/50">
                {pendingTraitEdits.map(edit => {
                  const override = editOverrides[edit.id]
                  return (
                    <div key={edit.id} className="px-4 py-3 flex items-center gap-4">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {edit.trait.localImage && (
                          <Image src={edit.trait.localImage} alt="" width={24} height={24} className="rounded shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm text-white font-medium truncate">{edit.trait.name}</div>
                          <div className="text-xs text-gray-500">
                            by {edit.submitter.robloxUsername} &middot; {formatDate(edit.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm font-mono shrink-0">
                        <span className="text-gray-500">{formatPct(edit.oldValue)}</span>
                        <span className="text-gray-600">&rarr;</span>
                        <span className="text-amber-400 font-medium">{formatPct(edit.newValue)}</span>
                      </div>

                      {/* Admin override input */}
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          step="0.01"
                          placeholder={String(edit.newValue)}
                          value={override ?? ''}
                          onChange={(e) => setEditOverrides(prev => {
                            if (e.target.value === '') {
                              const next = { ...prev }
                              delete next[edit.id]
                              return next
                            }
                            return { ...prev, [edit.id]: e.target.value }
                          })}
                          className="w-16 px-2 py-1 bg-darkbg-700 border border-darkbg-600 rounded text-white text-xs font-mono text-right focus:outline-none focus:border-green-500 placeholder:text-gray-600"
                        />
                        {override && (
                          <span className="text-[10px] text-green-400 font-mono">{formatPct(parseFloat(override))}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAction('trait_edit', edit.id, 'approve')}
                          disabled={processing === edit.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all disabled:opacity-50"
                        >
                          {processing === edit.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction('trait_edit', edit.id, 'reject')}
                          disabled={processing === edit.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50"
                        >
                          <ThumbsDown className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Pending price reviews */}
          {pendingPriceReviews.length > 0 && (
            <div className="bg-darkbg-800 rounded-xl border border-darkbg-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-darkbg-700 flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Price Import Reviews</span>
                <span className="text-xs text-gray-500">{pendingPriceReviews.length} pending</span>
              </div>
              <div className="divide-y divide-darkbg-700/50">
                {pendingPriceReviews.map(review => (
                  <div key={review.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-white font-medium">{review.reviewer.robloxUsername}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {(review.verifiedBrainrotIds as string[]).length} brainrots verified
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {(review.snapshotIds as string[]).length} snapshots
                      </span>
                      <div className="text-xs text-gray-600 mt-0.5">{formatDate(review.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAction('price_review', review.id, 'approve')}
                        disabled={processing === review.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all disabled:opacity-50"
                      >
                        {processing === review.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                        Approve & Apply
                      </button>
                      <button
                        onClick={() => handleAction('price_review', review.id, 'reject')}
                        disabled={processing === review.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50"
                      >
                        <ThumbsDown className="w-3 h-3" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History tab */
        <div className="space-y-2">
          {historyTraitEdits.length === 0 && historyPriceReviews.length === 0 && historyGenericEdits.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">No history yet</div>
          )}

          {[
            ...historyTraitEdits.map(e => ({ ...e, _type: 'trait' as const })),
            ...historyPriceReviews.map(r => ({ ...r, _type: 'price' as const })),
            ...historyGenericEdits.map(e => ({ ...e, _type: 'generic' as const })),
          ]
            .sort((a, b) => new Date(b.reviewedAt || b.createdAt).getTime() - new Date(a.reviewedAt || a.createdAt).getTime())
            .map(item => {
              const isApproved = item.status === 'approved'
              if (item._type === 'trait') {
                const edit = item as TraitEdit & { _type: 'trait' }
                return (
                  <div key={edit.id} className={`px-4 py-3 rounded-xl border flex items-center gap-4 ${
                    isApproved ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                  }`}>
                    <div className={`p-1 rounded ${isApproved ? 'text-green-400' : 'text-red-400'}`}>
                      {isApproved ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </div>
                    {edit.trait.localImage && (
                      <Image src={edit.trait.localImage} alt="" width={20} height={20} className="rounded shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white">{edit.trait.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatPct(edit.oldValue)} &rarr; {formatPct(edit.adminValue ?? edit.newValue)}
                      </span>
                      <div className="text-xs text-gray-600">
                        by {edit.submitter.robloxUsername} &middot; {isApproved ? 'approved' : 'rejected'} by {edit.reviewedBy?.robloxUsername || '?'} &middot; {formatDate(edit.reviewedAt || edit.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              } else if (item._type === 'generic') {
                const edit = item as PendingEdit & { _type: 'generic' }
                return (
                  <div key={edit.id} className={`px-4 py-3 rounded-xl border flex items-center gap-4 ${
                    isApproved ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                  }`}>
                    <div className={`p-1 rounded ${isApproved ? 'text-green-400' : 'text-red-400'}`}>
                      {isApproved ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-darkbg-700 text-gray-400">
                          {EDIT_TYPE_LABELS[edit.editType] || edit.editType}
                        </span>
                        <span className="text-sm text-white truncate">{edit.description}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        by {edit.submitter.robloxUsername} &middot; {isApproved ? 'approved' : 'rejected'} by {edit.reviewedBy?.robloxUsername || '?'} &middot; {formatDate(edit.reviewedAt || edit.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              } else {
                const review = item as PriceReview & { _type: 'price' }
                return (
                  <div key={review.id} className={`px-4 py-3 rounded-xl border flex items-center gap-4 ${
                    isApproved ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
                  }`}>
                    <div className={`p-1 rounded ${isApproved ? 'text-green-400' : 'text-red-400'}`}>
                      {isApproved ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white">Price import review</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {(review.verifiedBrainrotIds as string[]).length} brainrots
                      </span>
                      <div className="text-xs text-gray-600">
                        by {review.reviewer.robloxUsername} &middot; {isApproved ? 'approved' : 'rejected'} by {review.reviewedBy?.robloxUsername || '?'} &middot; {formatDate(review.reviewedAt || review.createdAt)}
                      </div>
                    </div>
                  </div>
                )
              }
            })}
        </div>
      )}
    </div>
  )
}
