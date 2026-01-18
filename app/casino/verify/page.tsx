'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  CheckCircle2,
  XCircle,
  Copy,
  RefreshCw,
  Info,
  ChevronDown,
  Lock,
  Unlock,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import {
  verifyBet,
  verifyServerSeed,
  sha256,
  hmacSha256,
  hashToFloat,
  generateClientSeed,
  type VerificationResult,
} from '@/lib/provably-fair'

type GameType = 'dice' | 'crash' | 'mines' | 'limbo' | 'plinko'

interface GameConfig {
  name: string
  description: string
  params: {
    name: string
    key: string
    type: 'number' | 'boolean'
    default: number | boolean
  }[]
}

const gameConfigs: Record<GameType, GameConfig> = {
  dice: {
    name: 'Dice',
    description: 'Verify dice roll outcome',
    params: [
      { name: 'Target', key: 'target', type: 'number', default: 50 },
      { name: 'Roll Over', key: 'isOver', type: 'boolean', default: true },
    ],
  },
  crash: {
    name: 'Crash',
    description: 'Verify crash point',
    params: [],
  },
  mines: {
    name: 'Mines',
    description: 'Verify mine positions',
    params: [
      { name: 'Mines Count', key: 'minesCount', type: 'number', default: 3 },
    ],
  },
  limbo: {
    name: 'Limbo',
    description: 'Verify limbo result',
    params: [],
  },
  plinko: {
    name: 'Plinko',
    description: 'Verify plinko path',
    params: [
      { name: 'Rows', key: 'rows', type: 'number', default: 12 },
    ],
  },
}

export default function VerifyPage() {
  // Form state
  const [gameType, setGameType] = useState<GameType>('dice')
  const [serverSeed, setServerSeed] = useState('')
  const [serverSeedHash, setServerSeedHash] = useState('')
  const [clientSeed, setClientSeed] = useState('')
  const [nonce, setNonce] = useState('1')
  const [expectedOutcome, setExpectedOutcome] = useState('')
  const [gameParams, setGameParams] = useState<Record<string, number | boolean>>({
    target: 50,
    isOver: true,
    minesCount: 3,
    rows: 12,
  })

  // Verification result
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculator state
  const [calcServerSeed, setCalcServerSeed] = useState('')
  const [calcClientSeed, setCalcClientSeed] = useState('')
  const [calcNonce, setCalcNonce] = useState('0')
  const [calcResult, setCalcResult] = useState<string | null>(null)

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
  }, [])

  // Generate new client seed
  const handleGenerateClientSeed = useCallback(() => {
    const newSeed = generateClientSeed()
    setClientSeed(newSeed)
  }, [])

  // Verify bet
  const handleVerify = useCallback(async () => {
    setError(null)
    setResult(null)
    setIsVerifying(true)

    try {
      // Parse expected outcome
      let parsedOutcome: number | number[]
      if (gameType === 'mines') {
        parsedOutcome = expectedOutcome.split(',').map(s => parseInt(s.trim()))
      } else {
        parsedOutcome = parseFloat(expectedOutcome)
      }

      const verificationResult = await verifyBet(
        serverSeed,
        serverSeedHash,
        clientSeed,
        parseInt(nonce),
        gameType,
        parsedOutcome,
        gameParams
      )

      setResult(verificationResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }, [serverSeed, serverSeedHash, clientSeed, nonce, gameType, expectedOutcome, gameParams])

  // Calculate outcome (for testing)
  const handleCalculate = useCallback(async () => {
    if (!calcServerSeed || !calcClientSeed) return

    const combinedSeed = `${calcClientSeed}:${calcNonce}`
    const hash = await hmacSha256(calcServerSeed, combinedSeed)
    const float = hashToFloat(hash)

    setCalcResult(`Hash: ${hash.slice(0, 16)}...\nFloat: ${float.toFixed(8)}`)
  }, [calcServerSeed, calcClientSeed, calcNonce])

  // Hash server seed (for testing)
  const handleHashServerSeed = useCallback(async () => {
    if (!calcServerSeed) return
    const hash = await sha256(calcServerSeed)
    setServerSeedHash(hash)
  }, [calcServerSeed])

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-green/20">
          <Shield className="w-6 h-6 text-neon-green" />
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-text-primary">Provably Fair</h1>
          <p className="text-sm text-text-secondary">Verify that every game outcome is fair</p>
        </div>
      </div>

      {/* How it works */}
      <Card className="mb-6">
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-neon-cyan" />
              <span className="font-heading font-semibold text-text-primary">How Provably Fair Works</span>
            </div>
            <ChevronDown className="w-5 h-5 text-text-tertiary group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-4 space-y-4 text-sm text-text-secondary">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-bg-tertiary/50">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-neon-pink" />
                  <span className="font-medium text-text-primary">Before the Bet</span>
                </div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Server generates a random seed</li>
                  <li>Server hashes the seed (SHA-256)</li>
                  <li>You see only the hash (not the seed)</li>
                  <li>You provide your own client seed</li>
                </ol>
              </div>
              <div className="p-4 rounded-lg bg-bg-tertiary/50">
                <div className="flex items-center gap-2 mb-2">
                  <Unlock className="w-4 h-4 text-neon-green" />
                  <span className="font-medium text-text-primary">After the Bet</span>
                </div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Server reveals the original seed</li>
                  <li>You can verify: SHA256(seed) = hash</li>
                  <li>Outcome is HMAC(serverSeed, clientSeed:nonce)</li>
                  <li>Server cannot predict your seed</li>
                </ol>
              </div>
            </div>
            <p className="text-text-tertiary">
              This system ensures that neither the casino nor the player can manipulate the outcome.
              The server commits to a seed before the bet, and the final outcome depends on both seeds.
            </p>
          </div>
        </details>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Form */}
        <Card>
          <h2 className="font-heading text-lg font-semibold text-text-primary mb-4">
            Verify a Bet
          </h2>

          <div className="space-y-4">
            {/* Game Type */}
            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">
                Game Type
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(gameConfigs) as GameType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setGameType(type)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize',
                      gameType === type
                        ? 'bg-neon-pink text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Server Seed */}
            <Input
              label="Server Seed (revealed after bet)"
              value={serverSeed}
              onChange={(e) => setServerSeed(e.target.value)}
              placeholder="Enter the revealed server seed"
              rightElement={
                <button
                  onClick={() => copyToClipboard(serverSeed)}
                  className="h-full px-3 text-text-tertiary hover:text-text-primary"
                >
                  <Copy className="w-4 h-4" />
                </button>
              }
            />

            {/* Server Seed Hash */}
            <Input
              label="Server Seed Hash (shown before bet)"
              value={serverSeedHash}
              onChange={(e) => setServerSeedHash(e.target.value)}
              placeholder="Enter the server seed hash"
            />

            {/* Client Seed */}
            <Input
              label="Client Seed"
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              placeholder="Enter your client seed"
              rightElement={
                <button
                  onClick={handleGenerateClientSeed}
                  className="h-full px-3 text-text-tertiary hover:text-text-primary"
                  title="Generate new seed"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              }
            />

            {/* Nonce */}
            <Input
              label="Nonce (bet number)"
              type="number"
              value={nonce}
              onChange={(e) => setNonce(e.target.value)}
              placeholder="Enter the bet nonce"
            />

            {/* Game-specific params */}
            {gameConfigs[gameType].params.map((param) => (
              <div key={param.key}>
                {param.type === 'boolean' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gameParams[param.key] as boolean}
                      onChange={(e) => setGameParams(prev => ({
                        ...prev,
                        [param.key]: e.target.checked,
                      }))}
                      className="w-4 h-4 rounded border-border-default text-neon-pink focus:ring-neon-pink"
                    />
                    <span className="text-sm text-text-secondary">{param.name}</span>
                  </label>
                ) : (
                  <Input
                    label={param.name}
                    type="number"
                    value={gameParams[param.key] as number}
                    onChange={(e) => setGameParams(prev => ({
                      ...prev,
                      [param.key]: parseFloat(e.target.value) || 0,
                    }))}
                  />
                )}
              </div>
            ))}

            {/* Expected Outcome */}
            <Input
              label={`Expected Outcome ${gameType === 'mines' ? '(comma-separated positions)' : ''}`}
              value={expectedOutcome}
              onChange={(e) => setExpectedOutcome(e.target.value)}
              placeholder={gameType === 'mines' ? 'e.g., 0, 5, 12' : 'e.g., 45.23'}
            />

            {/* Verify Button */}
            <Button
              fullWidth
              onClick={handleVerify}
              isLoading={isVerifying}
              disabled={!serverSeed || !serverSeedHash || !clientSeed}
            >
              Verify Bet
            </Button>
          </div>

          {/* Result */}
          <AnimatePresence>
            {(result || error) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4"
              >
                {error ? (
                  <div className="p-4 rounded-lg bg-status-error/10 border border-status-error/30">
                    <div className="flex items-center gap-2 text-status-error">
                      <XCircle className="w-5 h-5" />
                      <span className="font-medium">Error</span>
                    </div>
                    <p className="mt-2 text-sm text-status-error">{error}</p>
                  </div>
                ) : result && (
                  <div className={cn(
                    'p-4 rounded-lg border',
                    result.isValid
                      ? 'bg-neon-green/10 border-neon-green/30'
                      : 'bg-status-error/10 border-status-error/30'
                  )}>
                    <div className={cn(
                      'flex items-center gap-2',
                      result.isValid ? 'text-neon-green' : 'text-status-error'
                    )}>
                      {result.isValid ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                      <span className="font-medium">
                        {result.isValid ? 'Verification Passed' : 'Verification Failed'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Server Seed Match</span>
                        <Badge variant={result.serverSeedMatch ? 'success' : 'error'} size="sm">
                          {result.serverSeedMatch ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Outcome Match</span>
                        <Badge variant={result.outcomeMatch ? 'success' : 'error'} size="sm">
                          {result.outcomeMatch ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <p className="text-text-tertiary mt-2 font-mono text-xs break-all">
                        {result.details}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Calculator */}
        <div className="space-y-6">
          <Card>
            <h2 className="font-heading text-lg font-semibold text-text-primary mb-4">
              Outcome Calculator
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Test how outcomes are generated from seeds
            </p>

            <div className="space-y-4">
              <Input
                label="Server Seed"
                value={calcServerSeed}
                onChange={(e) => setCalcServerSeed(e.target.value)}
                placeholder="Enter server seed"
              />
              <Input
                label="Client Seed"
                value={calcClientSeed}
                onChange={(e) => setCalcClientSeed(e.target.value)}
                placeholder="Enter client seed"
                rightElement={
                  <button
                    onClick={() => setCalcClientSeed(generateClientSeed())}
                    className="h-full px-3 text-text-tertiary hover:text-text-primary"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                }
              />
              <Input
                label="Nonce"
                type="number"
                value={calcNonce}
                onChange={(e) => setCalcNonce(e.target.value)}
              />

              <div className="flex gap-2">
                <Button onClick={handleCalculate} className="flex-1">
                  Calculate
                </Button>
                <Button variant="outline" onClick={handleHashServerSeed}>
                  Hash Seed
                </Button>
              </div>

              {calcResult && (
                <div className="p-3 rounded-lg bg-bg-tertiary font-mono text-xs text-text-secondary whitespace-pre-wrap">
                  {calcResult}
                </div>
              )}
            </div>
          </Card>

          {/* Current Seeds */}
          <Card>
            <h2 className="font-heading text-lg font-semibold text-text-primary mb-4">
              Your Active Seeds
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block">
                  Server Seed Hash
                </label>
                <div className="p-3 rounded-lg bg-bg-tertiary font-mono text-xs text-text-secondary break-all">
                  2f5d8e9a1c3b4f6a7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0
                </div>
                <p className="mt-1 text-xs text-text-tertiary">
                  This hash will be revealed after you rotate your seeds
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block">
                  Client Seed
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 rounded-lg bg-bg-tertiary font-mono text-xs text-text-secondary">
                    your_client_seed_here
                  </div>
                  <Button variant="outline" size="sm">
                    Change
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block">
                  Total Bets
                </label>
                <div className="p-3 rounded-lg bg-bg-tertiary font-mono text-sm text-text-primary">
                  1,234
                </div>
              </div>

              <Button fullWidth variant="outline" leftIcon={<RefreshCw className="w-4 h-4" />}>
                Rotate Seeds
              </Button>
              <p className="text-xs text-text-tertiary text-center">
                Rotating seeds will reveal the current server seed for verification
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
