'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  RefreshCw,
  History,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  QrCode,
  AlertTriangle,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, NumberInput } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { cn, formatCurrency, CURRENCIES } from '@/lib/utils'
import { useAuth, useWallets } from '@/components/Providers'
import type { CurrencyType, TransactionStatus } from '@/lib/supabase/types'

type TabType = 'deposit' | 'withdraw'

interface Transaction {
  id: string
  type: 'deposit' | 'withdrawal'
  amount: number
  currency: CurrencyType
  status: TransactionStatus
  txHash?: string
  createdAt: Date
}

// Mock transactions
const mockTransactions: Transaction[] = [
  { id: '1', type: 'deposit', amount: 500, currency: 'USD', status: 'completed', createdAt: new Date(Date.now() - 3600000) },
  { id: '2', type: 'withdrawal', amount: 0.05, currency: 'BTC', status: 'pending', txHash: '0x123...abc', createdAt: new Date(Date.now() - 86400000) },
  { id: '3', type: 'deposit', amount: 1.5, currency: 'ETH', status: 'completed', txHash: '0x456...def', createdAt: new Date(Date.now() - 172800000) },
  { id: '4', type: 'withdrawal', amount: 200, currency: 'USD', status: 'failed', createdAt: new Date(Date.now() - 259200000) },
]

// Currency options for deposits/withdrawals
const supportedCurrencies: CurrencyType[] = ['BTC', 'ETH', 'USDT', 'USDC', 'USD']

export default function WalletPage() {
  const { user } = useAuth()
  const wallets = useWallets()

  // State
  const [activeTab, setActiveTab] = useState<TabType>('deposit')
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType>('BTC')
  const [amount, setAmount] = useState(0)
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)

  // Mock deposit address
  const depositAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'

  // Get selected wallet balance
  const selectedWallet = wallets.find(w => w.currency === selectedCurrency)
  const balance = selectedWallet?.balance ?? 0

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Handle deposit (generate address)
  const handleDeposit = () => {
    // In production, this would generate or fetch a deposit address
    setShowQrModal(true)
  }

  // Handle withdrawal
  const handleWithdraw = async () => {
    if (!withdrawAddress || amount <= 0 || amount > balance) return

    setIsLoading(true)
    // In production, this would create a withdrawal request
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsLoading(false)
    setAmount(0)
    setWithdrawAddress('')
  }

  // Calculate total balance in USD
  const totalBalanceUSD = wallets.reduce((total, wallet) => {
    // Mock conversion rates
    const rates: Record<CurrencyType, number> = {
      USD: 1,
      BTC: 45000,
      ETH: 2500,
      LTC: 100,
      DOGE: 0.1,
      USDT: 1,
      USDC: 1,
    }
    return total + wallet.balance * (rates[wallet.currency] || 1)
  }, 0)

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-yellow/20">
          <Wallet className="w-6 h-6 text-neon-yellow" />
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-text-primary">Wallet</h1>
          <p className="text-sm text-text-secondary">Manage your funds</p>
        </div>
      </div>

      {/* Total Balance */}
      <Card className="mb-6 bg-gradient-to-r from-neon-pink/10 via-neon-purple/10 to-neon-cyan/10 border-neon-pink/30">
        <div className="text-center py-4">
          <p className="text-text-secondary text-sm mb-1">Total Balance</p>
          <p className="font-display text-4xl lg:text-5xl text-text-primary">
            ${formatCurrency(totalBalanceUSD, 'USD')}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wallets List */}
        <div className="lg:col-span-1">
          <Card>
            <h3 className="font-heading font-semibold text-text-primary mb-4">Your Wallets</h3>
            <div className="space-y-3">
              {wallets.map((wallet) => {
                const currencyInfo = CURRENCIES[wallet.currency]
                return (
                  <button
                    key={wallet.currency}
                    onClick={() => setSelectedCurrency(wallet.currency)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                      selectedCurrency === wallet.currency
                        ? 'bg-neon-pink/10 border border-neon-pink/30'
                        : 'bg-bg-tertiary/50 hover:bg-bg-tertiary border border-transparent'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-lg',
                      `bg-${currencyInfo?.color || 'gray'}/20`
                    )}>
                      {currencyInfo?.icon || wallet.currency[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary">{wallet.currency}</p>
                      <p className="text-sm text-text-tertiary">{currencyInfo?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium text-text-primary">
                        {formatCurrency(wallet.balance, wallet.currency)}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Deposit/Withdraw Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('deposit')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors',
                  activeTab === 'deposit'
                    ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
                )}
              >
                <ArrowDownLeft className="w-5 h-5" />
                Deposit
              </button>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors',
                  activeTab === 'withdraw'
                    ? 'bg-neon-orange/20 text-neon-orange border border-neon-orange/30'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
                )}
              >
                <ArrowUpRight className="w-5 h-5" />
                Withdraw
              </button>
            </div>

            {/* Currency Selection */}
            <div className="mb-6">
              <label className="text-sm font-medium text-text-secondary mb-2 block">
                Select Currency
              </label>
              <div className="flex flex-wrap gap-2">
                {supportedCurrencies.map((currency) => (
                  <button
                    key={currency}
                    onClick={() => setSelectedCurrency(currency)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      selectedCurrency === currency
                        ? 'bg-neon-pink text-white'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
                    )}
                  >
                    {currency}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'deposit' ? (
                <motion.div
                  key="deposit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Deposit Address */}
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-2 block">
                      Your {selectedCurrency} Deposit Address
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 p-3 rounded-lg bg-bg-tertiary font-mono text-sm text-text-primary break-all">
                        {depositAddress}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(depositAddress)}
                        className="flex-shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowQrModal(true)}
                        className="flex-shrink-0"
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="p-4 rounded-lg bg-neon-yellow/10 border border-neon-yellow/30 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-neon-yellow flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-neon-yellow mb-1">Important</p>
                      <p className="text-text-secondary">
                        Only send {selectedCurrency} to this address. Sending any other currency may result in permanent loss.
                      </p>
                    </div>
                  </div>

                  {/* Min/Max Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-bg-tertiary/50">
                      <p className="text-xs text-text-tertiary">Minimum Deposit</p>
                      <p className="font-mono font-medium text-text-primary">
                        {selectedCurrency === 'BTC' ? '0.0001' : selectedCurrency === 'ETH' ? '0.01' : '10'} {selectedCurrency}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-tertiary/50">
                      <p className="text-xs text-text-tertiary">Confirmations</p>
                      <p className="font-mono font-medium text-text-primary">
                        {selectedCurrency === 'BTC' ? '3' : selectedCurrency === 'ETH' ? '12' : '1'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="withdraw"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Balance */}
                  <div className="p-4 rounded-lg bg-bg-tertiary/50 flex justify-between items-center">
                    <span className="text-text-secondary">Available Balance</span>
                    <span className="font-mono font-bold text-text-primary">
                      {formatCurrency(balance, selectedCurrency)} {selectedCurrency}
                    </span>
                  </div>

                  {/* Withdraw Address */}
                  <Input
                    label={`${selectedCurrency} Address`}
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder={`Enter your ${selectedCurrency} address`}
                  />

                  {/* Amount */}
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-2 block">
                      Amount
                    </label>
                    <div className="flex gap-2">
                      <NumberInput
                        value={amount}
                        onChange={setAmount}
                        min={0}
                        max={balance}
                        precision={8}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => setAmount(balance * 0.5)}
                      >
                        50%
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setAmount(balance)}
                      >
                        Max
                      </Button>
                    </div>
                  </div>

                  {/* Fee Info */}
                  <div className="p-3 rounded-lg bg-bg-tertiary/50">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-tertiary">Network Fee</span>
                      <span className="text-text-secondary">~0.0001 {selectedCurrency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-tertiary">You will receive</span>
                      <span className="font-mono font-medium text-neon-green">
                        {formatCurrency(Math.max(0, amount - 0.0001), selectedCurrency)} {selectedCurrency}
                      </span>
                    </div>
                  </div>

                  {/* Withdraw Button */}
                  <Button
                    fullWidth
                    size="lg"
                    variant="primary"
                    onClick={handleWithdraw}
                    isLoading={isLoading}
                    disabled={!withdrawAddress || amount <= 0 || amount > balance}
                    leftIcon={<ArrowUpRight className="w-5 h-5" />}
                  >
                    Withdraw {formatCurrency(amount, selectedCurrency)} {selectedCurrency}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Transaction History */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-text-primary flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Transactions
              </h3>
              <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />}>
                Refresh
              </Button>
            </div>

            <div className="space-y-3">
              {mockTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      tx.type === 'deposit' ? 'bg-neon-green/20' : 'bg-neon-orange/20'
                    )}>
                      {tx.type === 'deposit' ? (
                        <ArrowDownLeft className="w-5 h-5 text-neon-green" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-neon-orange" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary capitalize">{tx.type}</p>
                      <p className="text-xs text-text-tertiary">
                        {tx.createdAt.toLocaleDateString()} {tx.createdAt.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={cn(
                      'font-mono font-medium',
                      tx.type === 'deposit' ? 'text-neon-green' : 'text-neon-orange'
                    )}>
                      {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)} {tx.currency}
                    </p>
                    <div className="flex items-center gap-1 justify-end">
                      {tx.status === 'completed' ? (
                        <Badge variant="success" size="sm">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      ) : tx.status === 'pending' ? (
                        <Badge variant="warning" size="sm">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="error" size="sm">
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                      {tx.txHash && (
                        <a
                          href={`https://etherscan.io/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neon-cyan hover:text-neon-cyan/80"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* QR Code Modal */}
      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title={`Deposit ${selectedCurrency}`}
        size="sm"
      >
        <div className="text-center">
          {/* Mock QR Code */}
          <div className="w-48 h-48 mx-auto bg-white p-4 rounded-lg mb-4">
            <div className="w-full h-full bg-[url('data:image/svg+xml,...')] bg-contain" />
            <div className="grid grid-cols-8 gap-0.5">
              {Array.from({ length: 64 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'aspect-square',
                    Math.random() > 0.5 ? 'bg-black' : 'bg-white'
                  )}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-text-secondary mb-2">
            Scan this QR code to deposit {selectedCurrency}
          </p>
          <div className="p-2 rounded bg-bg-tertiary font-mono text-xs text-text-tertiary break-all">
            {depositAddress}
          </div>
          <Button
            className="mt-4"
            onClick={() => copyToClipboard(depositAddress)}
            leftIcon={<Copy className="w-4 h-4" />}
          >
            Copy Address
          </Button>
        </div>
      </Modal>
    </div>
  )
}
