'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Loader2, AlertTriangle, Check, ChevronDown, ChevronRight, ArrowRight, X, CheckCircle2, Circle, Send, ThumbsUp, ThumbsDown, Clock } from 'lucide-react'

interface Batch {
  id: string
  date: string
  time: string
  count: number
  usedForDemand: boolean
  appliedToValues: boolean
  snapshotIds: string[]
  createdAt: string
}

interface MutationValue {
  mutationId: string
  mutationName: string
  multiplier: number
  currentValue: number | null
  rawValue: number | null
  interpolatedValue: number | null
  finalValue: number | null
  changed: boolean
  isOutlier: boolean
  hasNewData: boolean
  noData: boolean
  suspicious: boolean
  suspiciousReason: string | null
  listingCount: number
}

interface PreviewBrainrot {
  brainrotId: string
  brainrotName: string
  localImage: string | null
  hasChanges: boolean
  hasSuspicious: boolean
  mutations: MutationValue[]
}

interface Preview {
  brainrots: PreviewBrainrot[]
  totalSnapshots: number
}

interface PriceReview {
  id: string
  reviewerId: string
  snapshotIds: string[]
  verifiedBrainrotIds: string[]
  overrides: Record<string, Record<string, number>> | null
  status: string
  note: string | null
  adminNote: string | null
  createdAt: string
  reviewedAt: string | null
  reviewer: { id: string; robloxUsername: string; robloxAvatarUrl: string | null }
  reviewedBy: { id: string; robloxUsername: string } | null
}

export default function PriceSnapshotsPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [days, setDays] = useState(14)
  const [userRole, setUserRole] = useState<string>('USER')
  const [userId, setUserId] = useState<string | null>(null)

  // Review state
  const [reviewingBatch, setReviewingBatch] = useState<Batch | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [expandedBrainrots, setExpandedBrainrots] = useState<Set<string>>(new Set())
  const [overrides, setOverrides] = useState<Record<string, Record<string, number>>>({})
  const [verified, setVerified] = useState<Set<string>>(new Set())

  // Mod review approval state
  const [pendingReviews, setPendingReviews] = useState<PriceReview[]>([])
  const [processingReview, setProcessingReview] = useState<string | null>(null)

  const [snapshotRunning, setSnapshotRunning] = useState(false)
  const [snapshotProgress, setSnapshotProgress] = useState<{ fetched: number; total: number } | null>(null)
  const [snapshotMsg, setSnapshotMsg] = useState<string | null>(null)

  const isAdmin = userRole === 'ADMIN'
  const isMod = userRole === 'MOD'

  // Poll for snapshot progress
  useEffect(() => {
    if (!snapshotRunning) return
    let maxProgressSince = 0
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/price-snapshots/trigger')
        if (res.ok) {
          const data = await res.json()
          if (data.running) {
            setSnapshotProgress({ fetched: data.fetched, total: data.total })
            // Track how long we've been at max progress (server is finalizing)
            if (data.fetched >= data.total && data.total > 0) {
              if (maxProgressSince === 0) maxProgressSince = Date.now()
              // If stuck at max for >60s, the POST likely finished or timed out — stop polling
              if (Date.now() - maxProgressSince > 60_000) {
                setSnapshotRunning(false)
                setSnapshotProgress(null)
                setSnapshotMsg('Snapshot complete')
                fetchBatches()
                setTimeout(() => setSnapshotMsg(null), 5000)
              }
            } else {
              maxProgressSince = 0
            }
          } else {
            setSnapshotRunning(false)
            setSnapshotProgress(null)
            setSnapshotMsg('Snapshot complete')
            fetchBatches()
            setTimeout(() => setSnapshotMsg(null), 5000)
          }
        }
      } catch {
        // ignore poll errors
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [snapshotRunning])

  // Check if snapshot is already running on mount
  useEffect(() => {
    console.log('[snapshot-mount] checking if running...')
    fetch('/api/admin/price-snapshots/trigger')
      .then(r => {
        console.log('[snapshot-mount] status:', r.status)
        return r.json()
      })
      .then(data => {
        console.log('[snapshot-mount] data:', JSON.stringify(data))
        if (data.running) {
          setSnapshotRunning(true)
          setSnapshotProgress({ fetched: data.fetched, total: data.total })
        }
      })
      .catch((e) => console.log('[snapshot-mount] error:', e))
  }, [])

  const triggerSnapshot = async () => {
    setSnapshotRunning(true)
    setSnapshotProgress({ fetched: 0, total: 0 })
    setSnapshotMsg(null)
    // Fire and forget — don't await the POST response since it takes minutes.
    // Polling handles progress and completion detection.
    fetch('/api/admin/price-snapshots/trigger', { method: 'POST' })
      .then(async (res) => {
        const data = await res.json()
        if (res.ok) {
          setSnapshotMsg(`Done — ${data.snapshotsCreated} snapshots, ${data.outliers} outliers, ${data.errors} errors`)
          await fetchBatches()
        } else {
          setSnapshotMsg(data.error || 'Failed')
        }
      })
      .catch(() => {
        // POST timed out — polling will detect completion via lock check
      })
      .finally(() => {
        setSnapshotRunning(false)
        setSnapshotProgress(null)
        setTimeout(() => setSnapshotMsg(null), 8000)
      })
  }

  const fetchBatches = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/price-snapshots?days=${days}`)
      const data = await res.json()
      setBatches(data.batches || [])
    } catch {
      // ignore
    }
    setLoading(false)
  }

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user?.role) setUserRole(d.user.role)
      if (d.user?.id) setUserId(d.user.id)
    }).catch(() => {})
  }, [])

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/admin/price-snapshots/reviews')
      if (res.ok) {
        const data = await res.json()
        setPendingReviews(data.reviews || [])
      }
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchBatches(); fetchReviews() }, [days])

  const toggleBatch = async (batch: Batch) => {
    setToggling(batch.id)
    try {
      await fetch('/api/admin/price-snapshots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotIds: batch.snapshotIds,
          usedForDemand: !batch.usedForDemand,
        }),
      })
      setBatches(prev =>
        prev.map(b =>
          b.id === batch.id ? { ...b, usedForDemand: !b.usedForDemand } : b
        )
      )
    } catch {
      // ignore
    }
    setToggling(null)
  }

  const startReview = async (batch: Batch) => {
    setReviewingBatch(batch)
    setPreviewLoading(true)
    setPreview(null)
    setOverrides({})
    setVerified(new Set())
    setExpandedBrainrots(new Set())
    try {
      const res = await fetch('/api/admin/price-snapshots/apply', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotIds: batch.snapshotIds }),
      })
      if (res.ok) {
        const data = await res.json()
        setPreview(data)
        // Auto-expand brainrots with changes or suspicious values
        const expanded = new Set<string>(
          data.brainrots.filter((b: PreviewBrainrot) => b.hasChanges || b.hasSuspicious).map((b: PreviewBrainrot) => b.brainrotId)
        )
        setExpandedBrainrots(expanded)
      }
    } catch {
      // ignore
    }
    setPreviewLoading(false)
  }

  const toggleVerified = (brainrotId: string) => {
    setVerified(prev => {
      const next = new Set(prev)
      if (next.has(brainrotId)) next.delete(brainrotId)
      else next.add(brainrotId)
      return next
    })
  }

  const verifyAll = () => {
    if (!preview) return
    setVerified(new Set(preview.brainrots.map(b => b.brainrotId)))
  }

  const updateOverride = (brainrotId: string, mutationId: string, value: string) => {
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    setOverrides(prev => ({
      ...prev,
      [brainrotId]: { ...prev[brainrotId], [mutationId]: num },
    }))
  }

  const clearOverride = (brainrotId: string, mutationId: string) => {
    setOverrides(prev => {
      const next = { ...prev }
      if (next[brainrotId]) {
        const copy = { ...next[brainrotId] }
        delete copy[mutationId]
        if (Object.keys(copy).length === 0) delete next[brainrotId]
        else next[brainrotId] = copy
      }
      return next
    })
  }

  const applyVerified = async () => {
    if (!reviewingBatch || verified.size === 0) return
    setApplying(true)
    try {
      const res = await fetch('/api/admin/price-snapshots/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotIds: reviewingBatch.snapshotIds,
          verifiedBrainrotIds: [...verified],
          overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.submitted) {
          // Mod submitted for approval
          setReviewingBatch(null)
          setPreview(null)
          await fetchReviews()
        } else if (data.fullyApplied) {
          setReviewingBatch(null)
          setPreview(null)
        }
        await fetchBatches()
      }
    } catch {
      // ignore
    }
    setApplying(false)
  }

  const handleReviewAction = async (reviewId: string, action: 'approve' | 'reject') => {
    setProcessingReview(reviewId)
    try {
      const res = await fetch('/api/admin/price-snapshots/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, action }),
      })
      if (res.ok) {
        await fetchReviews()
        await fetchBatches()
      }
    } catch { /* ignore */ }
    setProcessingReview(null)
  }

  const toggleBrainrotExpanded = (id: string) => {
    setExpandedBrainrots(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pendingBatches = batches.filter(b => !b.appliedToValues)

  const groupedByDate = batches.reduce<Record<string, Batch[]>>((acc, batch) => {
    if (!acc[batch.date]) acc[batch.date] = []
    acc[batch.date].push(batch)
    return acc
  }, {})

  const dateKeys = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Price Snapshots</h1>
          <p className="text-sm text-gray-500">
            Review and apply imported prices to the dataset.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {snapshotMsg && (
            <span className={`text-xs ${snapshotMsg.startsWith('Done') ? 'text-green-400' : 'text-red-400'}`}>
              {snapshotMsg}
            </span>
          )}
          {isAdmin && (
            <button
              onClick={triggerSnapshot}
              disabled={snapshotRunning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {snapshotRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {snapshotProgress && snapshotProgress.total > 0
                    ? `${snapshotProgress.fetched}/${snapshotProgress.total}`
                    : 'Starting...'}
                </>
              ) : (
                'Take Snapshot'
              )}
            </button>
          )}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-darkbg-800 border border-darkbg-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Pending warning */}
      {pendingBatches.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <span className="text-amber-400 font-medium text-sm">
              {pendingBatches.length} import{pendingBatches.length !== 1 ? 's' : ''} pending review
            </span>
            <span className="text-amber-400/70 text-sm ml-1">
              — needs interpolation verification before adding to dataset
            </span>
          </div>
        </div>
      )}

      {/* Pending mod reviews (admin sees these) */}
      {pendingReviews.filter(r => r.status === 'pending').length > 0 && isAdmin && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-blue-500/20 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 font-medium text-sm">
              {pendingReviews.filter(r => r.status === 'pending').length} mod review{pendingReviews.filter(r => r.status === 'pending').length !== 1 ? 's' : ''} awaiting approval
            </span>
          </div>
          <div className="divide-y divide-blue-500/10">
            {pendingReviews.filter(r => r.status === 'pending').map(review => (
              <div key={review.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <div>
                    <span className="text-sm text-white font-medium">{review.reviewer.robloxUsername}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {(review.verifiedBrainrotIds as string[]).length} brainrots verified
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {new Date(review.createdAt).toLocaleDateString()} at {new Date(review.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReviewAction(review.id, 'approve')}
                    disabled={processingReview === review.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all disabled:opacity-50"
                  >
                    {processingReview === review.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                    Approve & Apply
                  </button>
                  <button
                    onClick={() => handleReviewAction(review.id, 'reject')}
                    disabled={processingReview === review.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all disabled:opacity-50"
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

      {/* Mod's own pending submissions */}
      {pendingReviews.filter(r => r.status === 'pending' && r.reviewerId === userId).length > 0 && isMod && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <Clock className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-blue-400 text-sm">
            You have submissions awaiting admin approval
          </span>
        </div>
      )}

      {/* Review modal */}
      {reviewingBatch && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-start justify-center pt-20 overflow-y-auto">
          <div className="bg-darkbg-900/95 backdrop-blur-xl border border-darkbg-700 rounded-2xl w-full max-w-5xl mx-4 mb-12 shadow-2xl shadow-black/40">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-darkbg-700 sticky top-0 bg-darkbg-900/95 backdrop-blur-xl rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-bold text-white">Review Import</h2>
                <p className="text-xs text-gray-500">
                  {reviewingBatch.date} at {reviewingBatch.time} UTC — {reviewingBatch.count} snapshots
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {verified.size}/{preview?.brainrots.length || 0} verified
                </span>
                <button
                  onClick={verifyAll}
                  disabled={previewLoading}
                  className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white border border-darkbg-600 rounded-lg transition-colors"
                >
                  Verify All
                </button>
                <button
                  onClick={applyVerified}
                  disabled={applying || previewLoading || verified.size === 0}
                  className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                    isMod ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : isMod ? <Send className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  {isMod ? `Submit ${verified.size} for Approval` : `Apply ${verified.size} Verified`}
                </button>
                <button
                  onClick={() => { setReviewingBatch(null); setPreview(null) }}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                  <span className="ml-2 text-gray-500 text-sm">Computing interpolations...</span>
                </div>
              ) : preview && preview.brainrots.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                    <span>{preview.brainrots.length} brainrots</span>
                    <span>{preview.brainrots.filter(b => b.hasChanges).length} with interpolation changes</span>
                    {preview.brainrots.filter(b => b.hasSuspicious).length > 0 && (
                      <span className="text-red-400 font-medium">
                        {preview.brainrots.filter(b => b.hasSuspicious).length} with suspicious values
                      </span>
                    )}
                    <div className="flex items-center gap-4 ml-auto">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span>Suspicious</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>Interpolated</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span>New data</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-gray-600" />
                        <span>No new data</span>
                      </div>
                    </div>
                  </div>

                  {preview.brainrots.map(brainrot => {
                    const isExpanded = expandedBrainrots.has(brainrot.brainrotId)
                    const isVerified = verified.has(brainrot.brainrotId)
                    const newDataCount = brainrot.mutations.filter(v => v.hasNewData).length
                    const totalMutations = brainrot.mutations.length

                    return (
                      <div
                        key={brainrot.brainrotId}
                        className={`rounded-xl border overflow-hidden transition-colors ${
                          isVerified
                            ? 'border-green-500/30 bg-green-500/5'
                            : brainrot.hasSuspicious
                            ? 'border-red-500/30 bg-red-500/5'
                            : brainrot.hasChanges
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : 'border-darkbg-700 bg-darkbg-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 px-4 py-3">
                          {/* Verify checkbox */}
                          <button
                            onClick={() => toggleVerified(brainrot.brainrotId)}
                            className="shrink-0"
                          >
                            {isVerified ? (
                              <CheckCircle2 className="w-5 h-5 text-green-400" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-600 hover:text-gray-400 transition-colors" />
                            )}
                          </button>

                          {/* Expand toggle */}
                          <button
                            onClick={() => toggleBrainrotExpanded(brainrot.brainrotId)}
                            className="flex items-center gap-3 flex-1 min-w-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                            )}
                            {brainrot.localImage && (
                              <Image src={brainrot.localImage} alt="" width={24} height={24} className="rounded shrink-0" />
                            )}
                            <span className="text-white text-sm font-medium truncate">{brainrot.brainrotName}</span>
                          </button>

                          <div className="flex items-center gap-2 shrink-0">
                            {brainrot.hasSuspicious && (
                              <span className="text-[10px] text-red-400 font-medium px-2 py-0.5 bg-red-500/10 rounded-full flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                suspicious
                              </span>
                            )}
                            {brainrot.hasChanges && (
                              <span className="text-[10px] text-amber-400 font-medium px-2 py-0.5 bg-amber-500/10 rounded-full">
                                interpolated
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {newDataCount}/{totalMutations} with data
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-3 border-t border-darkbg-700/50">
                            <table className="w-full text-xs mt-2">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left py-1.5 font-medium w-28">Mutation</th>
                                  <th className="text-right py-1.5 font-medium w-12">Multi</th>
                                  <th className="text-right py-1.5 font-medium">Prev</th>
                                  <th className="text-right py-1.5 font-medium">Eldorado</th>
                                  <th className="text-right py-1.5 font-medium w-16"># of listings</th>
                                  <th className="text-center py-1.5 font-medium w-6"></th>
                                  <th className="text-right py-1.5 font-medium">New</th>
                                  <th className="text-right py-1.5 font-medium w-24">Override</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-darkbg-700/30">
                                {brainrot.mutations.map(v => {
                                  const override = overrides[brainrot.brainrotId]?.[v.mutationId]
                                  const displayFinal = override ?? v.finalValue
                                  return (
                                    <tr
                                      key={v.mutationId}
                                      className={
                                        v.suspicious ? 'bg-red-500/10' :
                                        v.isOutlier ? 'bg-red-500/5' :
                                        v.changed ? 'bg-amber-500/5' :
                                        v.noData ? 'opacity-40' : ''
                                      }
                                    >
                                      <td className="py-2 text-white">
                                        <div className="flex items-center gap-1.5">
                                          {v.suspicious && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                                          <span>{v.mutationName}</span>
                                          {v.isOutlier && <span className="text-red-400 ml-1 text-[10px]">outlier</span>}
                                        </div>
                                        {v.suspicious && v.suspiciousReason && (
                                          <p className="text-[10px] text-red-400/80 mt-0.5 ml-[18px]">{v.suspiciousReason}</p>
                                        )}
                                      </td>
                                      <td className="py-2 text-right text-gray-500">{v.multiplier}x</td>
                                      <td className="py-2 text-right text-gray-500 font-mono">
                                        {v.currentValue !== null ? `R$ ${v.currentValue.toLocaleString()}` : '—'}
                                      </td>
                                      <td className={`py-2 text-right font-mono ${v.noData ? 'text-gray-600' : v.hasNewData ? 'text-green-400' : 'text-gray-400'}`}>
                                        {v.rawValue !== null ? `R$ ${v.rawValue.toLocaleString()}` : '—'}
                                      </td>
                                      <td className="py-2 text-right text-gray-600 font-mono">
                                        {v.listingCount > 0 ? v.listingCount : ''}
                                      </td>
                                      <td className="py-2 text-center">
                                        {v.changed ? (
                                          <ArrowRight className="w-3 h-3 text-amber-400 inline" />
                                        ) : v.hasNewData ? (
                                          <span className="text-gray-600">=</span>
                                        ) : null}
                                      </td>
                                      <td className={`py-2 text-right font-mono ${
                                        v.suspicious ? 'text-red-400 font-medium' :
                                        v.changed ? 'text-amber-400 font-medium' :
                                        v.hasNewData ? 'text-white' : 'text-gray-600'
                                      }`}>
                                        {displayFinal !== null ? `R$ ${displayFinal.toLocaleString()}` : '—'}
                                      </td>
                                      <td className="py-2 text-right">
                                        {(v.hasNewData || v.currentValue !== null || v.isOutlier || v.rawValue !== null) && (
                                          <div className="flex items-center justify-end gap-1">
                                            <input
                                              type="number"
                                              placeholder={v.finalValue !== null ? String(v.finalValue) : ''}
                                              value={override ?? ''}
                                              onChange={(e) => {
                                                if (e.target.value === '') clearOverride(brainrot.brainrotId, v.mutationId)
                                                else updateOverride(brainrot.brainrotId, v.mutationId, e.target.value)
                                              }}
                                              className="w-20 px-2 py-1 bg-darkbg-700 border border-darkbg-600 rounded text-white text-xs font-mono text-right focus:outline-none focus:border-green-500 placeholder:text-gray-500"
                                            />
                                            {override !== undefined && (
                                              <button
                                                onClick={() => clearOverride(brainrot.brainrotId, v.mutationId)}
                                                className="text-gray-500 hover:text-white"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No valid price data in this import
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 text-center py-12">Loading snapshots...</div>
      ) : batches.length === 0 ? (
        <div className="text-gray-500 text-center py-12">No snapshots found</div>
      ) : (
        <div className="space-y-4">
          {dateKeys.map(date => {
            const dayBatches = groupedByDate[date]
            const isToday = date === new Date().toISOString().split('T')[0]
            const activeBatches = dayBatches.filter(b => b.usedForDemand).length
            const pendingInDay = dayBatches.filter(b => !b.appliedToValues).length

            return (
              <div key={date} className="bg-darkbg-800 rounded-xl border border-darkbg-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-darkbg-700">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{date}</span>
                    {isToday && (
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">today</span>
                    )}
                    {pendingInDay > 0 && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">
                        {pendingInDay} pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{dayBatches.length} import{dayBatches.length !== 1 ? 's' : ''}</span>
                    <span>{activeBatches} active</span>
                    {dayBatches.length > 1 && activeBatches > 1 && (
                      <span className="text-amber-400 font-medium">
                        multiple active — values will be averaged
                      </span>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-darkbg-700/50">
                  {dayBatches.map(batch => (
                    <div
                      key={batch.id}
                      className={`flex items-center justify-between px-4 py-3 transition-colors ${
                        batch.usedForDemand ? '' : 'opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          !batch.appliedToValues ? 'bg-amber-400' :
                          batch.usedForDemand ? 'bg-green-400' : 'bg-gray-600'
                        }`} />
                        <div>
                          <span className="text-sm text-white font-mono">{batch.time} UTC</span>
                          <span className="text-xs text-gray-500 ml-2">{batch.count} snapshot{batch.count !== 1 ? 's' : ''}</span>
                        </div>
                        {!batch.appliedToValues && (
                          <span className="text-xs text-amber-400 font-medium">not applied to dataset</span>
                        )}
                        {batch.appliedToValues && (
                          <span className="text-xs text-green-400/60">applied</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!batch.appliedToValues && (
                          <button
                            onClick={() => startReview(batch)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all"
                          >
                            Review & Apply
                          </button>
                        )}
                        {isAdmin ? (
                          <button
                            onClick={() => toggleBatch(batch)}
                            disabled={toggling === batch.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              batch.usedForDemand
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                                : 'bg-darkbg-700 text-gray-400 border border-darkbg-600 hover:text-white hover:border-darkbg-500'
                            } ${toggling === batch.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {toggling === batch.id
                              ? 'Updating...'
                              : batch.usedForDemand
                              ? 'Used for demand'
                              : 'Excluded'}
                          </button>
                        ) : (
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                            batch.usedForDemand ? 'text-green-400/60' : 'text-gray-600'
                          }`}>
                            {batch.usedForDemand ? 'Used for demand' : 'Excluded'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-darkbg-800/50 rounded-xl border border-darkbg-700 p-4">
        <h3 className="text-sm font-medium text-white mb-2">How it works</h3>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>Price imports are saved as snapshots but <strong className="text-gray-400">not applied to the dataset automatically</strong></li>
          <li>Click &quot;Review &amp; Apply&quot; to see raw vs interpolated values for all mutations</li>
          <li>Verify each brainrot with the checkbox, override values if needed, then apply verified ones</li>
          <li>You can verify some now and come back later — only verified brainrots get applied</li>
          <li>Demand is calculated from snapshots marked as &quot;Used for demand&quot;</li>
        </ul>
      </div>
    </div>
  )
}
