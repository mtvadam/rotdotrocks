'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, Users, TrendingUp, Clock, History } from 'lucide-react'
import { BetPanel, SeedDisplay } from '@/components/games/BetPanel'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, MultiplierBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatCurrency, formatMultiplier, formatRelativeTime } from '@/lib/utils'
import { useAuth, useBalance } from '@/components/Providers'

type GameStatus = 'waiting' | 'running' | 'crashed'

interface Player {
  id: string
  username: string
  avatar?: string
  bet: number
  cashoutAt?: number
  won?: boolean
}

// Mock players
const mockPlayers: Player[] = [
  { id: '1', username: 'CryptoKing', bet: 50, cashoutAt: 2.34, won: true },
  { id: '2', username: 'HighRoller', bet: 100 },
  { id: '3', username: 'LuckyDice', bet: 25, cashoutAt: 1.5, won: true },
  { id: '4', username: 'BetMaster', bet: 75 },
  { id: '5', username: 'WhaleAlert', bet: 200 },
]

// Previous crash points for history
const crashHistory = [1.23, 3.45, 1.01, 8.92, 2.15, 1.87, 4.56, 1.12, 15.67, 2.89]

export default function CrashGame() {
  const { user } = useAuth()
  const balance = useBalance('USD')

  // Game state
  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting')
  const [multiplier, setMultiplier] = useState(1.0)
  const [crashPoint, setCrashPoint] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(5)

  // Player bet state
  const [betAmount, setBetAmount] = useState(10)
  const [autoCashout, setAutoCashout] = useState<number | null>(null)
  const [hasBet, setHasBet] = useState(false)
  const [hasCashedOut, setHasCashedOut] = useState(false)
  const [cashoutMultiplier, setCashoutMultiplier] = useState<number | null>(null)

  // Players in current round
  const [players, setPlayers] = useState<Player[]>(mockPlayers)

  // Animation refs
  const animationRef = useRef<number>()
  const startTimeRef = useRef<number>()

  // Provably fair
  const [serverSeedHash] = useState('crash_seed_hash_abc123...')
  const [clientSeed] = useState('player_crash_seed')
  const [roundNumber, setRoundNumber] = useState(1234)

  // Generate random crash point (in production this would be provably fair)
  const generateCrashPoint = () => {
    // Simple exponential distribution for demo
    // House edge of 1% is applied
    const r = Math.random()
    if (r < 0.01) return 1.0 // 1% instant crash
    return Math.max(1.0, 0.99 / r)
  }

  // Start game loop
  useEffect(() => {
    let timeout: NodeJS.Timeout

    const runGameCycle = () => {
      // Waiting phase
      setGameStatus('waiting')
      setMultiplier(1.0)
      setCrashPoint(null)
      setHasCashedOut(false)
      setCashoutMultiplier(null)

      let count = 5
      setCountdown(count)

      const countdownInterval = setInterval(() => {
        count--
        setCountdown(count)
        if (count <= 0) {
          clearInterval(countdownInterval)
          startRound()
        }
      }, 1000)
    }

    const startRound = () => {
      // Generate crash point
      const crash = generateCrashPoint()
      setCrashPoint(crash)
      setGameStatus('running')
      startTimeRef.current = Date.now()

      // Update multiplier animation
      const updateMultiplier = () => {
        const elapsed = Date.now() - (startTimeRef.current || Date.now())
        // Exponential growth: starts slow, accelerates
        const newMultiplier = Math.pow(Math.E, elapsed / 6000)

        if (newMultiplier >= crash) {
          // Crashed!
          setMultiplier(crash)
          setGameStatus('crashed')

          // Mark players who didn't cash out as lost
          setPlayers(prev => prev.map(p =>
            !p.cashoutAt ? { ...p, won: false } : p
          ))

          // Auto handle user bet
          if (hasBet && !hasCashedOut) {
            // Lost
          }

          // Wait then restart
          timeout = setTimeout(runGameCycle, 3000)
        } else {
          setMultiplier(newMultiplier)

          // Check auto cashout
          if (hasBet && !hasCashedOut && autoCashout && newMultiplier >= autoCashout) {
            handleCashout()
          }

          animationRef.current = requestAnimationFrame(updateMultiplier)
        }
      }

      animationRef.current = requestAnimationFrame(updateMultiplier)
    }

    runGameCycle()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      clearTimeout(timeout)
    }
  }, []) // Only run once on mount

  // Handle place bet
  const handlePlaceBet = useCallback(() => {
    if (gameStatus !== 'waiting' || hasBet || betAmount > balance) return

    setHasBet(true)
    // Add user to players
    if (user) {
      setPlayers(prev => [...prev, {
        id: 'user',
        username: user.username,
        avatar: user.avatar || undefined,
        bet: betAmount,
      }])
    }
  }, [gameStatus, hasBet, betAmount, balance, user])

  // Handle cashout
  const handleCashout = useCallback(() => {
    if (gameStatus !== 'running' || !hasBet || hasCashedOut) return

    setHasCashedOut(true)
    setCashoutMultiplier(multiplier)

    // Update user in players list
    setPlayers(prev => prev.map(p =>
      p.id === 'user' ? { ...p, cashoutAt: multiplier, won: true } : p
    ))
  }, [gameStatus, hasBet, hasCashedOut, multiplier])

  // Calculate potential win
  const potentialWin = betAmount * multiplier

  // Reset bet for next round
  useEffect(() => {
    if (gameStatus === 'waiting') {
      setHasBet(false)
      setPlayers(mockPlayers)
    }
  }, [gameStatus])

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-cyan/20">
          <Rocket className="w-6 h-6 text-neon-cyan" />
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-text-primary">Crash</h1>
          <p className="text-sm text-text-secondary">Cash out before it crashes</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-text-secondary">
            <Users className="w-4 h-4" />
            <span className="text-sm">{players.length} playing</span>
          </div>
          <Badge variant="error" size="sm" dot>Live</Badge>
        </div>
      </div>

      {/* Crash History */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {crashHistory.map((point, i) => (
          <div
            key={i}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-mono font-bold whitespace-nowrap',
              point < 2 ? 'bg-status-error/20 text-status-error' :
              point < 5 ? 'bg-neon-yellow/20 text-neon-yellow' :
              'bg-neon-green/20 text-neon-green'
            )}
          >
            {point.toFixed(2)}x
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Multiplier Display */}
          <Card className="relative overflow-hidden bg-gradient-to-b from-bg-secondary to-bg-primary">
            <div className="text-center py-16 relative z-10">
              {/* Status */}
              <div className="mb-4">
                {gameStatus === 'waiting' && (
                  <div className="flex items-center justify-center gap-2 text-text-secondary">
                    <Clock className="w-5 h-5" />
                    <span className="font-heading text-xl">
                      Starting in {countdown}s
                    </span>
                  </div>
                )}
                {gameStatus === 'running' && (
                  <Badge variant="success" size="lg">Flying</Badge>
                )}
                {gameStatus === 'crashed' && (
                  <Badge variant="error" size="lg">Crashed</Badge>
                )}
              </div>

              {/* Multiplier */}
              <motion.div
                key={multiplier}
                animate={gameStatus === 'running' ? {
                  scale: [1, 1.02, 1],
                } : {}}
                transition={{ duration: 0.1 }}
                className={cn(
                  'font-display text-7xl lg:text-9xl',
                  gameStatus === 'waiting' && 'text-text-tertiary',
                  gameStatus === 'running' && 'text-neon-green neon-text-green',
                  gameStatus === 'crashed' && 'text-status-error'
                )}
              >
                {multiplier.toFixed(2)}x
              </motion.div>

              {/* User result */}
              {hasBet && hasCashedOut && cashoutMultiplier && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <Badge variant="success" size="lg">
                    Cashed out at {cashoutMultiplier.toFixed(2)}x
                  </Badge>
                  <p className="mt-2 font-mono text-xl text-neon-green">
                    +{formatCurrency(betAmount * cashoutMultiplier - betAmount, 'USD')} USD
                  </p>
                </motion.div>
              )}

              {hasBet && !hasCashedOut && gameStatus === 'crashed' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <Badge variant="error" size="lg">
                    Busted!
                  </Badge>
                  <p className="mt-2 font-mono text-xl text-status-error">
                    -{formatCurrency(betAmount, 'USD')} USD
                  </p>
                </motion.div>
              )}
            </div>

            {/* Animated rocket trail background */}
            <div className="absolute inset-0 overflow-hidden">
              {gameStatus === 'running' && (
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: '-100%' }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-x-0 h-full bg-gradient-to-t from-neon-cyan/20 via-neon-cyan/5 to-transparent"
                />
              )}
            </div>

            {/* Graph line (simplified) */}
            <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden">
              <svg className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={gameStatus === 'crashed' ? '#EF4444' : '#00FF88'} stopOpacity="0.1" />
                    <stop offset="100%" stopColor={gameStatus === 'crashed' ? '#EF4444' : '#00FF88'} stopOpacity="0.5" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 0 128 Q ${Math.min(multiplier * 10, 100)}% ${128 - Math.min(multiplier * 10, 100)} 100% 0`}
                  fill="none"
                  stroke={gameStatus === 'crashed' ? '#EF4444' : '#00FF88'}
                  strokeWidth="3"
                  className="transition-all duration-100"
                />
              </svg>
            </div>
          </Card>

          {/* Players */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4" />
                Players ({players.length})
              </h3>
              <span className="text-sm text-text-secondary">
                Total: {formatCurrency(players.reduce((sum, p) => sum + p.bet, 0), 'USD')}
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    player.cashoutAt ? 'bg-neon-green/5' : player.won === false ? 'bg-status-error/5' : 'bg-bg-tertiary/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={player.username} src={player.avatar} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{player.username}</p>
                      <p className="text-xs text-text-tertiary">
                        Bet: {formatCurrency(player.bet, 'USD')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {player.cashoutAt ? (
                      <>
                        <MultiplierBadge multiplier={player.cashoutAt} size="sm" />
                        <p className="text-xs text-neon-green mt-0.5">
                          +{formatCurrency(player.bet * player.cashoutAt - player.bet, 'USD')}
                        </p>
                      </>
                    ) : player.won === false ? (
                      <Badge variant="error" size="sm">Busted</Badge>
                    ) : (
                      <Badge variant="warning" size="sm">Playing</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Bet Panel */}
        <div className="space-y-4">
          <Card>
            <div className="space-y-4">
              {/* Bet Amount */}
              <BetPanel
                betAmount={betAmount}
                onBetAmountChange={setBetAmount}
                onPlaceBet={handlePlaceBet}
                isLoading={false}
                disabled={gameStatus !== 'waiting' || hasBet || !user}
                betButtonText={
                  hasBet
                    ? gameStatus === 'running'
                      ? `Cashout ${formatCurrency(potentialWin, 'USD')}`
                      : 'Bet Placed'
                    : 'Place Bet'
                }
                betButtonDisabled={hasBet && gameStatus !== 'running'}
                currency="USD"
                showAutoBet={false}
              >
                {/* Auto Cashout */}
                <div className="pt-4 border-t border-border-default">
                  <label className="text-sm font-medium text-text-secondary mb-2 block">
                    Auto Cashout (optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="1.1"
                      placeholder="e.g., 2.00"
                      value={autoCashout || ''}
                      onChange={(e) => setAutoCashout(e.target.value ? parseFloat(e.target.value) : null)}
                      disabled={gameStatus !== 'waiting' || hasBet}
                      className={cn(
                        'input font-mono flex-1',
                        hasBet && 'opacity-50'
                      )}
                    />
                    <span className="flex items-center px-3 bg-bg-tertiary rounded-md text-text-secondary">
                      x
                    </span>
                  </div>
                </div>
              </BetPanel>

              {/* Cashout Button (when running) */}
              {hasBet && gameStatus === 'running' && !hasCashedOut && (
                <Button
                  fullWidth
                  size="lg"
                  variant="success"
                  onClick={handleCashout}
                  className="font-display text-xl animate-pulse-neon"
                >
                  Cashout {formatCurrency(potentialWin, 'USD')}
                </Button>
              )}
            </div>
          </Card>

          {/* Round Info */}
          <Card padding="sm">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Round</span>
              <span className="font-mono text-text-primary">#{roundNumber}</span>
            </div>
          </Card>

          {/* Provably Fair */}
          <SeedDisplay
            serverSeedHash={serverSeedHash}
            clientSeed={clientSeed}
            nonce={roundNumber}
          />
        </div>
      </div>
    </div>
  )
}
