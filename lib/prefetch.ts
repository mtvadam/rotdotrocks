interface Brainrot {
  id: string
  name: string
  localImage: string | null
  imageUrl: string
  baseCost: string
  baseIncome: string
  rarity: string | null
  robuxValue: number | null
}

// Module-level cache for instant load
export const brainrotCache: { brainrots: Brainrot[]; loaded: boolean; loading: boolean; lastFetched: number } = {
  brainrots: [],
  loaded: false,
  loading: false,
  lastFetched: 0,
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

// Invalidate the cache - call after uploads or data changes
export function invalidateBrainrotCache() {
  brainrotCache.brainrots = []
  brainrotCache.loaded = false
  brainrotCache.loading = false
  brainrotCache.lastFetched = 0
}

// Check if cache is stale
function isCacheStale(): boolean {
  if (!brainrotCache.loaded) return true
  return Date.now() - brainrotCache.lastFetched > CACHE_DURATION
}

// Prefetch for instant page load - call from NavBar or layout
export function prefetchBrainrots() {
  if (brainrotCache.loading) return
  if (brainrotCache.loaded && !isCacheStale()) return

  brainrotCache.loading = true
  fetch('/api/brainrots/all')
    .then(res => res.json())
    .then(data => {
      brainrotCache.brainrots = data.brainrots || []
      brainrotCache.loaded = true
      brainrotCache.loading = false
      brainrotCache.lastFetched = Date.now()
    })
    .catch(() => { brainrotCache.loading = false })
}

// Force refresh the cache
export function refreshBrainrotCache(): Promise<Brainrot[]> {
  invalidateBrainrotCache()
  return new Promise((resolve) => {
    brainrotCache.loading = true
    fetch('/api/brainrots/all')
      .then(res => res.json())
      .then(data => {
        brainrotCache.brainrots = data.brainrots || []
        brainrotCache.loaded = true
        brainrotCache.loading = false
        brainrotCache.lastFetched = Date.now()
        resolve(brainrotCache.brainrots)
      })
      .catch(() => {
        brainrotCache.loading = false
        resolve([])
      })
  })
}
