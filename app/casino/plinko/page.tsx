'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleDot, History, Settings, Volume2 } from 'lucide-react'
import { BetPanel, SeedDisplay } from '@/components/games/BetPanel'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, MultiplierBadge } from '@/components/ui/Badge'
import { cn, formatCurrency, formatMultiplier } from '@/lib/utils'
import { useAuth, useBalance } from '@/components/Providers'

type RiskLevel = 'low' | 'medium' | 'high'
type RowCount = 8 | 10 | 12 | 14 | 16

interface Ball {
  id: string
  path: number[]
  finalSlot: number
  multiplier: number
  isAnimating: boolean
}

interface BetResult {
  id: string
  multiplier: number
  profit: number
  timestamp: Date
}

// Multiplier configurations based on risk and rows
const multiplierConfigs: Record<RiskLevel, Record<RowCount, number[]>> = {
  low: {
    8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    10: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
    12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    14: [16, 4, 2.2, 1.6, 1.3, 1.1, 1, 0.5, 1, 1.1, 1.3, 1.6, 2.2, 4, 16],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  },
  medium: {
    8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    10: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
    12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    14: [43, 13, 6, 3, 1.3, 0.7, 0.4, 0.2, 0.4, 0.7, 1.3, 3, 6, 13, 43],
    16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  },
  high: {
    8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    10: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
    12: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
    14: [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 56, 420],
    16: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  },
}

export default function PlinkoGame() {
  const { user } = useAuth()
  const balance = useBalance('USD')

  // Game settings
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium')
  const [rowCount, setRowCount] = useState<RowCount>(12)

  // Game state
  const [balls, setBalls] = useState<Ball[]>([])
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null)
  const [lastProfit, setLastProfit] = useState<number | null>(null)

  // Bet state
  const [betAmount, setBetAmount] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [autoDrop, setAutoDrop] = useState(false)

  // History
  const [history, setHistory] = useState<BetResult[]>([])

  // Sound
  const [soundEnabled, setSoundEnabled] = useState(false)

  // Provably fair
  const [serverSeedHash] = useState('plinko_seed_hash_abc123...')
  const [clientSeed] = useState('player_plinko_seed')
  const [nonce, setNonce] = useState(1)

  // Canvas ref for animation
  const canvasRef = useRef<HTMLDivElement>(null)

  // Get current multipliers
  const multipliers = multiplierConfigs[riskLevel][rowCount]

  // Generate ball path (in production this would be provably fair)
  const generatePath = useCallback((): number[] => {
    const path: number[] = []
    let position = 0

    for (let i = 0; i < rowCount; i++) {
      // Random direction: 0 = left, 1 = right
      const direction = Math.random() < 0.5 ? 0 : 1
      position += direction
      path.push(direction)
    }

    return path
  }, [rowCount])

  // Calculate final slot from path
  const calculateSlot = (path: number[]): number => {
    return path.reduce((sum, dir) => sum + dir, 0)
  }

  // Drop a ball
  const handleDropBall = useCallback(() => {
    if (betAmount > balance || betAmount <= 0 || isLoading) return

    setIsLoading(true)
    setLastMultiplier(null)
    setLastProfit(null)

    const path = generatePath()
    const finalSlot = calculateSlot(path)
    const multiplier = multipliers[finalSlot]

    const newBall: Ball = {
      id: Date.now().toString(),
      path,
      finalSlot,
      multiplier,
      isAnimating: true,
    }

    setBalls(prev => [...prev, newBall])

    // Animation duration based on row count
    const animationDuration = rowCount * 150 + 500

    setTimeout(() => {
      // Animation complete
      setLastMultiplier(multiplier)
      const profit = betAmount * multiplier - betAmount
      setLastProfit(profit)

      // Add to history
      const result: BetResult = {
        id: newBall.id,
        multiplier,
        profit,
        timestamp: new Date(),
      }
      setHistory(prev => [result, ...prev.slice(0, 19)])

      // Remove ball from board
      setBalls(prev => prev.filter(b => b.id !== newBall.id))

      setNonce(prev => prev + 1)
      setIsLoading(false)
    }, animationDuration)
  }, [betAmount, balance, isLoading, generatePath, multipliers, rowCount])

  // Peg positions calculation
  const getPegPositions = useCallback(() => {
    const pegs: { x: number; y: number; row: number }[] = []
    const width = 100 // percentage
    const height = 100

    for (let row = 0; row < rowCount; row++) {
      const pegsInRow = row + 3 // Start with 3 pegs
      const rowY = ((row + 1) / (rowCount + 1)) * height

      for (let peg = 0; peg < pegsInRow; peg++) {
        const pegX = ((peg + 0.5) / pegsInRow) * width
        pegs.push({ x: pegX, y: rowY, row })
      }
    }

    return pegs
  }, [rowCount])

  // Risk level colors
  const riskColors = {
    low: 'from-neon-green to-neon-cyan',
    medium: 'from-neon-yellow to-neon-orange',
    high: 'from-status-error to-neon-pink',
  }

  // Row count options
  const rowOptions: RowCount[] = [8, 10, 12, 14, 16]

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-yellow/20">
          <CircleDot className="w-6 h-6 text-neon-yellow" />
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-text-primary">Plinko</h1>
          <p className="text-sm text-text-secondary">Drop the ball and win big</p>
        </div>
        <Badge variant="info" size="sm">New</Badge>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={cn(
            'p-2 rounded-lg transition-colors',
            soundEnabled ? 'bg-neon-yellow/20 text-neon-yellow' : 'bg-bg-tertiary text-text-tertiary'
          )}
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      {/* Recent Results */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {history.slice(0, 15).map((result) => (
          <div
            key={result.id}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-mono font-bold whitespace-nowrap',
              result.multiplier < 1 ? 'bg-status-error/20 text-status-error' :
              result.multiplier < 2 ? 'bg-neon-yellow/20 text-neon-yellow' :
              'bg-neon-green/20 text-neon-green'
            )}
          >
            {result.multiplier.toFixed(1)}x
          </div>
        ))}
        {history.length === 0 && (
          <span className="text-text-tertiary text-sm">No results yet</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Board */}
        <div className="lg:col-span-2 space-y-4">
          {/* Plinko Board */}
          <Card className="relative overflow-hidden bg-gradient-to-b from-bg-secondary to-bg-primary">
            <div
              ref={canvasRef}
              className="relative w-full"
              style={{ paddingBottom: '80%' }}
            >
              {/* Pegs */}
              <div className="absolute inset-0">
                {getPegPositions().map((peg, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-text-tertiary rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${peg.x}%`,
                      top: `${peg.y}%`,
                    }}
                  />
                ))}
              </div>

              {/* Animated Balls */}
              <AnimatePresence>
                {balls.map((ball) => {
                  // Calculate ball animation path
                  const pathKeyframes = ball.path.reduce<{ x: number; y: number }[]>(
                    (acc, dir, i) => {
                      const prevX = acc[acc.length - 1]?.x ?? 50
                      const stepX = 100 / (rowCount + 2)
                      const newX = prevX + (dir === 1 ? stepX / 2 : -stepX / 2)
                      const newY = ((i + 1) / (rowCount + 1)) * 85 + 5
                      acc.push({ x: newX, y: newY })
                      return acc
                    },
                    [{ x: 50, y: 5 }]
                  )

                  return (
                    <motion.div
                      key={ball.id}
                      className="absolute w-4 h-4 rounded-full bg-neon-yellow shadow-lg shadow-neon-yellow/50 -translate-x-1/2 -translate-y-1/2"
                      initial={{ left: '50%', top: '5%' }}
                      animate={{
                        left: pathKeyframes.map(p => `${p.x}%`),
                        top: pathKeyframes.map(p => `${p.y}%`),
                      }}
                      transition={{
                        duration: rowCount * 0.15,
                        ease: 'easeOut',
                        times: pathKeyframes.map((_, i) => i / (pathKeyframes.length - 1)),
                      }}
                    />
                  )
                })}
              </AnimatePresence>

              {/* Multiplier Slots */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-0.5 px-2 pb-2">
                {multipliers.map((mult, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex-1 py-1.5 rounded text-center text-xs font-mono font-bold',
                      'transition-all duration-200',
                      mult >= 10 ? 'bg-neon-green/30 text-neon-green' :
                      mult >= 2 ? 'bg-neon-yellow/30 text-neon-yellow' :
                      mult >= 1 ? 'bg-neon-cyan/30 text-neon-cyan' :
                      'bg-status-error/30 text-status-error'
                    )}
                  >
                    {mult}x
                  </div>
                ))}
              </div>
            </div>

            {/* Last Result Overlay */}
            <AnimatePresence>
              {lastMultiplier !== null && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-bg-primary/50 backdrop-blur-sm"
                >
                  <div className="text-center">
                    <p className={cn(
                      'font-display text-6xl mb-2',
                      lastMultiplier >= 1 ? 'text-neon-green' : 'text-status-error'
                    )}>
                      {lastMultiplier.toFixed(1)}x
                    </p>
                    <p className={cn(
                      'font-mono text-xl',
                      (lastProfit ?? 0) >= 0 ? 'text-neon-green' : 'text-status-error'
                    )}>
                      {(lastProfit ?? 0) >= 0 ? '+' : ''}{formatCurrency(lastProfit ?? 0, 'USD')} USD
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          <Card>
            <div className="space-y-4">
              {/* Risk Level */}
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Risk Level
                </label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as RiskLevel[]).map((risk) => (
                    <button
                      key={risk}
                      onClick={() => setRiskLevel(risk)}
                      disabled={balls.length > 0}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                        riskLevel === risk
                          ? `bg-gradient-to-r ${riskColors[risk]} text-white`
                          : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover',
                        balls.length > 0 && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {risk}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row Count */}
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">
                  Rows
                </label>
                <div className="flex gap-2">
                  {rowOptions.map((rows) => (
                    <button
                      key={rows}
                      onClick={() => setRowCount(rows)}
                      disabled={balls.length > 0}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        rowCount === rows
                          ? 'bg-neon-pink text-white'
                          : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover',
                        balls.length > 0 && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {rows}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bet Panel */}
              <BetPanel
                betAmount={betAmount}
                onBetAmountChange={setBetAmount}
                onPlaceBet={handleDropBall}
                isLoading={isLoading}
                disabled={!user || betAmount > balance}
                betButtonText={isLoading ? 'Dropping...' : 'Drop Ball'}
                currency="USD"
                showAutoBet={false}
              />
            </div>
          </Card>

          {/* Multiplier Preview */}
          <Card padding="sm">
            <h4 className="text-sm font-medium text-text-secondary mb-3">Multipliers</h4>
            <div className="flex flex-wrap gap-1">
              {multipliers.map((mult, i) => (
                <span
                  key={i}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-mono',
                    mult >= 10 ? 'bg-neon-green/20 text-neon-green' :
                    mult >= 2 ? 'bg-neon-yellow/20 text-neon-yellow' :
                    mult >= 1 ? 'bg-neon-cyan/20 text-neon-cyan' :
                    'bg-status-error/20 text-status-error'
                  )}
                >
                  {mult}x
                </span>
              ))}
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
                <span className="text-neon-green font-mono">
                  {Math.max(...multipliers).toFixed(0)}x
                </span>
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
