interface Brainrot {
  id: string
  name: string
  localImage: string | null
  imageUrl: string
  baseCost: string
  baseIncome: string
  rarity: string | null
}

// Module-level cache for instant load
export const brainrotCache: { brainrots: Brainrot[]; loaded: boolean; loading: boolean } = {
  brainrots: [],
  loaded: false,
  loading: false,
}

// Prefetch for instant page load - call from NavBar or layout
export function prefetchBrainrots() {
  if (brainrotCache.loaded || brainrotCache.loading) return
  brainrotCache.loading = true
  fetch('/api/brainrots/all')
    .then(res => res.json())
    .then(data => {
      brainrotCache.brainrots = data.brainrots || []
      brainrotCache.loaded = true
      brainrotCache.loading = false
    })
    .catch(() => { brainrotCache.loading = false })
}
