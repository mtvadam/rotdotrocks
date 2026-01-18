'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dice1, TrendingUp, TrendingDown, History, ChevronUp, ChevronDown } from 'lucide-react'
import { BetPanel, GameResult, SeedDisplay } from '@/components/games/BetPanel'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn, formatCurrency, formatMultiplier, calculateWinChance, calculateMultiplier, roundTo, type Currency } from '@/lib/utils'
import { useAuth, useBalance } from '@/components/Providers'

const HOUSE_EDGE = 0.01 // 1%

// Generate provably fair result
function generateResult(serverSeed: string, clientSeed: string, nonce: number): number {
  // In production, this would use HMAC-SHA256
  // For demo, we use a simple hash-based RNG
  const combined = `${serverSeed}:${clientSeed}:${nonce}`
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash % 10001) / 100 // 0.00 to 100.00
}

// Mock bet history
const mockHistory = [
  { id: '1', target: 50, rollOver: true, result: 67.42, won: true, bet: 10, payout: 19.6, time: new Date() },
  { id: '2', target: 75, rollOver: false, result: 82.15, won: false, bet: 25, payout: 0, time: new Date(Date.now() - 30000) },
  { id: '3', target: 33, rollOver: true, result: 12.88, won: false, bet: 15, payout: 0, time: new Date(Date.now() - 60000) },
  { id: '4', target: 66, rollOver: false, result: 45.22, won: true, bet: 50, payout: 147, time: new Date(Date.now() - 90000) },
]

export default function DiceGame() {
  const { user } = useAuth()
  const balance = useBalance('USD')

  // Game state
  const [betAmount, setBetAmount] = useState(1)
  const [target, setTarget] = useState(50) // 0-100
  const [rollOver, setRollOver] = useState(true) // true = roll over, false = roll under
  const [isRolling, setIsRolling] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [lastWin, setLastWin] = useState<{ won: boolean; multiplier: number; payout: number } | null>(null)

  // Provably fair seeds
  const [serverSeedHash] = useState('abc123def456...') // Would be from server
  const [clientSeed, setClientSeed] = useState('player_seed_xyz')
  const [nonce, setNonce] = useState(1)

  // Calculate win chance and multiplier based on target
  const winChance = useMemo(() => {
    if (rollOver) {
      return (100 - target) / 100
    } else {
      return target / 100
    }
  }, [target, rollOver])

  const multiplier = useMemo(() => {
    return calculateMultiplier(winChance, HOUSE_EDGE)
  }, [winChance])

  const potentialPayout = useMemo(() => {
    return roundTo(betAmount * multiplier, 2)
  }, [betAmount, multiplier])

  // Handle roll
  const handleRoll = useCallback(async () => {
    if (isRolling || betAmount > balance) return

    setIsRolling(true)
    setResult(null)
    setLastWin(null)

    // Simulate roll animation
    const rollDuration = 1500
    const startTime = Date.now()

    // Animate through random numbers
    const animationInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed < rollDuration - 200) {
        setResult(roundTo(Math.random() * 100, 2))
      }
    }, 50)

    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, rollDuration))

    clearInterval(animationInterval)

    // Generate final result
    const finalResult = generateResult('mock_server_seed', clientSeed, nonce)
    setResult(finalResult)
    setNonce(n => n + 1)

    // Determine win/loss
    const won = rollOver ? finalResult > target : finalResult < target
    const payout = won ? roundTo(betAmount * multiplier, 2) : 0

    setLastWin({
      won,
      multiplier: won ? multiplier : 0,
      payout,
    })

    setIsRolling(false)
  }, [isRolling, betAmount, balance, target, rollOver, multiplier, clientSeed, nonce])

  // Handle target change
  const handleTargetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setTarget(Math.min(98, Math.max(2, value)))
  }, [])

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-pink/20">
          <Dice1 className="w-6 h-6 text-neon-pink" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Dice</h1>
          <p className="text-sm text-text-secondary">Roll the dice and win big</p>
        </div>
        <Badge variant="success" size="sm" className="ml-auto">
          1% Edge
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Result Display */}
          <Card className="relative overflow-hidden">
            <div className="text-center py-8">
              {/* Roll direction indicator */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={() => setRollOver(false)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                    !rollOver
                      ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  )}
                >
                  <TrendingDown className="w-4 h-4" />
                  Roll Under
                </button>
                <button
                  onClick={() => setRollOver(true)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                    rollOver
                      ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/50'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  )}
                >
                  <TrendingUp className="w-4 h-4" />
                  Roll Over
                </button>
              </div>

              {/* Result number */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={result?.toString() || 'waiting'}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={cn(
                    'font-display text-7xl lg:text-8xl mb-4',
                    result === null && 'text-text-tertiary',
                    result !== null && lastWin?.won && 'text-neon-green neon-text-green',
                    result !== null && lastWin && !lastWin.won && 'text-status-error'
                  )}
                >
                  {result !== null ? result.toFixed(2) : '??'}
                </motion.div>
              </AnimatePresence>

              {/* Win/Loss message */}
              {lastWin && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'text-lg font-medium',
                    lastWin.won ? 'text-neon-green' : 'text-status-error'
                  )}
                >
                  {lastWin.won
                    ? `Won ${formatCurrency(lastWin.payout, 'USD')} USD (${formatMultiplier(lastWin.multiplier)})`
                    : 'Better luck next time!'}
                </motion.div>
              )}
            </div>

            {/* Visual slider */}
            <div className="px-6 pb-6">
              <div className="relative h-3 rounded-full overflow-hidden bg-bg-tertiary">
                {/* Under zone */}
                <div
                  className="absolute inset-y-0 left-0 bg-neon-cyan/30"
                  style={{ width: `${target}%` }}
                />
                {/* Over zone */}
                <div
                  className="absolute inset-y-0 right-0 bg-neon-pink/30"
                  style={{ width: `${100 - target}%` }}
                />
                {/* Target line */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-text-primary shadow-lg"
                  style={{ left: `${target}%`, transform: 'translateX(-50%)' }}
                />
                {/* Result indicator */}
                {result !== null && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full',
                      'border-2 border-white shadow-lg',
                      lastWin?.won ? 'bg-neon-green' : 'bg-status-error'
                    )}
                    style={{ left: `${result}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                  />
                )}
              </div>

              {/* Scale */}
              <div className="flex justify-between mt-2 text-xs text-text-tertiary">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>
          </Card>

          {/* Target Slider */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">
                  {rollOver ? 'Roll Over' : 'Roll Under'}
                </label>
                <span className="font-mono text-lg font-bold text-text-primary">
                  {target.toFixed(2)}
                </span>
              </div>

              <input
                type="range"
                min="2"
                max="98"
                step="0.01"
                value={target}
                onChange={handleTargetChange}
                className="slider w-full"
              />

              {/* Quick targets */}
              <div className="flex gap-2">
                {[10, 25, 50, 75, 90].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTarget(t)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                      target === t
                        ? 'bg-neon-pink/20 text-neon-pink'
                        : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border-default">
                <div className="text-center">
                  <p className="text-xs text-text-tertiary mb-1">Win Chance</p>
                  <p className="font-mono text-lg font-bold text-text-primary">
                    {(winChance * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-text-tertiary mb-1">Multiplier</p>
                  <p className="font-mono text-lg font-bold text-neon-pink">
                    {formatMultiplier(multiplier)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-text-tertiary mb-1">Potential Win</p>
                  <p className="font-mono text-lg font-bold text-neon-green">
                    {formatCurrency(potentialPayout, 'USD')}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Bet History */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-text-primary flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Bets
              </h3>
            </div>

            <div className="space-y-2">
              {mockHistory.map((bet) => (
                <div
                  key={bet.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    bet.won ? 'bg-neon-green/5' : 'bg-status-error/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      bet.won ? 'bg-neon-green' : 'bg-status-error'
                    )} />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {bet.rollOver ? 'Over' : 'Under'} {bet.target}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        Rolled {bet.result.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'font-mono text-sm font-medium',
                      bet.won ? 'text-neon-green' : 'text-status-error'
                    )}>
                      {bet.won ? '+' : '-'}{formatCurrency(bet.won ? bet.payout - bet.bet : bet.bet, 'USD')}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      Bet: {formatCurrency(bet.bet, 'USD')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Bet Panel */}
        <div className="space-y-4">
          <BetPanel
            betAmount={betAmount}
            onBetAmountChange={setBetAmount}
            onPlaceBet={handleRoll}
            isLoading={isRolling}
            disabled={!user}
            betButtonText={isRolling ? 'Rolling...' : 'Roll Dice'}
            currency="USD"
          />

          {/* Provably Fair */}
          <SeedDisplay
            serverSeedHash={serverSeedHash}
            clientSeed={clientSeed}
            nonce={nonce}
            onChangeClientSeed={setClientSeed}
          />
        </div>
      </div>
    </div>
  )
}
