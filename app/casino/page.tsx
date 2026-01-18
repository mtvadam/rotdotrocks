'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Dice1,
  Rocket,
  Grid3x3,
  Target,
  CircleDot,
  Search,
  Filter,
  Gamepad2,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input, SearchInput } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// Game data
const games = [
  {
    name: 'Dice',
    slug: 'dice',
    description: 'Roll over or under your target number. Simple, fast, and provably fair.',
    icon: Dice1,
    color: 'from-neon-pink to-neon-orange',
    houseEdge: 1,
    category: 'originals',
    isPopular: true,
  },
  {
    name: 'Crash',
    slug: 'crash',
    description: 'Watch the multiplier rise and cash out before it crashes. Multiplayer excitement.',
    icon: Rocket,
    color: 'from-neon-cyan to-status-info',
    houseEdge: 1,
    category: 'originals',
    badge: 'Live',
    isPopular: true,
    isLive: true,
  },
  {
    name: 'Mines',
    slug: 'mines',
    description: 'Navigate through a minefield. Each safe tile increases your multiplier.',
    icon: Grid3x3,
    color: 'from-neon-green to-neon-cyan',
    houseEdge: 1,
    category: 'originals',
    isPopular: true,
  },
  {
    name: 'Limbo',
    slug: 'limbo',
    description: 'Set your target multiplier and see if you can beat the odds.',
    icon: Target,
    color: 'from-neon-purple to-neon-pink',
    houseEdge: 1,
    category: 'originals',
  },
  {
    name: 'Plinko',
    slug: 'plinko',
    description: 'Drop the ball and watch it bounce through pegs to your prize.',
    icon: CircleDot,
    color: 'from-neon-yellow to-neon-orange',
    houseEdge: 1,
    category: 'originals',
    isNew: true,
  },
]

const categories = [
  { id: 'all', name: 'All Games', icon: Gamepad2 },
  { id: 'originals', name: 'Originals', icon: Dice1 },
  { id: 'popular', name: 'Popular', icon: Rocket },
]

export default function CasinoPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Filter games
  const filteredGames = games.filter((game) => {
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'originals' && game.category === 'originals') ||
      (selectedCategory === 'popular' && game.isPopular)

    return matchesSearch && matchesCategory
  })

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Casino</h1>
          <p className="text-sm text-text-secondary">
            Play provably fair games with just 1% house edge
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-64">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games..."
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap',
              'transition-all duration-200',
              selectedCategory === category.id
                ? 'bg-neon-pink text-white'
                : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            )}
          >
            <category.icon className="w-4 h-4" />
            {category.name}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredGames.map((game, index) => (
          <motion.div
            key={game.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Link href={`/casino/${game.slug}`}>
              <Card
                interactive
                padding="none"
                className="group h-full overflow-hidden"
              >
                {/* Game visual */}
                <div className={cn(
                  'relative aspect-square bg-gradient-to-br p-6',
                  'flex items-center justify-center',
                  game.color
                )}>
                  <game.icon className="w-20 h-20 text-white/90 group-hover:scale-110 transition-transform duration-300" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    {game.badge && (
                      <Badge variant="error" size="sm" dot>
                        {game.badge}
                      </Badge>
                    )}
                    {game.isNew && (
                      <Badge variant="info" size="sm">
                        New
                      </Badge>
                    )}
                  </div>

                  {/* Live indicator */}
                  {game.isLive && (
                    <div className="absolute top-3 right-3">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60">
                        <span className="live-dot" />
                        <span className="text-xs font-medium text-white">123</span>
                      </div>
                    </div>
                  )}

                  {/* House edge badge */}
                  <div className="absolute bottom-3 right-3">
                    <Badge variant="success" size="sm">
                      {game.houseEdge}% Edge
                    </Badge>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-heading text-lg font-semibold text-text-primary group-hover:text-neon-pink transition-colors">
                    {game.name}
                  </h3>
                  <p className="text-xs text-text-tertiary mt-1 line-clamp-2">
                    {game.description}
                  </p>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {filteredGames.length === 0 && (
        <div className="text-center py-12">
          <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
          <p className="text-text-secondary">No games found</p>
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {/* Coming Soon */}
      <section className="pt-6 border-t border-border-default">
        <h2 className="font-heading text-xl font-semibold text-text-primary mb-4">Coming Soon</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Roulette', 'Blackjack', 'Slots', 'Keno'].map((game) => (
            <Card key={game} className="relative overflow-hidden opacity-50">
              <div className="aspect-square bg-bg-tertiary flex items-center justify-center">
                <Gamepad2 className="w-12 h-12 text-text-tertiary" />
              </div>
              <div className="p-3 text-center">
                <p className="font-heading font-semibold text-text-secondary">{game}</p>
                <Badge variant="default" size="sm" className="mt-1">Coming Soon</Badge>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
