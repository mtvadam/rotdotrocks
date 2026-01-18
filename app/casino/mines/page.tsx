'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid3x3, Bomb, Gem, RefreshCw, Volume2 } from 'lucide-react'
import { BetPanel, SeedDisplay, GameResult } from '@/components/games/BetPanel'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, MultiplierBadge } from '@/components/ui/Badge'
import { Slider } from '@/components/ui/Slider'
import { cn, formatCurrency, formatMultiplier } from '@/lib/utils'
import { useAuth, useBalance } from '@/components/Providers'

type TileState = 'hidden' | 'gem' | 'mine'
type GameStatus = 'idle' | 'playing' | 'won' | 'lost'

interface Tile {
  id: number
  state: TileState
  isMine: boolean
  revealed: boolean
}

const GRID_SIZE = 5
const TOTAL_TILES = GRID_SIZE * GRID_SIZE

// Calculate multiplier based on revealed gems and total mines
function calculateMultiplier(minesCount: number, gemsRevealed: number): number {
  if (gemsRevealed === 0) return 1

  const safeSpots = TOTAL_TILES - minesCount
  let multiplier = 1

  for (let i = 0; i < gemsRevealed; i++) {
    multiplier *= (safeSpots - i) / (TOTAL_TILES - minesCount - i)
  }

  // Apply house edge (1%)
  return 0.99 * (1 / multiplier)
}

// Pre-calculated multipliers for display
function getNextMultiplier(minesCount: number, gemsRevealed: number): number {
  return calculateMultiplier(minesCount, gemsRevealed + 1)
}

export default function MinesGame() {
  const { user } = useAuth()
  const balance = useBalance('USD')

  // Game state
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle')
  const [tiles, setTiles] = useState<Tile[]>([])
  const [minesCount, setMinesCount] = useState(3)
  const [gemsRevealed, setGemsRevealed] = useState(0)
  const [currentMultiplier, setCurrentMultiplier] = useState(1)

  // Bet state
  const [betAmount, setBetAmount] = useState(10)
  const [isLoading, setIsLoading] = useState(false)

  // Provably fair
  const [serverSeedHash] = useState('mines_seed_hash_abc123...')
  const [clientSeed] = useState('player_mines_seed')
  const [nonce, setNonce] = useState(1)

  // Sound effects (disabled by default)
  const [soundEnabled, setSoundEnabled] = useState(false)

  // Generate mine positions (in production this would use provably fair algorithm)
  const generateMinePositions = useCallback((count: number): number[] => {
    const positions = new Set<number>()
    while (positions.size < count) {
      positions.add(Math.floor(Math.random() * TOTAL_TILES))
    }
    return Array.from(positions)
  }, [])

  // Initialize game board
  const initializeBoard = useCallback((minePositions: number[]): Tile[] => {
    return Array.from({ length: TOTAL_TILES }, (_, i) => ({
      id: i,
      state: 'hidden',
      isMine: minePositions.includes(i),
      revealed: false,
    }))
  }, [])

  // Start new game
  const handleStartGame = useCallback(() => {
    if (betAmount > balance || betAmount <= 0) return

    setIsLoading(true)

    // Simulate network delay
    setTimeout(() => {
      const minePositions = generateMinePositions(minesCount)
      const newTiles = initializeBoard(minePositions)

      setTiles(newTiles)
      setGameStatus('playing')
      setGemsRevealed(0)
      setCurrentMultiplier(1)
      setNonce(prev => prev + 1)
      setIsLoading(false)
    }, 300)
  }, [betAmount, balance, minesCount, generateMinePositions, initializeBoard])

  // Reveal a tile
  const handleRevealTile = useCallback((tileId: number) => {
    if (gameStatus !== 'playing') return

    const tile = tiles[tileId]
    if (tile.revealed) return

    setTiles(prev => prev.map(t =>
      t.id === tileId
        ? { ...t, revealed: true, state: t.isMine ? 'mine' : 'gem' }
        : t
    ))

    if (tile.isMine) {
      // Hit a mine - game over
      setGameStatus('lost')
      // Reveal all tiles
      setTiles(prev => prev.map(t => ({
        ...t,
        revealed: true,
        state: t.isMine ? 'mine' : 'gem',
      })))
    } else {
      // Found a gem
      const newGemsRevealed = gemsRevealed + 1
      setGemsRevealed(newGemsRevealed)
      const newMultiplier = calculateMultiplier(minesCount, newGemsRevealed)
      setCurrentMultiplier(newMultiplier)

      // Check if all gems found
      if (newGemsRevealed === TOTAL_TILES - minesCount) {
        setGameStatus('won')
        // Reveal all tiles
        setTiles(prev => prev.map(t => ({
          ...t,
          revealed: true,
          state: t.isMine ? 'mine' : 'gem',
        })))
      }
    }
  }, [gameStatus, tiles, gemsRevealed, minesCount])

  // Cash out
  const handleCashout = useCallback(() => {
    if (gameStatus !== 'playing' || gemsRevealed === 0) return

    setGameStatus('won')
    // Reveal all tiles
    setTiles(prev => prev.map(t => ({
      ...t,
      revealed: true,
      state: t.isMine ? 'mine' : 'gem',
    })))
  }, [gameStatus, gemsRevealed])

  // Reset game
  const handleReset = useCallback(() => {
    setGameStatus('idle')
    setTiles([])
    setGemsRevealed(0)
    setCurrentMultiplier(1)
  }, [])

  // Calculate winnings
  const currentWinnings = useMemo(() => {
    if (gameStatus === 'lost') return -betAmount
    return betAmount * currentMultiplier - betAmount
  }, [gameStatus, betAmount, currentMultiplier])

  // Next multiplier preview
  const nextMultiplier = useMemo(() => {
    if (gameStatus !== 'playing') return null
    const remaining = TOTAL_TILES - minesCount - gemsRevealed
    if (remaining <= 0) return null
    return getNextMultiplier(minesCount, gemsRevealed)
  }, [gameStatus, minesCount, gemsRevealed])

  // Mine presets
  const minePresets = [1, 3, 5, 10, 24]

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-green/20">
          <Grid3x3 className="w-6 h-6 text-neon-green" />
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-text-primary">Mines</h1>
          <p className="text-sm text-text-secondary">Navigate the minefield</p>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={cn(
            'p-2 rounded-lg transition-colors',
            soundEnabled ? 'bg-neon-green/20 text-neon-green' : 'bg-bg-tertiary text-text-tertiary'
          )}
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Board */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status Bar */}
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Bomb className="w-4 h-4 text-status-error" />
                  <span className="text-sm text-text-secondary">
                    {minesCount} mines
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Gem className="w-4 h-4 text-neon-cyan" />
                  <span className="text-sm text-text-secondary">
                    {gemsRevealed} / {TOTAL_TILES - minesCount} gems
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {gameStatus === 'playing' && (
                  <MultiplierBadge multiplier={currentMultiplier} size="lg" />
                )}
                {gameStatus === 'won' && (
                  <Badge variant="success" size="lg">Won!</Badge>
                )}
                {gameStatus === 'lost' && (
                  <Badge variant="error" size="lg">Lost!</Badge>
                )}
              </div>
            </div>
          </Card>

          {/* Game Grid */}
          <Card className="relative aspect-square max-w-lg mx-auto">
            {/* Idle state overlay */}
            <AnimatePresence>
              {gameStatus === 'idle' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-bg-secondary/90 backdrop-blur-sm rounded-lg z-10"
                >
                  <Grid3x3 className="w-16 h-16 text-neon-green mb-4" />
                  <p className="text-text-secondary text-center mb-4">
                    Select number of mines and place your bet to start
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tiles Grid */}
            <div className="grid grid-cols-5 gap-2 p-2 h-full">
              {(gameStatus === 'idle' ? Array(TOTAL_TILES).fill(null) : tiles).map((tile, index) => (
                <motion.button
                  key={index}
                  onClick={() => tile && handleRevealTile(index)}
                  disabled={gameStatus !== 'playing' || (tile && tile.revealed)}
                  whileHover={gameStatus === 'playing' && tile && !tile.revealed ? { scale: 1.05 } : {}}
                  whileTap={gameStatus === 'playing' && tile && !tile.revealed ? { scale: 0.95 } : {}}
                  className={cn(
                    'relative aspect-square rounded-lg transition-all duration-200',
                    'flex items-center justify-center',
                    'focus:outline-none focus:ring-2 focus:ring-neon-green/50',
                    // Hidden state
                    (!tile || !tile.revealed) && gameStatus === 'playing' && [
                      'bg-gradient-to-br from-bg-tertiary to-bg-secondary',
                      'hover:from-neon-green/20 hover:to-neon-green/10',
                      'border border-border-default hover:border-neon-green/50',
                      'cursor-pointer',
                    ],
                    // Idle state
                    gameStatus === 'idle' && [
                      'bg-bg-tertiary border border-border-default',
                      'cursor-not-allowed opacity-50',
                    ],
                    // Gem revealed
                    tile?.revealed && !tile.isMine && [
                      'bg-gradient-to-br from-neon-cyan/30 to-neon-green/30',
                      'border border-neon-cyan/50',
                    ],
                    // Mine revealed
                    tile?.revealed && tile.isMine && [
                      'bg-gradient-to-br from-status-error/30 to-neon-orange/30',
                      'border border-status-error/50',
                    ],
                    // Game over disabled
                    (gameStatus === 'won' || gameStatus === 'lost') && 'cursor-default'
                  )}
                >
                  <AnimatePresence mode="wait">
                    {tile?.revealed ? (
                      <motion.div
                        key={tile.isMine ? 'mine' : 'gem'}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 15 }}
                      >
                        {tile.isMine ? (
                          <Bomb className="w-8 h-8 text-status-error drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        ) : (
                          <Gem className="w-8 h-8 text-neon-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
                        )}
                      </motion.div>
                    ) : gameStatus === 'playing' ? (
                      <motion.div
                        key="hidden"
                        className="w-4 h-4 rounded-full bg-bg-hover"
                      />
                    ) : null}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>

            {/* Result overlay */}
            <AnimatePresence>
              {(gameStatus === 'won' || gameStatus === 'lost') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <GameResult
                    isWin={gameStatus === 'won'}
                    multiplier={gameStatus === 'won' ? currentMultiplier : 0}
                    profit={currentWinnings}
                    currency="USD"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Next multiplier preview */}
          {gameStatus === 'playing' && nextMultiplier && (
            <div className="text-center">
              <p className="text-sm text-text-secondary">
                Next tile: <span className="text-neon-green font-mono">{formatMultiplier(nextMultiplier)}</span>
              </p>
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Bet Panel or Cashout */}
          <Card>
            {gameStatus === 'idle' ? (
              <div className="space-y-4">
                {/* Mines Selector */}
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-2 block">
                    Number of Mines
                  </label>
                  <Slider
                    value={[minesCount]}
                    onValueChange={([value]) => setMinesCount(value)}
                    min={1}
                    max={24}
                    step={1}
                    disabled={gameStatus !== 'idle'}
                  />
                  <div className="flex justify-between mt-2 text-xs text-text-tertiary">
                    <span>1</span>
                    <span className="text-neon-pink font-bold">{minesCount}</span>
                    <span>24</span>
                  </div>

                  {/* Quick presets */}
                  <div className="flex gap-2 mt-3">
                    {minePresets.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setMinesCount(preset)}
                        className={cn(
                          'flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors',
                          minesCount === preset
                            ? 'bg-neon-pink text-white'
                            : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Starting multiplier info */}
                <div className="p-3 rounded-lg bg-bg-tertiary/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">First tile multiplier</span>
                    <span className="text-neon-green font-mono">
                      {formatMultiplier(getNextMultiplier(minesCount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-text-secondary">Max multiplier</span>
                    <span className="text-neon-yellow font-mono">
                      {formatMultiplier(calculateMultiplier(minesCount, TOTAL_TILES - minesCount))}
                    </span>
                  </div>
                </div>

                <BetPanel
                  betAmount={betAmount}
                  onBetAmountChange={setBetAmount}
                  onPlaceBet={handleStartGame}
                  isLoading={isLoading}
                  disabled={!user || betAmount > balance}
                  betButtonText="Start Game"
                  currency="USD"
                  showAutoBet={false}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current game info */}
                <div className="p-4 rounded-lg bg-bg-tertiary/50 text-center">
                  <p className="text-sm text-text-secondary mb-1">Bet Amount</p>
                  <p className="text-xl font-mono font-bold text-text-primary">
                    {formatCurrency(betAmount, 'USD')} USD
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-bg-tertiary/50 text-center">
                  <p className="text-sm text-text-secondary mb-1">Current Multiplier</p>
                  <p className="text-3xl font-display font-bold text-neon-green">
                    {formatMultiplier(currentMultiplier)}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-bg-tertiary/50 text-center">
                  <p className="text-sm text-text-secondary mb-1">
                    {gameStatus === 'playing' ? 'Potential Win' : 'Result'}
                  </p>
                  <p className={cn(
                    'text-2xl font-mono font-bold',
                    currentWinnings >= 0 ? 'text-neon-green' : 'text-status-error'
                  )}>
                    {currentWinnings >= 0 ? '+' : ''}{formatCurrency(currentWinnings, 'USD')} USD
                  </p>
                </div>

                {/* Action buttons */}
                {gameStatus === 'playing' ? (
                  <Button
                    fullWidth
                    size="lg"
                    variant="success"
                    onClick={handleCashout}
                    disabled={gemsRevealed === 0}
                    className="font-display text-xl"
                  >
                    {gemsRevealed === 0 ? 'Reveal a tile first' : `Cashout ${formatCurrency(betAmount * currentMultiplier, 'USD')}`}
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    size="lg"
                    onClick={handleReset}
                    leftIcon={<RefreshCw className="w-5 h-5" />}
                  >
                    Play Again
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Game Info */}
          <Card padding="sm">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">House Edge</span>
                <span className="text-text-primary">1%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Max Win</span>
                <span className="text-neon-green font-mono">24,752.48x</span>
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
