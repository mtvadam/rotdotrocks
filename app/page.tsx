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
  TrendingUp,
  Users,
  Trophy,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Star,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge, MultiplierBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency } from '@/lib/utils'

// Featured games data
const featuredGames = [
  {
    name: 'Dice',
    slug: 'dice',
    description: 'Classic dice game with customizable win chance',
    icon: Dice1,
    color: 'from-neon-pink to-neon-orange',
  },
  {
    name: 'Crash',
    slug: 'crash',
    description: 'Watch the multiplier rise and cash out before it crashes',
    icon: Rocket,
    badge: 'Live',
    color: 'from-neon-cyan to-status-info',
  },
  {
    name: 'Mines',
    slug: 'mines',
    description: 'Navigate the minefield to multiply your bet',
    icon: Grid3x3,
    color: 'from-neon-green to-neon-cyan',
  },
  {
    name: 'Limbo',
    slug: 'limbo',
    description: 'Set your target multiplier and test your luck',
    icon: Target,
    color: 'from-neon-purple to-neon-pink',
  },
  {
    name: 'Plinko',
    slug: 'plinko',
    description: 'Drop the ball and watch it bounce to your prize',
    icon: CircleDot,
    isNew: true,
    color: 'from-neon-yellow to-neon-orange',
  },
]

// Mock live bets data
const liveBets = [
  { id: '1', user: 'CryptoKing', game: 'Crash', bet: 0.05, multiplier: 3.42, profit: 0.121, currency: 'BTC', time: new Date() },
  { id: '2', user: 'LuckyDice', game: 'Dice', bet: 100, multiplier: 1.98, profit: 98, currency: 'USD', time: new Date(Date.now() - 5000) },
  { id: '3', user: 'MineHunter', game: 'Mines', bet: 50, multiplier: 0, profit: -50, currency: 'USD', time: new Date(Date.now() - 12000) },
  { id: '4', user: 'HighRoller', game: 'Crash', bet: 0.1, multiplier: 8.45, profit: 0.745, currency: 'ETH', time: new Date(Date.now() - 20000) },
  { id: '5', user: 'BetMaster', game: 'Limbo', bet: 200, multiplier: 2.5, profit: 300, currency: 'USD', time: new Date(Date.now() - 35000) },
]

// Mock leaderboard data
const topWinners = [
  { rank: 1, user: 'WhaleAlert', wagered: 125000, profit: 15420, avatar: null },
  { rank: 2, user: 'CryptoKing', wagered: 89000, profit: 12350, avatar: null },
  { rank: 3, user: 'HighRoller', wagered: 67500, profit: 8900, avatar: null },
]

export default function HomePage() {
  return (
    <div className="p-4 lg:p-6 space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-bg-secondary via-bg-secondary to-neon-pink/10 border border-border-default p-6 lg:p-10">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-neon-pink/20 to-transparent" />

        <div className="relative z-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-4xl lg:text-6xl tracking-wider mb-4">
              <span className="text-neon-pink">WELCOME TO</span>
              <br />
              <span className="text-text-primary">VICE CITY</span>
            </h1>
            <p className="text-lg text-text-secondary mb-6 max-w-lg">
              The ultimate GTA-themed crypto casino. Play provably fair games, earn VIP rewards, and experience instant payouts.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Start Playing
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative z-10 mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Bets', value: '2.5M+', icon: TrendingUp },
            { label: 'Players Online', value: '1,234', icon: Users },
            { label: 'Total Won', value: '$12.5M', icon: Trophy },
            { label: 'House Edge', value: '1%', icon: Sparkles },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary/50 backdrop-blur-sm"
            >
              <div className="p-2 rounded-lg bg-neon-pink/10">
                <stat.icon className="w-5 h-5 text-neon-pink" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-tertiary">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Featured Games */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-semibold text-text-primary">Featured Games</h2>
          <Link
            href="/casino"
            className="flex items-center gap-1 text-sm text-neon-pink hover:underline"
          >
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {featuredGames.map((game, index) => (
            <motion.div
              key={game.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Link href={`/casino/${game.slug}`}>
                <Card
                  interactive
                  padding="none"
                  className="group overflow-hidden h-full"
                >
                  {/* Game visual */}
                  <div className={`relative aspect-square bg-gradient-to-br ${game.color} p-6 flex items-center justify-center`}>
                    <game.icon className="w-16 h-16 text-white/90 group-hover:scale-110 transition-transform duration-300" />

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {game.badge && (
                        <Badge variant="error" size="sm" dot>{game.badge}</Badge>
                      )}
                      {game.isNew && (
                        <Badge variant="info" size="sm">New</Badge>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-heading font-semibold text-text-primary group-hover:text-neon-pink transition-colors">
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
      </section>

      {/* Live Bets & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Bets */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xl font-semibold text-text-primary">Live Bets</h2>
              <Badge variant="error" size="sm" dot>Live</Badge>
            </div>
          </div>

          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Game</th>
                    <th className="text-right">Bet</th>
                    <th className="text-right">Multi</th>
                    <th className="text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {liveBets.map((bet) => {
                    const isWin = bet.profit > 0

                    return (
                      <motion.tr
                        key={bet.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="hover:bg-bg-hover"
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar name={bet.user} size="xs" />
                            <span className="text-text-primary font-medium">{bet.user}</span>
                          </div>
                        </td>
                        <td>
                          <Badge variant="default" size="sm">{bet.game}</Badge>
                        </td>
                        <td className="text-right font-mono text-text-secondary">
                          {formatCurrency(bet.bet, bet.currency)} {bet.currency}
                        </td>
                        <td className="text-right">
                          <MultiplierBadge multiplier={bet.multiplier} size="sm" />
                        </td>
                        <td className={`text-right font-mono font-medium ${isWin ? 'text-neon-green' : 'text-status-error'}`}>
                          {isWin ? '+' : ''}{formatCurrency(bet.profit, bet.currency)} {bet.currency}
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* Leaderboard */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl font-semibold text-text-primary">Top Winners</h2>
            <Link
              href="/leaderboard"
              className="flex items-center gap-1 text-sm text-neon-pink hover:underline"
            >
              Full Leaderboard <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <Card className="space-y-3">
            {topWinners.map((winner) => (
              <div
                key={winner.rank}
                className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary/50"
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${winner.rank === 1 ? 'bg-neon-yellow text-black' :
                    winner.rank === 2 ? 'bg-text-secondary text-black' :
                    'bg-neon-orange text-black'}
                `}>
                  {winner.rank}
                </div>
                <Avatar name={winner.user} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">{winner.user}</p>
                  <p className="text-xs text-text-tertiary">
                    Wagered: ${formatCurrency(winner.wagered, 'USD')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-neon-green">
                    +${formatCurrency(winner.profit, 'USD')}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        </section>
      </div>

      {/* Promo Banner */}
      <section>
        <Card className="relative overflow-hidden bg-gradient-to-r from-neon-purple/20 via-neon-pink/20 to-neon-orange/20 border-neon-pink/30">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-neon-pink/20">
                <Star className="w-8 h-8 text-neon-yellow" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-semibold text-text-primary">
                  Join the VIP Club
                </h3>
                <p className="text-text-secondary">
                  Earn up to 1% rakeback, exclusive bonuses, and priority support
                </p>
              </div>
            </div>
            <Button rightIcon={<Zap className="w-4 h-4" />}>
              Learn More
            </Button>
          </div>

          {/* Decorative elements */}
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-neon-pink/10 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-neon-purple/10 blur-3xl" />
        </Card>
      </section>

      {/* Features Grid */}
      <section>
        <h2 className="font-heading text-xl font-semibold text-text-primary mb-4">Why GTA.BET?</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'Provably Fair',
              description: 'Every bet is verifiable using cryptographic proofs',
              icon: '🔐',
            },
            {
              title: 'Instant Payouts',
              description: 'Withdraw your winnings instantly, 24/7',
              icon: '⚡',
            },
            {
              title: 'Low House Edge',
              description: 'Only 1% house edge on all games',
              icon: '📊',
            },
            {
              title: '24/7 Support',
              description: 'Get help anytime from our support team',
              icon: '💬',
            },
          ].map((feature) => (
            <Card key={feature.title} className="text-center">
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="font-heading font-semibold text-text-primary mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-text-tertiary">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
