'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRightLeft, Calculator, Gem, Zap, Users, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useEffect, useState, useMemo, useCallback, memo } from 'react'

interface NewBrainrot {
  id: string
  name: string
  slug: string
  localImage: string | null
  rarity: string | null
}

// Memoized rarity lookup maps for O(1) access instead of repeated string comparisons
const RARITY_COLOR_MAP: Record<string, string> = {
  common: 'rarity-common',
  rare: 'rarity-rare',
  epic: 'rarity-epic',
  legendary: 'rarity-legendary',
  mythic: 'rarity-mythic',
  'brainrot god': 'rarity-god animation-always-running',
  god: 'rarity-god animation-always-running',
  secret: 'rarity-secret animation-always-running',
  festive: 'rarity-festive animation-always-running',
  og: 'rarity-og animation-always-running',
  admin: 'rarity-admin animation-always-running',
}

const RARITY_BORDER_MAP: Record<string, { border: string; animated?: string; glow?: string }> = {
  common: { border: 'border-green-700/50 hover:border-green-600', glow: 'hover:shadow-[0_0_25px_rgba(0,128,0,0.4)]' },
  rare: { border: 'border-cyan-500/50 hover:border-cyan-400', glow: 'hover:shadow-[0_0_25px_rgba(0,255,255,0.4)]' },
  epic: { border: 'border-purple-600/50 hover:border-purple-500', glow: 'hover:shadow-[0_0_25px_rgba(128,0,128,0.4)]' },
  legendary: { border: 'border-yellow-500/50 hover:border-yellow-400', glow: 'hover:shadow-[0_0_25px_rgba(255,255,0,0.4)]' },
  mythic: { border: 'border-red-500/50 hover:border-red-400', glow: 'hover:shadow-[0_0_25px_rgba(255,0,0,0.4)]' },
  'brainrot god': { border: 'border-pink-500/50', animated: 'card-border-animated card-border-god', glow: 'shadow-[0_0_20px_rgba(255,0,128,0.3)]' },
  god: { border: 'border-pink-500/50', animated: 'card-border-animated card-border-god', glow: 'shadow-[0_0_20px_rgba(255,0,128,0.3)]' },
  secret: { border: 'border-gray-400/50', animated: 'card-border-animated card-border-secret', glow: 'shadow-[0_0_20px_rgba(255,255,255,0.2)]' },
  festive: { border: 'border-red-500/50', animated: 'card-border-animated card-border-festive', glow: 'shadow-[0_0_20px_rgba(255,0,0,0.3)]' },
  og: { border: 'border-yellow-500/50', animated: 'card-border-animated card-border-og', glow: 'shadow-[0_0_20px_rgba(255,255,0,0.3)]' },
  admin: { border: 'border-amber-500/50', animated: 'card-border-animated card-border-admin', glow: 'shadow-[0_0_20px_rgba(255,165,0,0.3)]' },
}

const RARITY_TIER_MAP: Record<string, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
  secret: 6,
  festive: 6,
  og: 6,
  'brainrot god': 7,
  god: 7,
  admin: 8,
}

const DEFAULT_BORDER = { border: 'border-darkbg-700 hover:border-darkbg-600', glow: '' }

// Optimized rarity functions using lookup maps
function getRarityColor(rarity: string | null): string {
  if (!rarity) return 'text-gray-400'
  return RARITY_COLOR_MAP[rarity.toLowerCase()] || 'text-gray-400'
}

function getRarityBorder(rarity: string | null): { border: string; animated?: string; glow?: string } {
  if (!rarity) return DEFAULT_BORDER
  return RARITY_BORDER_MAP[rarity.toLowerCase()] || DEFAULT_BORDER
}

function getRarityTier(rarity: string | null): number {
  if (!rarity) return 0
  return RARITY_TIER_MAP[rarity.toLowerCase()] || 0
}

// Static data moved outside component to prevent recreation
const floatingBrainrots = [
  { src: '/brainrot-images/brainrots/tralalero-tralala.png', className: 'top-20 left-[10%]', delay: 0 },
  { src: '/brainrot-images/brainrots/bombardiro-crocodilo.png', className: 'top-32 right-[15%]', delay: 0.5 },
  { src: '/brainrot-images/brainrots/cappuccino-assassino.png', className: 'top-48 left-[20%]', delay: 1 },
  { src: '/brainrot-images/brainrots/brr-brr-patapim.png', className: 'bottom-32 right-[10%]', delay: 1.5 },
  { src: '/brainrot-images/brainrots/chimpanzini-bananini.png', className: 'bottom-48 left-[8%]', delay: 2 },
] as const

// Animation variants defined outside component to prevent recreation on each render
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
} as const

const scaleInVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
} as const

// Memoized floating brainrot animation config (no `as const` - Framer Motion needs mutable arrays)
const floatingAnimation = {
  y: [0, -15, 0],
  rotate: [-3, 3, -3],
}

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [newBrainrots, setNewBrainrots] = useState<NewBrainrot[]>([])
  const [brainrotsLoading, setBrainrotsLoading] = useState(true)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Memoized scroll check to prevent unnecessary recreations
  const checkCarouselScroll = useCallback(() => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }, [])

  // Memoized scroll handler
  const scrollCarousel = useCallback((direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.clientWidth * 0.8
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }, [])

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  const backgroundOpacity = useTransform(scrollYProgress, [0, 0.5], [0.2, 0])

  useEffect(() => {
    // Use AbortController for cleanup
    const controller = new AbortController()

    fetch('/api/brainrots/new', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        setNewBrainrots(data.brainrots || [])
        setBrainrotsLoading(false)
        // Check scroll after data loads
        setTimeout(checkCarouselScroll, 100)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setBrainrotsLoading(false)
        }
      })

    return () => controller.abort()
  }, [checkCarouselScroll])

  return (
    <div ref={containerRef} className="relative bg-darkbg-950 overflow-hidden">
      {/* Floating Brainrots Background with parallax */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden z-[2]"
        style={{ y: backgroundY, opacity: backgroundOpacity }}
      >
        {floatingBrainrots.map((rot, i) => (
          <motion.div
            key={i}
            className={`absolute ${rot.className}`}
            initial={{ opacity: 0, scale: 0, rotate: -180 }}
            animate={{
              opacity: 0.25,
              scale: 1,
              rotate: 0,
            }}
            transition={{
              duration: 0.8,
              delay: 0.5 + (i * 0.15),
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <motion.div
              animate={floatingAnimation}
              transition={{
                duration: 4 + i,
                repeat: Infinity,
                delay: rot.delay,
                ease: "easeInOut"
              }}
            >
              <Image
                src={rot.src}
                alt=""
                width={80}
                height={80}
                className="select-none blur-[1px]"
                loading="lazy"
                sizes="80px"
              />
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      {/* Hero */}
      <div className="relative z-[10] container mx-auto px-4 py-16 md:py-24">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Community badge */}
          <motion.div
            variants={scaleInVariants}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-sm font-medium mb-6"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Users className="w-4 h-4" />
            </motion.div>
            community trading hub
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight"
          >
            trade{' '}
            <span className="relative inline-block">
              <motion.span
                className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-green-500"
                initial={{ backgroundPosition: "0% 50%" }}
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: "200% 200%" }}
              >
                brainrots
              </motion.span>
              <motion.span
                className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </span>
            {' '}together
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-gray-300 mb-2 font-medium"
          >
            Find trades, check values, and connect with other players
          </motion.p>
          <motion.p
            variants={itemVariants}
            className="text-gray-500 mb-8 max-w-lg mx-auto"
          >
            Browse active trades, use the value calculator,
            or post your own listings for the community
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/trading"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors"
              >
                <ArrowRightLeft className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                start trading
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/trading/calculator"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-darkbg-800 hover:bg-darkbg-700 text-gray-200 font-semibold rounded-xl transition-colors border border-darkbg-600"
              >
                <Calculator className="w-5 h-5" />
                check values
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Stats bar */}
      <motion.div
        className="relative z-[10] border-y border-darkbg-800 bg-darkbg-900/50 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 py-8">
          <motion.div
            className="flex flex-wrap justify-center gap-8 md:gap-20 text-center"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants}>
              <motion.p
                className="text-2xl md:text-3xl font-black text-white"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              >
                Free
              </motion.p>
              <p className="text-gray-500 text-sm">to use, always</p>
            </motion.div>
            <motion.div variants={itemVariants}>
              <motion.p
                className="text-2xl md:text-3xl font-black text-green-400"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              >
                Open
              </motion.p>
              <p className="text-gray-500 text-sm">for everyone</p>
            </motion.div>
            <motion.div variants={itemVariants}>
              <motion.p
                className="text-2xl md:text-3xl font-black text-white"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
              >
                Community
              </motion.p>
              <p className="text-gray-500 text-sm">built and run</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* New Brainrots Section - Premium Showcase */}
      {(brainrotsLoading || newBrainrots.length > 0) && (
        <div className="relative z-[10] container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Premium Section Header - z-20 to stay above edge shadows */}
            <div className="relative z-20 flex flex-row items-center justify-between gap-3 mb-10">
              <div className="flex items-center gap-3 min-w-0">
                <motion.div
                  className="p-2 sm:p-3 bg-gradient-to-br from-amber-500/30 to-orange-600/20 rounded-xl sm:rounded-2xl border border-amber-500/30 flex-shrink-0"
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(251, 191, 36, 0.2)',
                      '0 0 40px rgba(251, 191, 36, 0.4)',
                      '0 0 20px rgba(251, 191, 36, 0.2)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                </motion.div>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white truncate">new brainrots!</h2>
                  <p className="text-gray-500 text-xs sm:text-sm hidden min-[400px]:block">freshly added to the collection</p>
                </div>
              </div>
              <Link
                href="/brainrots"
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 rounded-lg sm:rounded-xl transition-all hover:bg-amber-500/10 flex-shrink-0 whitespace-nowrap"
              >
                <span className="hidden sm:inline">view all brainrots</span>
                <span className="sm:hidden">view all</span>
              </Link>
            </div>

            {/* Premium Carousel */}
            <div className="relative">
              {/* Left Arrow */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: canScrollLeft ? 1 : 0 }}
                onClick={() => scrollCarousel('left')}
                disabled={!canScrollLeft}
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-12 h-12 rounded-full bg-darkbg-800/90 backdrop-blur-sm border border-darkbg-600 flex items-center justify-center text-white hover:bg-darkbg-700 hover:border-amber-500/50 transition-all shadow-xl ${!canScrollLeft ? 'pointer-events-none' : ''}`}
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.button>

              {/* Right Arrow */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: canScrollRight ? 1 : 0 }}
                onClick={() => scrollCarousel('right')}
                disabled={!canScrollRight}
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-12 h-12 rounded-full bg-darkbg-800/90 backdrop-blur-sm border border-darkbg-600 flex items-center justify-center text-white hover:bg-darkbg-700 hover:border-amber-500/50 transition-all shadow-xl ${!canScrollRight ? 'pointer-events-none' : ''}`}
              >
                <ChevronRight className="w-6 h-6" />
              </motion.button>

              {/* Left Edge Shadow Overlay - matches page bg darkbg-950: rgb(33, 39, 57) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: canScrollLeft ? 1 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute -left-8 top-0 bottom-0 w-20 md:w-28 z-10 pointer-events-none"
                style={{
                  background: 'linear-gradient(to right, rgb(33, 39, 57) 0%, rgb(33, 39, 57) 40%, rgba(33, 39, 57, 0) 100%)',
                }}
              />

              {/* Right Edge Shadow Overlay - matches page bg darkbg-950: rgb(33, 39, 57) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: canScrollRight ? 1 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute -right-8 top-0 bottom-0 w-20 md:w-28 z-10 pointer-events-none"
                style={{
                  background: 'linear-gradient(to left, rgb(33, 39, 57) 0%, rgb(33, 39, 57) 40%, rgba(33, 39, 57, 0) 100%)',
                }}
              />

              {/* Carousel Container */}
              <div
                ref={carouselRef}
                onScroll={checkCarouselScroll}
                className="flex gap-4 md:gap-5 overflow-x-auto scrollbar-hide scroll-smooth py-8 -my-8 px-8 -mx-8"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* Skeleton Loading State - Premium Card Design */}
                {brainrotsLoading && [...Array(6)].map((_, index) => (
                  <motion.div
                    key={`skeleton-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="relative flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] bg-gradient-to-b from-darkbg-800 to-darkbg-850 rounded-2xl border-2 border-darkbg-700"
                  >
                    {/* Subtle gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 pointer-events-none rounded-2xl" />

                    {/* Image container skeleton */}
                    <div className="aspect-square relative p-3 sm:p-4">
                      <div className="absolute inset-4 skeleton rounded-xl" />
                    </div>

                    {/* Info section skeleton */}
                    <div className="px-3 pb-3 sm:px-4 sm:pb-4 relative z-10">
                      <div className="h-px mb-3 rounded-full bg-gradient-to-r from-transparent via-darkbg-600 to-transparent" />
                      <div className="h-4 w-3/4 mx-auto skeleton rounded mb-2" />
                      <div className="h-3 w-1/2 mx-auto skeleton rounded" />
                    </div>
                  </motion.div>
                ))}

                {/* Actual Brainrot Cards */}
                {!brainrotsLoading && newBrainrots.map((brainrot, index) => {
                  const rarityBorder = getRarityBorder(brainrot.rarity)
                  const rarityTier = getRarityTier(brainrot.rarity)
                  const isSpecialRarity = rarityTier >= 6

                  return (
                    <motion.div
                      key={brainrot.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      whileHover={{ y: -8, scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        group relative flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px]
                        bg-gradient-to-b from-darkbg-800 to-darkbg-850 rounded-2xl
                        border-2 ${rarityBorder.border} ${rarityBorder.animated || ''} ${rarityBorder.glow || ''}
                        transition-all duration-300 cursor-pointer
                      `}
                    >
                      {/* Subtle gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 pointer-events-none rounded-2xl" />

                      {/* NEW badge for special rarities */}
                      {isSpecialRarity && (
                        <motion.div
                          className="absolute top-2 right-2 z-20"
                          initial={{ scale: 0, rotate: -12 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.3 + index * 0.05, type: "spring" }}
                        >
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg">
                            NEW
                          </span>
                        </motion.div>
                      )}

                      {/* Image container */}
                      <div className="aspect-square relative p-3 sm:p-4">
                        {rarityTier >= 4 && (
                          <div className={`absolute inset-4 rounded-xl blur-xl opacity-30 ${
                            rarityTier >= 7 ? 'bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500' :
                            rarityTier === 6 ? 'bg-gradient-to-br from-yellow-500 to-amber-600' :
                            rarityTier === 5 ? 'bg-red-500' :
                            'bg-yellow-500'
                          }`} />
                        )}

                        {brainrot.localImage && (
                          <Image
                            src={brainrot.localImage}
                            alt={brainrot.name}
                            fill
                            className="object-contain p-2 group-hover:scale-110 transition-transform duration-500 ease-out drop-shadow-lg relative z-10"
                            sizes="(max-width: 640px) 160px, (max-width: 768px) 180px, 200px"
                            loading={index < 4 ? "eager" : "lazy"}
                            priority={index < 2}
                          />
                        )}
                      </div>

                      {/* Info section */}
                      <div className="px-3 pb-3 sm:px-4 sm:pb-4 relative z-10">
                        <div className={`h-px mb-3 rounded-full ${
                          rarityTier >= 6 ? 'bg-gradient-to-r from-transparent via-white/30 to-transparent' :
                          'bg-gradient-to-r from-transparent via-darkbg-600 to-transparent'
                        }`} />

                        <p className="text-white font-bold text-sm sm:text-base text-center truncate mb-1">
                          {brainrot.name}
                        </p>

                        {brainrot.rarity && (
                          <p className={`text-xs sm:text-sm text-center font-semibold ${getRarityColor(brainrot.rarity)}`}>
                            {brainrot.rarity}
                          </p>
                        )}
                      </div>

                      {/* Hover shine effect - smooth shimmer */}
                      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                        <div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"
                          style={{
                            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)',
                            backgroundSize: '200% 100%',
                          }}
                        />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Features */}
      <div className="relative z-[10] container mx-auto px-4 py-20">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2">how it works</h2>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div
            className="group bg-gradient-to-b from-darkbg-800/90 to-darkbg-850/90 backdrop-blur-sm rounded-3xl p-8 border border-darkbg-700 hover:border-green-500/30 transition-all hover:shadow-xl hover:shadow-green-500/5"
            variants={itemVariants}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
          >
            <motion.div
              className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-2xl flex items-center justify-center mb-5"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <ArrowRightLeft className="w-7 h-7 text-green-400" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">post your trade</h3>
            <p className="text-gray-400 leading-relaxed">
              List what you have and what you're looking for.
              Add mutations, traits, and all the details in one organized listing.
            </p>
          </motion.div>

          <motion.div
            className="group bg-gradient-to-b from-darkbg-800/90 to-darkbg-850/90 backdrop-blur-sm rounded-3xl p-8 border border-darkbg-700 hover:border-amber-500/30 transition-all hover:shadow-xl hover:shadow-amber-500/5"
            variants={itemVariants}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
          >
            <motion.div
              className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-2xl flex items-center justify-center mb-5"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Gem className="w-7 h-7 text-amber-400" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">gems system</h3>
            <p className="text-gray-400 leading-relaxed">
              Start with 20 gems. Posting costs 5 gems.
              This keeps the feed focused and discourages spam.
            </p>
          </motion.div>

          <motion.div
            className="group bg-gradient-to-b from-darkbg-800/90 to-darkbg-850/90 backdrop-blur-sm rounded-3xl p-8 border border-darkbg-700 hover:border-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/5"
            variants={itemVariants}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
          >
            <motion.div
              className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-2xl flex items-center justify-center mb-5"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Zap className="w-7 h-7 text-purple-400" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">counter offers</h3>
            <p className="text-gray-400 leading-relaxed">
              See something close to what you want? Counter offers are free.
              Negotiate until you find a trade that works for both sides.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* CTA */}
      <div className="relative z-[10] container mx-auto px-4 py-16">
        <motion.div
          className="relative overflow-hidden bg-darkbg-800/90 backdrop-blur-sm border border-darkbg-700 rounded-2xl p-10 md:p-14"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center">
            <motion.h2
              className="text-2xl md:text-3xl font-bold text-white mb-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              ready to find your next trade?
            </motion.h2>
            <motion.p
              className="text-gray-400 mb-8 max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Browse what others are offering or post your own listing.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href="/trading"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors"
              >
                browse trades
                <ArrowRightLeft className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
