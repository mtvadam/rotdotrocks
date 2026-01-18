'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Crown,
  Trophy,
  Gift,
  Star,
  TrendingUp,
  Clock,
  CheckCircle2,
  Lock,
  Sparkles,
  Percent,
  HeartHandshake,
  BadgePercent,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, VipBadge } from '@/components/ui/Badge'
import { cn, formatCurrency } from '@/lib/utils'
import { useAuth } from '@/components/Providers'
import type { VipTier } from '@/lib/supabase/types'

interface VipLevel {
  tier: VipTier
  name: string
  pointsRequired: number
  rakebackPercentage: number
  levelUpBonus: number
  weeklyBonus: number
  monthlyBonus: number
  color: string
  icon: string
  benefits: string[]
}

const vipLevels: VipLevel[] = [
  {
    tier: 'bronze',
    name: 'Bronze',
    pointsRequired: 0,
    rakebackPercentage: 0.1,
    levelUpBonus: 0,
    weeklyBonus: 0,
    monthlyBonus: 0,
    color: 'from-amber-700 to-amber-900',
    icon: '🥉',
    benefits: ['Access to all games', 'Basic support'],
  },
  {
    tier: 'silver',
    name: 'Silver',
    pointsRequired: 10000,
    rakebackPercentage: 0.25,
    levelUpBonus: 50,
    weeklyBonus: 0.05,
    monthlyBonus: 0.1,
    color: 'from-gray-400 to-gray-600',
    icon: '🥈',
    benefits: ['0.25% rakeback', '$50 level-up bonus', '5% weekly bonus', '10% monthly bonus'],
  },
  {
    tier: 'gold',
    name: 'Gold',
    pointsRequired: 50000,
    rakebackPercentage: 0.5,
    levelUpBonus: 200,
    weeklyBonus: 0.1,
    monthlyBonus: 0.2,
    color: 'from-yellow-500 to-yellow-700',
    icon: '🥇',
    benefits: ['0.5% rakeback', '$200 level-up bonus', '10% weekly bonus', '20% monthly bonus', 'Priority support'],
  },
  {
    tier: 'platinum',
    name: 'Platinum',
    pointsRequired: 250000,
    rakebackPercentage: 0.75,
    levelUpBonus: 1000,
    weeklyBonus: 0.15,
    monthlyBonus: 0.3,
    color: 'from-cyan-400 to-cyan-600',
    icon: '💎',
    benefits: ['0.75% rakeback', '$1,000 level-up bonus', '15% weekly bonus', '30% monthly bonus', 'Priority support', 'Exclusive promotions'],
  },
  {
    tier: 'diamond',
    name: 'Diamond',
    pointsRequired: 1000000,
    rakebackPercentage: 1.0,
    levelUpBonus: 5000,
    weeklyBonus: 0.25,
    monthlyBonus: 0.5,
    color: 'from-neon-pink to-neon-purple',
    icon: '👑',
    benefits: ['1% rakeback', '$5,000 level-up bonus', '25% weekly bonus', '50% monthly bonus', 'VIP host', 'Exclusive events', 'Custom limits'],
  },
]

export default function VipPage() {
  const { user } = useAuth()

  // Mock user VIP data
  const userVipPoints = 35000
  const userVipTier: VipTier = 'silver'
  const rakebackAvailable = 125.50
  const weeklyBonusAvailable = 45.00
  const monthlyBonusAvailable = 0

  // Calculate current and next level
  const currentLevel = vipLevels.find(l => l.tier === userVipTier) || vipLevels[0]
  const currentLevelIndex = vipLevels.findIndex(l => l.tier === userVipTier)
  const nextLevel = vipLevels[currentLevelIndex + 1]

  // Calculate progress to next level
  const progressToNextLevel = useMemo(() => {
    if (!nextLevel) return 100
    const pointsInCurrentTier = userVipPoints - currentLevel.pointsRequired
    const pointsNeeded = nextLevel.pointsRequired - currentLevel.pointsRequired
    return Math.min(100, (pointsInCurrentTier / pointsNeeded) * 100)
  }, [userVipPoints, currentLevel, nextLevel])

  const pointsToNextLevel = nextLevel ? nextLevel.pointsRequired - userVipPoints : 0

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-yellow/20">
          <Crown className="w-6 h-6 text-neon-yellow" />
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-text-primary">VIP Club</h1>
          <p className="text-sm text-text-secondary">Earn rewards as you play</p>
        </div>
      </div>

      {/* User Status Card */}
      <Card className={cn(
        'mb-8 relative overflow-hidden',
        'bg-gradient-to-br',
        currentLevel.color
      )}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="text-6xl">{currentLevel.icon}</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display text-3xl text-white">{currentLevel.name}</span>
                  <VipBadge tier={currentLevel.tier} showLabel={false} />
                </div>
                <p className="text-white/80">
                  {userVipPoints.toLocaleString()} VIP Points
                </p>
              </div>
            </div>

            {nextLevel && (
              <div className="w-full md:w-64">
                <div className="flex justify-between text-sm text-white/80 mb-2">
                  <span>Progress to {nextLevel.name}</span>
                  <span>{pointsToNextLevel.toLocaleString()} pts left</span>
                </div>
                <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressToNextLevel}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Claimable Rewards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Rakeback */}
        <Card className="text-center">
          <div className="p-3 rounded-full bg-neon-green/20 w-fit mx-auto mb-3">
            <Percent className="w-6 h-6 text-neon-green" />
          </div>
          <p className="text-text-secondary text-sm mb-1">Rakeback Available</p>
          <p className="font-display text-2xl text-text-primary mb-3">
            ${formatCurrency(rakebackAvailable, 'USD')}
          </p>
          <Button
            fullWidth
            variant={rakebackAvailable > 0 ? 'success' : 'outline'}
            disabled={rakebackAvailable === 0}
          >
            {rakebackAvailable > 0 ? 'Claim Now' : 'No Rakeback'}
          </Button>
        </Card>

        {/* Weekly Bonus */}
        <Card className="text-center">
          <div className="p-3 rounded-full bg-neon-cyan/20 w-fit mx-auto mb-3">
            <Gift className="w-6 h-6 text-neon-cyan" />
          </div>
          <p className="text-text-secondary text-sm mb-1">Weekly Bonus</p>
          <p className="font-display text-2xl text-text-primary mb-3">
            ${formatCurrency(weeklyBonusAvailable, 'USD')}
          </p>
          <Button
            fullWidth
            variant={weeklyBonusAvailable > 0 ? 'primary' : 'outline'}
            disabled={weeklyBonusAvailable === 0}
          >
            {weeklyBonusAvailable > 0 ? 'Claim Now' : 'Claim Sunday'}
          </Button>
        </Card>

        {/* Monthly Bonus */}
        <Card className="text-center">
          <div className="p-3 rounded-full bg-neon-purple/20 w-fit mx-auto mb-3">
            <Star className="w-6 h-6 text-neon-purple" />
          </div>
          <p className="text-text-secondary text-sm mb-1">Monthly Bonus</p>
          <p className="font-display text-2xl text-text-primary mb-3">
            ${formatCurrency(monthlyBonusAvailable, 'USD')}
          </p>
          <Button
            fullWidth
            variant={monthlyBonusAvailable > 0 ? 'primary' : 'outline'}
            disabled={monthlyBonusAvailable === 0}
          >
            {monthlyBonusAvailable > 0 ? 'Claim Now' : 'Claim 1st'}
          </Button>
        </Card>
      </div>

      {/* VIP Levels */}
      <h2 className="font-heading text-xl font-semibold text-text-primary mb-4">VIP Levels</h2>
      <div className="space-y-4 mb-8">
        {vipLevels.map((level, index) => {
          const isCurrentLevel = level.tier === userVipTier
          const isUnlocked = vipLevels.findIndex(l => l.tier === userVipTier) >= index
          const isNextLevel = index === currentLevelIndex + 1

          return (
            <motion.div
              key={level.tier}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  'transition-all',
                  isCurrentLevel && 'border-neon-pink ring-2 ring-neon-pink/20',
                  !isUnlocked && 'opacity-60'
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Level Info */}
                  <div className="flex items-center gap-4 lg:w-64">
                    <div className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center text-2xl',
                      `bg-gradient-to-br ${level.color}`
                    )}>
                      {level.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-semibold text-text-primary">
                          {level.name}
                        </span>
                        {isCurrentLevel && (
                          <Badge variant="neon" size="sm">Current</Badge>
                        )}
                        {isNextLevel && (
                          <Badge variant="info" size="sm">Next</Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-tertiary">
                        {level.pointsRequired.toLocaleString()} points required
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-text-tertiary">Rakeback</p>
                      <p className="font-mono font-medium text-neon-green">
                        {level.rakebackPercentage}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary">Level-up Bonus</p>
                      <p className="font-mono font-medium text-text-primary">
                        ${level.levelUpBonus.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary">Weekly Bonus</p>
                      <p className="font-mono font-medium text-text-primary">
                        {level.weeklyBonus > 0 ? `${level.weeklyBonus * 100}%` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary">Monthly Bonus</p>
                      <p className="font-mono font-medium text-text-primary">
                        {level.monthlyBonus > 0 ? `${level.monthlyBonus * 100}%` : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="lg:w-32 flex justify-end">
                    {isUnlocked ? (
                      <CheckCircle2 className="w-6 h-6 text-neon-green" />
                    ) : (
                      <Lock className="w-6 h-6 text-text-tertiary" />
                    )}
                  </div>
                </div>

                {/* Benefits */}
                {(isCurrentLevel || isNextLevel) && (
                  <div className="mt-4 pt-4 border-t border-border-default">
                    <p className="text-sm text-text-secondary mb-2">Benefits:</p>
                    <div className="flex flex-wrap gap-2">
                      {level.benefits.map((benefit, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded bg-bg-tertiary text-xs text-text-secondary"
                        >
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* How It Works */}
      <h2 className="font-heading text-xl font-semibold text-text-primary mb-4">How It Works</h2>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="p-3 rounded-full bg-neon-pink/20 w-fit mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-neon-pink" />
            </div>
            <h3 className="font-heading font-semibold text-text-primary mb-2">Earn Points</h3>
            <p className="text-sm text-text-secondary">
              Earn 1 VIP point for every $1 wagered on any game
            </p>
          </div>
          <div className="text-center">
            <div className="p-3 rounded-full bg-neon-cyan/20 w-fit mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-neon-cyan" />
            </div>
            <h3 className="font-heading font-semibold text-text-primary mb-2">Level Up</h3>
            <p className="text-sm text-text-secondary">
              Reach point thresholds to unlock higher VIP tiers
            </p>
          </div>
          <div className="text-center">
            <div className="p-3 rounded-full bg-neon-green/20 w-fit mx-auto mb-3">
              <Gift className="w-6 h-6 text-neon-green" />
            </div>
            <h3 className="font-heading font-semibold text-text-primary mb-2">Claim Rewards</h3>
            <p className="text-sm text-text-secondary">
              Collect rakeback, weekly and monthly bonuses
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
