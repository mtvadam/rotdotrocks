/**
 * Database Types for Supabase
 * Auto-generated types should replace these in production
 */

// Enum types
export type UserRole = 'user' | 'vip' | 'moderator' | 'admin'
export type UserStatus = 'active' | 'suspended' | 'banned'
export type TransactionType = 'deposit' | 'withdrawal' | 'bet' | 'win' | 'bonus' | 'rakeback' | 'tip' | 'refund'
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'
export type GameType = 'dice' | 'crash' | 'mines' | 'limbo' | 'plinko'
export type BetStatus = 'pending' | 'active' | 'won' | 'lost' | 'refunded' | 'cashout'
export type CurrencyType = 'USD' | 'BTC' | 'ETH' | 'LTC' | 'DOGE' | 'USDT' | 'USDC'
export type VipTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
export type ChatRoomType = 'global' | 'game' | 'vip' | 'private'

// Table types
export interface User {
  id: string
  email: string | null
  username: string
  password_hash: string | null
  avatar_url: string | null

  // Auth
  email_verified: boolean
  two_factor_enabled: boolean
  two_factor_secret: string | null

  // Status
  role: UserRole
  status: UserStatus

  // VIP
  vip_tier: VipTier
  vip_points: number
  total_wagered: number
  total_deposited: number

  // Preferences
  preferred_currency: CurrencyType
  hide_stats: boolean

  // Metadata
  referral_code: string | null
  referred_by: string | null
  last_login_at: string | null
  last_ip: string | null
  created_at: string
  updated_at: string
}

export interface Wallet {
  id: string
  user_id: string
  currency: CurrencyType
  balance: number
  locked_balance: number
  deposit_address: string | null
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  wallet_id: string
  type: TransactionType
  status: TransactionStatus
  amount: number
  fee: number
  currency: CurrencyType
  tx_hash: string | null
  from_address: string | null
  to_address: string | null
  confirmations: number
  bet_id: string | null
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  completed_at: string | null
}

export interface SeedPair {
  id: string
  user_id: string
  server_seed: string
  server_seed_hash: string
  client_seed: string
  nonce: number
  is_active: boolean
  revealed_at: string | null
  created_at: string
}

export interface Bet {
  id: string
  user_id: string
  seed_pair_id: string | null
  game: GameType
  status: BetStatus
  bet_amount: number
  currency: CurrencyType
  multiplier: number | null
  payout: number | null
  profit: number | null
  server_seed: string | null
  client_seed: string | null
  nonce: number | null
  result_hash: string | null
  game_data: Record<string, unknown>
  result_data: Record<string, unknown>
  created_at: string
  settled_at: string | null
}

export interface CrashRound {
  id: string
  round_number: number
  server_seed: string
  public_seed: string
  crash_point: number
  hash: string
  total_bets: number
  total_wagered: number
  total_payout: number
  started_at: string | null
  crashed_at: string | null
  created_at: string
}

export interface CrashBet {
  id: string
  user_id: string
  round_id: string
  bet_id: string | null
  bet_amount: number
  currency: CurrencyType
  auto_cashout: number | null
  cashout_multiplier: number | null
  cashed_out: boolean
  cashed_out_at: string | null
  created_at: string
}

export interface ChatRoom {
  id: string
  name: string
  type: ChatRoomType
  game: GameType | null
  is_active: boolean
  created_at: string
}

export interface ChatMessage {
  id: string
  room_id: string
  user_id: string
  content: string
  is_deleted: boolean
  deleted_by: string | null
  tip_amount: number | null
  tip_currency: CurrencyType | null
  tip_recipient_id: string | null
  created_at: string
}

export interface VipLevel {
  tier: VipTier
  name: string
  points_required: number
  rakeback_percentage: number
  level_up_bonus: number
  weekly_bonus_percentage: number
  monthly_bonus_percentage: number
  priority_support: boolean
  exclusive_promotions: boolean
  created_at: string
}

export interface RakebackClaim {
  id: string
  user_id: string
  amount: number
  currency: CurrencyType
  period_start: string
  period_end: string
  claimed_at: string
}

export interface Promotion {
  id: string
  code: string
  name: string
  description: string | null
  type: string
  value: number
  max_value: number | null
  min_deposit: number | null
  wagering_requirement: number
  start_date: string
  end_date: string | null
  max_uses: number | null
  uses_count: number
  max_uses_per_user: number
  vip_tier_required: VipTier | null
  is_active: boolean
  created_at: string
}

export interface UserPromotion {
  id: string
  user_id: string
  promotion_id: string
  bonus_amount: number | null
  wagered_amount: number
  is_completed: boolean
  claimed_at: string
  completed_at: string | null
  expires_at: string | null
}

export interface AdminAction {
  id: string
  admin_id: string
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export interface GameStatistics {
  id: string
  game: GameType
  date: string
  total_bets: number
  total_wagered: number
  total_payout: number
  house_profit: number
  unique_players: number
}

// Joined/Extended types
export interface UserWithWallets extends User {
  wallets: Wallet[]
}

export interface BetWithUser extends Bet {
  user: Pick<User, 'id' | 'username' | 'avatar_url' | 'vip_tier'>
}

export interface ChatMessageWithUser extends ChatMessage {
  user: Pick<User, 'id' | 'username' | 'avatar_url' | 'vip_tier' | 'role'>
}

export interface CrashBetWithUser extends CrashBet {
  user: Pick<User, 'id' | 'username' | 'avatar_url'>
}

// Game-specific data types
export interface DiceGameData {
  target: number
  is_over: boolean
}

export interface DiceResultData {
  roll: number
  win: boolean
}

export interface MinesGameData {
  mines_count: number
  grid_size: number
}

export interface MinesResultData {
  mine_positions: number[]
  revealed_tiles: number[]
  final_multiplier: number
}

export interface LimboGameData {
  target_multiplier: number
}

export interface LimboResultData {
  result: number
  win: boolean
}

export interface PlinkoGameData {
  risk: 'low' | 'medium' | 'high'
  rows: 8 | 10 | 12 | 14 | 16
}

export interface PlinkoResultData {
  path: number[]
  final_slot: number
  multiplier: number
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Partial<User> & Pick<User, 'username'>
        Update: Partial<User>
      }
      wallets: {
        Row: Wallet
        Insert: Partial<Wallet> & Pick<Wallet, 'user_id' | 'currency'>
        Update: Partial<Wallet>
      }
      transactions: {
        Row: Transaction
        Insert: Partial<Transaction> & Pick<Transaction, 'user_id' | 'wallet_id' | 'type' | 'amount' | 'currency'>
        Update: Partial<Transaction>
      }
      seed_pairs: {
        Row: SeedPair
        Insert: Partial<SeedPair> & Pick<SeedPair, 'user_id' | 'server_seed' | 'server_seed_hash' | 'client_seed'>
        Update: Partial<SeedPair>
      }
      bets: {
        Row: Bet
        Insert: Partial<Bet> & Pick<Bet, 'user_id' | 'game' | 'bet_amount' | 'currency'>
        Update: Partial<Bet>
      }
      crash_rounds: {
        Row: CrashRound
        Insert: Partial<CrashRound> & Pick<CrashRound, 'server_seed' | 'public_seed' | 'crash_point' | 'hash'>
        Update: Partial<CrashRound>
      }
      crash_bets: {
        Row: CrashBet
        Insert: Partial<CrashBet> & Pick<CrashBet, 'user_id' | 'round_id' | 'bet_amount' | 'currency'>
        Update: Partial<CrashBet>
      }
      chat_rooms: {
        Row: ChatRoom
        Insert: Partial<ChatRoom> & Pick<ChatRoom, 'name'>
        Update: Partial<ChatRoom>
      }
      chat_messages: {
        Row: ChatMessage
        Insert: Partial<ChatMessage> & Pick<ChatMessage, 'room_id' | 'user_id' | 'content'>
        Update: Partial<ChatMessage>
      }
      vip_levels: {
        Row: VipLevel
        Insert: VipLevel
        Update: Partial<VipLevel>
      }
      rakeback_claims: {
        Row: RakebackClaim
        Insert: Partial<RakebackClaim> & Pick<RakebackClaim, 'user_id' | 'amount' | 'currency' | 'period_start' | 'period_end'>
        Update: Partial<RakebackClaim>
      }
      promotions: {
        Row: Promotion
        Insert: Partial<Promotion> & Pick<Promotion, 'code' | 'name' | 'type' | 'value' | 'start_date'>
        Update: Partial<Promotion>
      }
      user_promotions: {
        Row: UserPromotion
        Insert: Partial<UserPromotion> & Pick<UserPromotion, 'user_id' | 'promotion_id'>
        Update: Partial<UserPromotion>
      }
      admin_actions: {
        Row: AdminAction
        Insert: Partial<AdminAction> & Pick<AdminAction, 'admin_id' | 'action'>
        Update: Partial<AdminAction>
      }
      game_statistics: {
        Row: GameStatistics
        Insert: Partial<GameStatistics> & Pick<GameStatistics, 'game' | 'date'>
        Update: Partial<GameStatistics>
      }
    }
    Enums: {
      user_role: UserRole
      user_status: UserStatus
      transaction_type: TransactionType
      transaction_status: TransactionStatus
      game_type: GameType
      bet_status: BetStatus
      currency_type: CurrencyType
      vip_tier: VipTier
      chat_room_type: ChatRoomType
    }
  }
}
