# rot.rocks — Site Analysis Report
**Date:** 2026-02-10
**Scope:** Full codebase review (app/, components/, lib/, public config)
**Status:** Analysis only — no changes made

---

## Table of Contents
1. [Critical Issues (Fix Now)](#critical)
2. [High Priority (This Week)](#high)
3. [Medium Priority (Next Sprint)](#medium)
4. [Low Priority (Backlog)](#low)
5. [Summary Stats](#summary)

---

## 🔴 Critical Issues (Fix Now) {#critical}

### BUG-01 — `BigInt()` throws on decimal calculatedIncome
**File:** `app/trading/[tradeId]/TradePageClient.tsx:316`
**Also affected:** Any consumer of `calculatedIncome` from the BrainrotPicker

`BrainrotPicker.tsx:360-365` can produce a decimal string (e.g. `"0.5"`) for very small income values:
```ts
if (remainder > 0 && income === BigInt(0)) {
  const decimal = Number(scaledIncome) / 10000
  return decimal.toString()  // returns "0.5"
}
```
Then `TradePageClient.tsx:316` does:
```ts
totalIncome += BigInt(item.calculatedIncome)  // BigInt("0.5") → SyntaxError: Cannot convert non-integer
```
This crashes the trade detail page whenever a brainrot with a very low calculated income is included. A `parseFloat` + `Math.round` guard is needed before `BigInt()` conversion.

---

### BUG-02 — Homepage "new brainrots" carousel cards are not clickable
**File:** `app/page.tsx:500-585`

The carousel cards are `motion.div` elements with `cursor-pointer` and hover effects, but there is **no `<Link>` wrapper and no `onClick` handler**. Clicking or tapping a card does nothing. Users will be confused — the hover effects strongly imply the cards are interactive. Each card should link to `/brainrots` or a future per-brainrot detail page.

---

### BUG-03 — `requireSeller()` references non-existent `SELLER` role
**File:** `lib/auth.ts:38-43`

```ts
export async function requireSeller(): Promise<User> {
  const user = await requireAuth()
  if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
    throw new Error('Seller access required')
  }
  return user
}
```
The `User` type defines roles as `'USER' | 'MOD' | 'ADMIN'`. There is no `'SELLER'` role anywhere in the codebase. This function will always throw for regular users and mods, and passes only for `ADMIN`. If this function is currently in use somewhere, it silently blocks all non-admin users. If it's dead code, it's a maintenance hazard indicating an incomplete role migration.

---

### BUG-04 — BrainrotPicker fetch errors leave users in infinite loading state
**File:** `components/trading/BrainrotPicker.tsx:382-405`

The data fetch `Promise.all([...])` has no `.catch()` handler on first load (when `!dataCache.loaded`). If any of the three fetches (brainrots, mutations, traits) fails, `loading` state is never set to `false` and the spinner never stops. The picker modal becomes permanently stuck in a loading state until the user closes and reopens it.

```ts
// Missing error handler:
Promise.all([
  fetch('/api/brainrots').then((r) => r.json()),
  fetch('/api/mutations').then((r) => r.json()),
  fetch('/api/traits').then((r) => r.json()),
]).then(([b, m, t]) => {
  // ...
  setLoading(false)
})
// No .catch() — loading stays true forever on network error
```

---

### BUG-05 — `next.config.ts` allows images from any domain (security risk)
**File:** `next.config.ts:30-34`

```ts
remotePatterns: [
  {
    protocol: 'https',
    hostname: '**',  // ← allows ALL domains
  },
],
```
This disables all hostname-based image security. An attacker can craft a trade with a malicious image URL (e.g., pointing to an internal network endpoint), causing the Next.js image optimization service to make requests to arbitrary URLs. Should be restricted to specific hostnames: Vercel Blob storage URL, Roblox CDN, etc.

---

## 🟠 High Priority (This Week) {#high}

### BUG-06 — `brainrots/page.tsx` sort loses BigInt precision
**File:** `app/brainrots/page.tsx:145-147`

```ts
const sorted = [...filtered].sort((a, b) => {
  return Number(BigInt(b.baseIncome) - BigInt(a.baseIncome))
})
```
Converting a BigInt difference to `Number` can lose precision for values above `Number.MAX_SAFE_INTEGER` (~9 quadrillion). High-income brainrots may be sorted incorrectly. The comparator should return `-1`, `0`, or `1` instead of converting the difference to a Number.

---

### UX-01 — No path for users to earn more gems
**File:** `app/trading/page.tsx`, `app/page.tsx:640-647`, `components/trading/TradeBuilderModal.tsx:290-293`

Users start with 20 gems. Posting a trade costs 5 gems. The homepage explains the cost briefly but there is zero in-app guidance on how to earn more gems. A user who runs out sees only "Not enough gems (need 5)" with no link to an explanation or gems replenishment path. This creates a dead end in the core user flow.

---

### UX-02 — Mobile navbar truncates usernames too aggressively
**File:** `components/NavBar.tsx:138-140`

```ts
{user.robloxUsername.length > 15
  ? user.robloxUsername.slice(0, 12) + '...'
  : user.robloxUsername}
```
Usernames are hidden on mobile (`hidden sm:flex`), but on sm+ screens the `max-w-[100px]` CSS truncation handles overflow already. The additional `slice(0, 12)` JS truncation is redundant and overly aggressive — a 13-character username becomes "...". Consider removing the JS truncation and relying solely on CSS truncation.

---

### UX-03 — No error boundary — a component crash takes down the entire page
**Scope:** Entire app (no `error.tsx` or `<ErrorBoundary>` components found)

There are no Next.js `error.tsx` files in `app/trading/`, `app/brainrots/`, or other route segments, and no React error boundary components. Any runtime JavaScript error in a component (e.g., BUG-01 above) will crash the entire page to a blank screen with no recovery option. Each route segment should have an `error.tsx` file at minimum.

---

### UX-04 — Trade request flow has no follow-up communication
**File:** `app/trading/[tradeId]/TradePageClient.tsx:524-566`

The "Request Trade" button sends a notification but there is no clear indication to the requester of what happens next. After clicking, the button state changes to "Request Sent!" for 3 seconds, then reverts to the original state. There's no persistent confirmation (e.g., "Request pending — the owner will contact you") and no way for the requester to see their pending requests.

---

### PERF-01 — BrainrotPicker preloads ALL brainrot images eagerly
**File:** `components/trading/BrainrotPicker.tsx:83-107`

`preloadImages()` creates `new window.Image()` for every single brainrot in batches of 20, every 50ms. With 100+ brainrots this initiates dozens of parallel image downloads immediately on page load, competing with critical resources. Additionally, the Image objects are not stored in a variable, so the browser's garbage collector may reclaim them before they finish loading, making the preload ineffective.

---

### PERF-02 — Module-level `tradesCache` grows without bounds
**File:** `app/trading/page.tsx:16`

```ts
const tradesCache: Record<string, { trades: Trade[]; totalPages: number; timestamp: number }> = {}
```
This cache is module-level (persists for the lifetime of the browser tab). With many filter combinations, pages, sort orders, and tabs, this object can accumulate many entries. There's no max-size limit, LRU eviction, or size check. Over a long session this can consume significant memory. Consider a simple LRU or a max of 10-20 entries.

---

### SECURITY-01 — Admin role assignment via environment variable username match is fragile
**File:** `app/api/auth/roblox/callback/route.ts:125-130`

```ts
const adminUsernames = (process.env.ADMINS || '')
  .split(',')
  .map(u => u.trim().toLowerCase())
  .filter(u => u.length > 0)

const isAdmin = adminUsernames.includes(robloxUsername.toLowerCase())
```
Admin role is granted by matching Roblox username string. If Roblox allows username reuse (after account deletion) or if someone registers a username that matches an ADMINS env var entry, they would automatically receive admin privileges on first login. Should use Roblox user ID (`robloxUserId`/`sub`) for admin detection, not username.

---

## 🟡 Medium Priority (Next Sprint) {#medium}

### BUG-07 — `globals.css` body font-family overrides Space Grotesk
**File:** `app/globals.css:20-22`

```css
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```
`layout.tsx:64` applies `{spaceGrotesk.className}` to `<body>`, which sets `font-family: var(--font-space-grotesk)` via Next.js font class. The CSS rule above has lower specificity than the font variable (since Next.js font classes use high-specificity selectors), so Space Grotesk does win — but this CSS rule is misleading and unnecessary. The `body` font rule in globals.css should be removed.

---

### BUG-08 — `Trading page` Trade interface missing `robloxAvatarUrl`
**File:** `app/trading/page.tsx:23-28`

The local `Trade` interface omits `robloxAvatarUrl` from the user field:
```ts
user: {
  id: string
  robloxUsername: string
  robloxUserId: string
  // robloxAvatarUrl missing
}
```
But `TradeCard.tsx:38-40` expects `robloxAvatarUrl?: string | null`. TypeScript won't catch the mismatch since the TradeCard prop accepts `undefined`. The `RobloxAvatar` component in the trade card will always show placeholder avatars in this view.

---

### UX-05 — Calculator state is not persisted across navigation
**File:** `app/trading/calculator/page.tsx`

The calculator uses only `useState` — all items are lost on navigation away and back. Users building complex comparisons lose their work instantly. Should persist to `sessionStorage` or URL search params so the comparison survives a page refresh or brief navigation.

---

### UX-06 — "My Trades" tab only available after user data loads — causes layout shift
**File:** `app/trading/page.tsx:249`

```ts
const allTabs = user ? [...tabs, { id: 'mine' as Tab, label: 'My Trades' }] : tabs
```
On initial load, the tab bar renders 2 tabs. When auth resolves and a user is logged in, it jumps to 3 tabs. This causes a visible layout shift in the tab bar, especially noticeable since tabs are `flex-1` (full-width distribution).

---

### UX-07 — No brainrot detail/profile pages
**Scope:** Entire app (no `/brainrots/[slug]` route found)

The brainrots index page shows a hover overlay with stats, but there are no individual brainrot pages. Users can't share a link to a specific brainrot, see its full trade history, or find all trades that include it. With individual slugs already in the `NewBrainrot` interface (`slug: string`), the infrastructure is ready but the pages don't exist.

---

### UX-08 — Trade chat always visible, even before any messages exist
**File:** `app/trading/[tradeId]/TradePageClient.tsx:571-578`

The `<TradeChat>` component is always rendered without checking if there are existing messages. If the component renders a container with visible chrome (border, padding) even when empty, it creates visual noise. Should render conditionally or show a subtle "Start a conversation" placeholder only when appropriate.

---

### UI-01 — `rarity-epic` color (#800080) has very low contrast against dark background
**File:** `app/globals.css:142-147`

```css
.rarity-epic {
  color: #800080; /* pure dark purple — WCAG contrast ratio ~3.2:1 against darkbg-950 */
}
```
While `rarity-rare` (`#00ffff`) and `rarity-legendary` (`#ffff00`) are bright/saturated, `rarity-epic` is a dark muted purple that is difficult to read on dark backgrounds. Should be lightened to at least `#b060d0` or similar to match the visual weight of other rarities.

---

### UI-02 — Mutation badge shows only first letter — ambiguous for same-initial mutations
**File:** `components/trading/TradeCard.tsx:265`

```ts
{item.mutation.name.charAt(0)}
```
Multiple mutations could share the same first letter (e.g., "Gold" / "Galaxy" both show "G"). This is particularly confusing for new users who haven't memorized mutation names. Should show abbreviated name (2-3 chars) or use a color-only indicator that references the full name on hover.

---

### UI-03 — Global scrollbar hidden — accessibility concern
**File:** `app/globals.css:24-33`

```css
html, body {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```
Hiding the scrollbar globally removes a key spatial orientation cue. Users have no indication of their scroll position on long pages (trading hub, brainrots index). This can be disorienting, especially for users with motor or cognitive disabilities. Consider showing a thin, styled scrollbar instead of hiding it entirely.

---

### UI-04 — Inconsistent text case convention across pages
**Scope:** `app/page.tsx`, `app/trading/page.tsx`, `app/brainrots/page.tsx`

The homepage uses all-lowercase ("trade brainrots together", "how it works", "start trading"), while the trading page uses Title Case ("Trading Hub", "Browse and post Brainrot trades"), and the brainrots page uses lowercase ("brainrot index"). This inconsistency makes the app feel less polished. A consistent convention should be established and applied throughout.

---

### PERF-03 — Multiple tooltip portals rendered on every trade card hover
**File:** `components/trading/TradeCard.tsx:179-199`, `277-336`

Each `CompactItem` and `TraitIcons` in a TradeCard creates a tooltip portal via `createPortal(... , document.body)`. On the trading page with 12 cards × 6 items each, there can be dozens of portal tooltip containers mounted simultaneously to `document.body`. While the content is conditionally shown, the portals themselves exist for every hovered item. Consider using a single shared global tooltip component with a context/store to reduce DOM nodes.

---

### PERF-04 — `TradeCard` computes `formattedDate` and `formattedDateWithSuffix` as separate memos
**File:** `components/trading/TradeCard.tsx:759-766`

```ts
const formattedDate = useMemo(
  () => formatDistanceToNow(new Date(trade.createdAt), { addSuffix: false }),
  [trade.createdAt]
)
const formattedDateWithSuffix = useMemo(
  () => formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true }),
  [trade.createdAt]
)
```
`formatDistanceToNow` is called twice with the same date for the same purpose. One call with `addSuffix: true` covers both needs — the "ago" suffix can be stripped for the non-suffix version. Minor optimization but affects every rendered trade card.

---

## ⚪ Low Priority (Backlog) {#low}

### BUG-09 — `card-border-animated::after` uses hardcoded background color
**File:** `app/globals.css:249-252`

```css
.card-border-animated::after {
  background: rgb(30, 36, 52);
}
```
This hardcoded value should match `darkbg-850` or a CSS variable. If the dark palette ever changes, this will visually break the animated border cards, leaving a visible color seam.

---

### BUG-10 — Login page: clipboard API call has no error handling
**File:** `app/login/page.tsx:169-172`

```ts
const handleCopyChallenge = async () => {
  await navigator.clipboard.writeText(challengePhrase)
  // No try/catch — Clipboard API can fail on HTTP, old browsers, or denied permission
  setCopied(true)
```
The Clipboard API requires HTTPS and user permission. If it fails (e.g., on HTTP localhost, or if the user denies clipboard access), the promise rejects silently and the "Copied!" animation never triggers. Should have a `try/catch` with fallback text selection.

---

### UX-09 — No "load more" / infinite scroll on brainrots index — all items animate at once
**File:** `app/brainrots/page.tsx:209-217`

```ts
transition={{ delay: Math.min(i * 0.02, 0.5) }}
```
All brainrots animate in simultaneously with a 0.02s per-item delay capped at 0.5s. With many brainrots, all items after index 25 animate at exactly the same time (0.5s delay), producing a visual "flash" rather than a smooth cascade. Should either paginate/virtualize or remove delays for large lists.

---

### UX-10 — No user profile page
**Scope:** Entire app

There is no `/profile` or `/users/[username]` page. Users cannot view their own trading history, stats, or badge collection. Social features like viewing other traders' profiles (to assess reliability) are absent. The Roblox avatar link in trade cards (`href="https://www.roblox.com/users/..."`) offsite-links to Roblox instead of an in-app profile.

---

### UX-11 — Brainrot index lacks sorting options beyond default income sort
**File:** `app/brainrots/page.tsx:144-147`

Brainrots are always sorted by base income descending. Users might want to sort alphabetically, by rarity tier, or by Robux value. The `Select` component used for rarity filter could easily be extended with a sort dropdown.

---

### UX-12 — No visual confirmation when a trade is deleted/cancelled
**File:** `app/trading/[tradeId]/TradePageClient.tsx:489-497`

Cancelling a trade calls `handleUpdateStatus('CANCELLED')` which re-fetches the trade and shows the new status badge. There's no toast notification or transition. Users may not notice the status changed, especially on mobile where the status badge is small.

---

### UX-13 — iPad "Tap to view" label appears for all trade cards
**File:** `components/trading/TradeCard.tsx:1029`

```tsx
<div className="text-xs text-gray-500 bg-darkbg-700 px-2.5 py-1.5 rounded-lg">
  Tap to view
</div>
```
This label shows for every single trade card on iPad, including completed/cancelled trades where tapping leads to a different experience. This is also redundant since the entire card is a `<Link>`. The label adds visual noise.

---

### PERF-05 — `vercel.json` — check for caching configuration
**File:** `vercel.json`

API routes and static assets do not appear to have explicit `Cache-Control` headers configured in `next.config.ts` or `vercel.json`. Public/stable API endpoints (e.g., `/api/brainrots/all`, `/api/traits`, `/api/mutations`) could benefit from short-lived public cache headers (`s-maxage=60, stale-while-revalidate=300`) to reduce database load on repeated requests.

---

### PERF-06 — 5 continuously animated floating brainrots on homepage
**File:** `app/page.tsx:192-230`

Five images continuously animate with Framer Motion (`floatingAnimation` with infinite repeat) plus parallax transforms via `useScroll`. These animations run even when the hero section is scrolled out of view (there's no `whileInView` check on the animations). Consider pausing the animation using `useInView` or when the section is not visible to save battery and GPU.

---

### PERF-07 — Missing `loading="lazy"` on floating brainrot images in login page
**File:** `app/login/page.tsx:241-248`

The six floating background brainrot images on the login page don't have `loading="lazy"` or `priority` set, relying on default behavior. Since these are purely decorative, they should use `loading="lazy"` to avoid competing with critical login form resources.

---

### UI-05 — `rarity-secret` and `rarity-og` use hardcoded black in dark gradient
**File:** `app/globals.css:167-202`

```css
.rarity-secret {
  background: linear-gradient(180deg, white 0%, white 25%, black 25%, ...);
}
```
The `black` color in the gradient is hardcoded. Against the very dark (but not pure black) dark background, the black portions of the animation actually render visibly darker than the page background, creating an inconsistency. Should use `transparent` or a value closer to the page background color.

---

### UI-06 — Brainrot index page header sticks at `top-16` (64px) matching navbar height
**File:** `app/brainrots/page.tsx:152`

```tsx
<div className={`... sticky top-16 z-40 ...`}>
```
This works perfectly when the navbar is exactly 64px, but there's also the `<MOTD>` banner below the navbar in `layout.tsx:68` which can add variable height. When a MOTD is showing, the sticky header will overlap it during scroll, or the sticky offset will be wrong. Should be `top-[64px + MOTD height]` or use a CSS variable/dynamic offset.

---

### UI-07 — No favicon appears to be animated/differentiated for special events
**File:** `app/layout.tsx:19-27`

The favicon is a static `.ico` and `.png`. For seasonal events (snow effect visible in `SeasonalEffects`), the favicon could be dynamically updated to match the season. Low priority but a nice-to-have polish touch.

---

### SECURITY-02 — Session duration comment mismatch
**File:** `lib/auth.ts:7`

```ts
const SESSION_DURATION_DAYS = 7 // Reduced from 90 for security
```
7-day sessions are reasonable. However, there's no session sliding (the session doesn't extend on activity). An active daily user will be logged out every 7 days and need to re-authenticate. This is likely intentional but could be considered friction for regular users.

---

## Summary Stats {#summary}

| Priority | Count |
|----------|-------|
| 🔴 Critical | 5 |
| 🟠 High | 7 |
| 🟡 Medium | 12 |
| ⚪ Low | 13 |
| **Total** | **37** |

### By Category

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Bugs | 4 | 1 | 2 | 2 |
| UX | 1 | 4 | 4 | 5 |
| UI Polish | 0 | 0 | 4 | 3 |
| Performance | 0 | 2 | 2 | 2 |
| Security | 0 | 1 | 0 | 1 |

### Immediate Action Items
1. **Fix BUG-01** — `BigInt()` crash on decimal income values (affects trade detail pages)
2. **Fix BUG-02** — Make homepage carousel cards clickable/navigable
3. **Fix BUG-04** — Add `.catch()` to BrainrotPicker data fetch
4. **Fix BUG-03** — Audit `requireSeller()` — remove or fix the `SELLER` role reference
5. **Fix SECURITY-01** — Switch admin detection to use Roblox user ID, not username string

---

*Report generated by Claude Code analysis — no code was modified.*
