'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, TrendingUp, Percent, History } from 'lucide-react'
import { BetPanel, SeedDisplay, GameResult } from '@/components/games/BetPanel'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, MultiplierBadge } from '@/components/ui/Badge'
import { cn, formatCurrency, formatMultiplier } from '@/lib/utils'
import { useAuth, useBalance } from '@/components/Providers'

type GameStatus = 'idle' | 'rolling' | 'won' | 'lost'

interface BetResult {
  id: string
  targetMultiplier: number
  result: number
  isWin: boolean
  profit: number
  timestamp: Date
}

// Mock bet history
const initialHistory: BetResult[] = [
  { id: '1', targetMultiplier: 2.0, result: 3.45, isWin: true, profit: 10, timestamp: new Date(Date.now() - 30000) },
  { id: '2', targetMultiplier: 5.0, result: 1.23, isWin: false, profit: -10, timestamp: new Date(Date.now() - 60000) },
  { id: '3', targetMultiplier: 1.5, result: 8.92, isWin: true, profit: 5, timestamp: new Date(Date.now() - 90000) },
  { id: '4', targetMultiplier: 10.0, result: 2.15, isWin: false, profit: -20, timestamp: new Date(Date.now() - 120000) },
]

export default function LimboGame() {
  const { user } = useAuth()
  const balance = useBalance('USD')

  // Game state
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
  const [targetMultiplier, setTargetMultiplier] = useState(2.0)
  const [result, setResult] = useState<number | null>(null)
  const [displayedMultiplier, setDisplayedMultiplier] = useState<number>(1.0)

  // Bet state
  const [betAmount, setBetAmount] = useState(10)
  const [isLoading, setIsLoading] = useState(false)

  // History
  const [history, setHistory] = useState<BetResult[]>(initialHistory)

  // Provably fair
  const [serverSeedHash] = useState('limbo_seed_hash_abc123...')
  const [clientSeed] = useState('player_limbo_seed')
  const [nonce, setNonce] = useState(1)

  // Calculate win chance based on target multiplier
  const winChance = useMemo(() => {
    // With 1% house edge: chance = 0.99 / targetMultiplier
    return Math.min(99, (0.99 / targetMultiplier) * 100)
  }, [targetMultiplier])

  // Generate random result (in production this would be provably fair)
  const generateResult = useCallback(() => {
    // Exponential distribution
    const r = Math.random()
    if (r < 0.01) return 1.0 // 1% chance of 1x
    return 0.99 / r
  }, [])

  // Handle target multiplier change
  const handleTargetChange = useCallback((value: number) => {
    const clamped = Math.max(1.01, Math.min(1000000, value))
    setTargetMultiplier(parseFloat(clamped.toFixed(2)))
  }, [])

  // Quick multiplier presets
  const multiplierPresets = [1.5, 2, 3, 5, 10, 100]

  // Handle place bet
  const handlePlaceBet = useCallback(() => {
    if (betAmount > balance || betAmount <= 0 || isLoading) return

    setIsLoading(true)
    setGameStatus('rolling')
    setResult(null)

    // Animate the multiplier display
    let animationFrame: number
    let startTime = Date.now()
    const duration = 1000 // 1 second animation
    const finalResult = generateResult()

    const animateMultiplier = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / duration)

      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3)

      // Animate towards final result
      const current = 1 + (finalResult - 1) * easeOut
      setDisplayedMultiplier(current)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animateMultiplier)
      } else {
        // Animation complete
        setDisplayedMultiplier(finalResult)
        setResult(finalResult)

        const isWin = finalResult >= targetMultiplier
        setGameStatus(isWin ? 'won' : 'lost')

        // Calculate profit
        const profit = isWin ? betAmount * targetMultiplier - betAmount : -betAmount

        // Add to history
        const newResult: BetResult = {
          id: Date.now().toString(),
          targetMultiplier,
          result: finalResult,
          isWin,
          profit,
          timestamp: new Date(),
        }
        setHistory(prev => [newResult, ...prev.slice(0, 19)])

        setNonce(prev => prev + 1)
        setIsLoading(false)
      }
    }

    animationFrame = requestAnimationFrame(animateMultiplier)

    return () => cancelAnimationFrame(animationFrame)
  }, [betAmount, balance, isLoading, targetMultiplier, generateResult])

  // Reset for next game
  const handleReset = useCallback(() => {
    setGameStatus('idle')
    setResult(null)
    setDisplayedMultiplier(1.0)
  }, [])

  // Calculate profit
  const profit = useMemo(() => {
    if (gameStatus === 'won') {
      return betAmount * targetMultiplier - betAmount
    } else if (gameStatus === 'lost') {
      return -betAmount
    }
    return 0
  }, [gameStatus, betAmount, targetMultiplier])

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-purple/20">
          <Target className="w-6 h-6 text-neon-purple" />
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-text-primary">Limbo</h1>
          <p className="text-sm text-text-secondary">Set your target and test your luck</p>
        </div>
      </div>

      {/* Recent Results */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {history.slice(0, 10).map((bet) => (
          <div
            key={bet.id}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-mono font-bold whitespace-nowrap',
              bet.result < 2 ? 'bg-status-error/20 text-status-error' :
              bet.result < 5 ? 'bg-neon-yellow/20 text-neon-yellow' :
              'bg-neon-green/20 text-neon-green'
            )}
          >
            {bet.result.toFixed(2)}x
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Display */}
          <Card className="relative overflow-hidden bg-gradient-to-b from-bg-secondary to-bg-primary">
            <div className="text-center py-16 relative z-10">
              {/* Target indicator */}
              <div className="mb-6">
                <span className="text-text-secondary text-sm">Target:</span>
                <span className="ml-2 text-neon-purple font-mono font-bold text-xl">
                  {formatMultiplier(targetMultiplier)}
                </span>
              </div>

              {/* Result Display */}
              <motion.div
                key={displayedMultiplier}
                animate={gameStatus === 'rolling' ? {
                  scale: [1, 1.05, 1],
                } : {}}
                transition={{ duration: 0.1 }}
                className={cn(
                  'font-display text-7xl lg:text-9xl',
                  gameStatus === 'idle' && 'text-text-tertiary',
                  gameStatus === 'rolling' && 'text-neon-purple neon-text-purple',
                  gameStatus === 'won' && 'text-neon-green neon-text-green',
                  gameStatus === 'lost' && 'text-status-error'
                )}
              >
                {displayedMultiplier.toFixed(2)}x
              </motion.div>

              {/* Result */}
              <AnimatePresence>
                {(gameStatus === 'won' || gameStatus === 'lost') && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-6"
                  >
                    {gameStatus === 'won' ? (
                      <>
                        <Badge variant="success" size="lg">You Won!</Badge>
                        <p className="mt-2 font-mono text-xl text-neon-green">
                          +{formatCurrency(profit, 'USD')} USD
                        </p>
                      </>
                    ) : (
                      <>
                        <Badge variant="error" size="lg">Too Low</Badge>
                        <p className="mt-2 font-mono text-xl text-status-error">
                          -{formatCurrency(betAmount, 'USD')} USD
                        </p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-neon-purple/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-neon-pink/10 blur-3xl" />
            </div>
          </Card>

          {/* Bet History */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-text-secondary" />
              <h3 className="font-heading font-semibold text-text-primary">Recent Bets</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>Target</th>
                    <th>Result</th>
                    <th className="text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 5).map((bet) => (
                    <tr key={bet.id}>
                      <td>
                        <span className="font-mono text-neon-purple">
                          {bet.targetMultiplier.toFixed(2)}x
                        </span>
                      </td>
                      <td>
                        <MultiplierBadge multiplier={bet.result} size="sm" />
                      </td>
                      <td className={cn(
                        'text-right font-mono font-medium',
                        bet.isWin ? 'text-neon-green' : 'text-status-error'
                      )}>
                        {bet.isWin ? '+' : ''}{formatCurrency(bet.profit, 'USD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          <Card>
            <div className="space-y-4">
              {/* Target Multiplier */}
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Target Multiplier
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    max="1000000"
                    value={targetMultiplier}
                    onChange={(e) => handleTargetChange(parseFloat(e.target.value) || 1.01)}
                    disabled={gameStatus !== 'idle'}
                    className={cn(
                      'input font-mono text-xl pr-8 w-full',
                      gameStatus !== 'idle' && 'opacity-50'
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">x</span>
                </div>

                {/* Quick presets */}
                <div className="flex gap-2 mt-3">
                  {multiplierPresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleTargetChange(preset)}
                      disabled={gameStatus !== 'idle'}
                      className={cn(
                        'flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors',
                        targetMultiplier === preset
                          ? 'bg-neon-purple text-white'
                          : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover',
                        gameStatus !== 'idle' && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {preset}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Win Chance */}
              <div className="p-3 rounded-lg bg-bg-tertiary/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-neon-cyan" />
                    <span className="text-sm text-text-secondary">Win Chance</span>
                  </div>
                  <span className="font-mono font-bold text-neon-cyan text-lg">
                    {winChance.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Potential Win */}
              <div className="p-3 rounded-lg bg-bg-tertiary/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-neon-green" />
                    <span className="text-sm text-text-secondary">Potential Win</span>
                  </div>
                  <span className="font-mono font-bold text-neon-green text-lg">
                    {formatCurrency(betAmount * targetMultiplier, 'USD')}
                  </span>
                </div>
              </div>

              {/* Bet Panel */}
              {gameStatus === 'idle' ? (
                <BetPanel
                  betAmount={betAmount}
                  onBetAmountChange={setBetAmount}
                  onPlaceBet={handlePlaceBet}
                  isLoading={isLoading}
                  disabled={!user || betAmount > balance}
                  betButtonText="Roll"
                  currency="USD"
                  showAutoBet={false}
                />
              ) : (
                <Button
                  fullWidth
                  size="lg"
                  onClick={handleReset}
                  disabled={gameStatus === 'rolling'}
                  className={cn(gameStatus === 'rolling' && 'opacity-50')}
                >
                  {gameStatus === 'rolling' ? 'Rolling...' : 'Play Again'}
                </Button>
              )}
            </div>
          </Card>

          {/* Game Info */}
          <Card padding="sm">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">House Edge</span>
                <span className="text-text-primary">1%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Max Multiplier</span>
                <span className="text-neon-purple font-mono">1,000,000x</span>
              </div>
            </div>
          </Card>

          {/* Provably Fair */}
          <SeedDisplay
            serverSeedHash={serverSeedHash}
            clientSeed={clientSeed}
            nonce={nonce}
          />
        </div>
      </div>
    </div>
  )
}
