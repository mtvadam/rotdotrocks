'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Divide, X, Coins, Percent, RefreshCw, Keyboard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, NumberInput } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn, formatCurrency, clamp, type Currency } from '@/lib/utils'
import { useBalance } from '@/components/Providers'

export interface BetPanelProps {
  minBet?: number
  maxBet?: number
  currency?: Currency
  isLoading?: boolean
  disabled?: boolean
  betAmount: number
  onBetAmountChange: (amount: number) => void
  onPlaceBet: () => void
  children?: ReactNode // For game-specific controls
  showAutoBet?: boolean
  betButtonText?: string
  betButtonDisabled?: boolean
  className?: string
}

export function BetPanel({
  minBet = 0.01,
  maxBet = 10000,
  currency = 'USD',
  isLoading = false,
  disabled = false,
  betAmount,
  onBetAmountChange,
  onPlaceBet,
  children,
  showAutoBet = true,
  betButtonText = 'Bet',
  betButtonDisabled = false,
  className,
}: BetPanelProps) {
  const balance = useBalance(currency)
  const [autoBetEnabled, setAutoBetEnabled] = useState(false)

  // Quick bet amount actions
  const handleHalf = useCallback(() => {
    onBetAmountChange(clamp(betAmount / 2, minBet, maxBet))
  }, [betAmount, minBet, maxBet, onBetAmountChange])

  const handleDouble = useCallback(() => {
    const doubled = betAmount * 2
    const maxAllowed = Math.min(maxBet, balance)
    onBetAmountChange(clamp(doubled, minBet, maxAllowed))
  }, [betAmount, minBet, maxBet, balance, onBetAmountChange])

  const handleMax = useCallback(() => {
    const maxAllowed = Math.min(maxBet, balance)
    onBetAmountChange(clamp(maxAllowed, minBet, maxAllowed))
  }, [minBet, maxBet, balance, onBetAmountChange])

  const handleBetChange = useCallback((value: number) => {
    onBetAmountChange(clamp(value, 0, Math.min(maxBet, balance)))
  }, [maxBet, balance, onBetAmountChange])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' && !disabled && !isLoading) {
      e.preventDefault()
      onPlaceBet()
    }
  }, [disabled, isLoading, onPlaceBet])

  const isValidBet = betAmount >= minBet && betAmount <= balance

  return (
    <Card
      className={cn('', className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="space-y-4">
        {/* Bet Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-text-secondary">
              Bet Amount
            </label>
            <span className="text-xs text-text-tertiary">
              Balance: {formatCurrency(balance, currency)} {currency}
            </span>
          </div>

          <div className="relative">
            <NumberInput
              value={betAmount}
              onChange={handleBetChange}
              min={minBet}
              max={Math.min(maxBet, balance)}
              precision={currency === 'BTC' ? 8 : 2}
              disabled={disabled || isLoading}
              leftIcon={<Coins className="w-4 h-4" />}
              className="pr-32"
            />

            {/* Quick actions */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Tooltip content="Half bet">
                <button
                  type="button"
                  onClick={handleHalf}
                  disabled={disabled || isLoading}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    'bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary',
                    'transition-colors disabled:opacity-50'
                  )}
                >
                  ½
                </button>
              </Tooltip>
              <Tooltip content="Double bet">
                <button
                  type="button"
                  onClick={handleDouble}
                  disabled={disabled || isLoading}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    'bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary',
                    'transition-colors disabled:opacity-50'
                  )}
                >
                  2x
                </button>
              </Tooltip>
              <Tooltip content="Max bet">
                <button
                  type="button"
                  onClick={handleMax}
                  disabled={disabled || isLoading}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    'bg-neon-pink/20 hover:bg-neon-pink/30 text-neon-pink',
                    'transition-colors disabled:opacity-50'
                  )}
                >
                  Max
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Validation message */}
          {betAmount > 0 && !isValidBet && (
            <p className="mt-1 text-xs text-status-error">
              {betAmount < minBet
                ? `Minimum bet is ${formatCurrency(minBet, currency)} ${currency}`
                : `Insufficient balance`}
            </p>
          )}
        </div>

        {/* Game-specific controls */}
        {children}

        {/* Bet Button */}
        <Button
          fullWidth
          size="lg"
          onClick={onPlaceBet}
          disabled={disabled || isLoading || betButtonDisabled || !isValidBet}
          isLoading={isLoading}
          className="font-display text-xl tracking-wider"
        >
          {betButtonText}
        </Button>

        {/* Keyboard shortcut hint */}
        <div className="flex items-center justify-center gap-2 text-xs text-text-tertiary">
          <Keyboard className="w-3 h-3" />
          <span>Press <kbd className="px-1 py-0.5 rounded bg-bg-tertiary font-mono">Space</kbd> to bet</span>
        </div>

        {/* Auto bet toggle (future feature) */}
        {showAutoBet && (
          <div className="pt-3 border-t border-border-default">
            <button
              type="button"
              onClick={() => setAutoBetEnabled(!autoBetEnabled)}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2 rounded-lg',
                'text-sm transition-colors',
                autoBetEnabled
                  ? 'bg-neon-pink/10 text-neon-pink'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              )}
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Auto Bet
              </span>
              <Badge variant={autoBetEnabled ? 'neon' : 'default'} size="sm">
                {autoBetEnabled ? 'On' : 'Off'}
              </Badge>
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}

// Preset bet amounts
export interface BetPresetsProps {
  presets: number[]
  currency?: Currency
  onSelect: (amount: number) => void
  disabled?: boolean
}

export function BetPresets({ presets, currency = 'USD', onSelect, disabled }: BetPresetsProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {presets.map((amount) => (
        <button
          key={amount}
          type="button"
          onClick={() => onSelect(amount)}
          disabled={disabled}
          className={cn(
            'px-3 py-2 rounded-lg text-sm font-medium',
            'bg-bg-tertiary hover:bg-bg-hover',
            'text-text-secondary hover:text-text-primary',
            'transition-colors disabled:opacity-50'
          )}
        >
          {formatCurrency(amount, currency)}
        </button>
      ))}
    </div>
  )
}

// Win/Loss display
export interface GameResultProps {
  won: boolean
  multiplier: number
  payout: number
  currency?: Currency
  className?: string
}

export function GameResult({ won, multiplier, payout, currency = 'USD', className }: GameResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'p-4 rounded-lg text-center',
        won ? 'bg-neon-green/10 border border-neon-green/30' : 'bg-status-error/10 border border-status-error/30',
        className
      )}
    >
      <p className={cn(
        'text-sm font-medium mb-1',
        won ? 'text-neon-green' : 'text-status-error'
      )}>
        {won ? 'You Won!' : 'You Lost'}
      </p>
      <p className={cn(
        'font-display text-3xl',
        won ? 'text-neon-green' : 'text-status-error'
      )}>
        {multiplier.toFixed(2)}x
      </p>
      {won && (
        <p className="text-sm text-text-secondary mt-1">
          +{formatCurrency(payout, currency)} {currency}
        </p>
      )}
    </motion.div>
  )
}

// Provably fair seed display
export interface SeedDisplayProps {
  serverSeedHash: string
  clientSeed: string
  nonce: number
  onChangeClientSeed?: (seed: string) => void
  onRevealServerSeed?: () => void
  serverSeed?: string
}

export function SeedDisplay({
  serverSeedHash,
  clientSeed,
  nonce,
  onChangeClientSeed,
  onRevealServerSeed,
  serverSeed,
}: SeedDisplayProps) {
  return (
    <Card padding="sm" className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary uppercase">Provably Fair</span>
        <Badge variant="success" size="sm">Verified</Badge>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <label className="text-text-tertiary">Server Seed Hash</label>
          <p className="font-mono text-text-secondary truncate">{serverSeedHash}</p>
        </div>

        <div>
          <label className="text-text-tertiary">Client Seed</label>
          {onChangeClientSeed ? (
            <Input
              value={clientSeed}
              onChange={(e) => onChangeClientSeed(e.target.value)}
              inputSize="sm"
              className="font-mono"
            />
          ) : (
            <p className="font-mono text-text-secondary">{clientSeed}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-text-tertiary">Nonce</label>
            <p className="font-mono text-text-secondary">{nonce}</p>
          </div>
          {onRevealServerSeed && !serverSeed && (
            <Button size="sm" variant="ghost" onClick={onRevealServerSeed}>
              Reveal Seed
            </Button>
          )}
        </div>

        {serverSeed && (
          <div>
            <label className="text-text-tertiary">Server Seed (Revealed)</label>
            <p className="font-mono text-text-secondary truncate">{serverSeed}</p>
          </div>
        )}
      </div>
    </Card>
  )
}
