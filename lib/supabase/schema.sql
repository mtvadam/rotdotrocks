-- GTA.BET Casino Database Schema
-- Supabase PostgreSQL

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('user', 'vip', 'moderator', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned');
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'bet', 'win', 'bonus', 'rakeback', 'tip', 'refund');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE game_type AS ENUM ('dice', 'crash', 'mines', 'limbo', 'plinko');
CREATE TYPE bet_status AS ENUM ('pending', 'active', 'won', 'lost', 'refunded', 'cashout');
CREATE TYPE currency_type AS ENUM ('USD', 'BTC', 'ETH', 'LTC', 'DOGE', 'USDT', 'USDC');
CREATE TYPE vip_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond');
CREATE TYPE chat_room_type AS ENUM ('global', 'game', 'vip', 'private');

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    avatar_url TEXT,

    -- Auth
    email_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),

    -- Status
    role user_role DEFAULT 'user',
    status user_status DEFAULT 'active',

    -- VIP
    vip_tier vip_tier DEFAULT 'bronze',
    vip_points BIGINT DEFAULT 0,
    total_wagered DECIMAL(20, 8) DEFAULT 0,
    total_deposited DECIMAL(20, 8) DEFAULT 0,

    -- Preferences
    preferred_currency currency_type DEFAULT 'USD',
    hide_stats BOOLEAN DEFAULT FALSE,

    -- Metadata
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES users(id),
    last_login_at TIMESTAMPTZ,
    last_ip VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_vip_tier ON users(vip_tier);

-- ============================================
-- WALLETS TABLE
-- ============================================

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency currency_type NOT NULL,
    balance DECIMAL(20, 8) DEFAULT 0 CHECK (balance >= 0),
    locked_balance DECIMAL(20, 8) DEFAULT 0 CHECK (locked_balance >= 0),

    -- Crypto wallet info (for deposits/withdrawals)
    deposit_address VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, currency)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_currency ON wallets(currency);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,

    type transaction_type NOT NULL,
    status transaction_status DEFAULT 'pending',

    amount DECIMAL(20, 8) NOT NULL,
    fee DECIMAL(20, 8) DEFAULT 0,
    currency currency_type NOT NULL,

    -- For crypto transactions
    tx_hash VARCHAR(255),
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    confirmations INT DEFAULT 0,

    -- Reference to related bet (if applicable)
    bet_id UUID,

    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================
-- SEED PAIRS TABLE (Provably Fair)
-- ============================================

CREATE TABLE seed_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    server_seed VARCHAR(64) NOT NULL,
    server_seed_hash VARCHAR(64) NOT NULL,
    client_seed VARCHAR(64) NOT NULL,
    nonce BIGINT DEFAULT 0,

    is_active BOOLEAN DEFAULT TRUE,
    revealed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seed_pairs_user_id ON seed_pairs(user_id);
CREATE INDEX idx_seed_pairs_active ON seed_pairs(user_id, is_active) WHERE is_active = TRUE;

-- ============================================
-- BETS TABLE
-- ============================================

CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seed_pair_id UUID REFERENCES seed_pairs(id),

    game game_type NOT NULL,
    status bet_status DEFAULT 'pending',

    -- Amounts
    bet_amount DECIMAL(20, 8) NOT NULL CHECK (bet_amount > 0),
    currency currency_type NOT NULL,
    multiplier DECIMAL(20, 8),
    payout DECIMAL(20, 8),
    profit DECIMAL(20, 8),

    -- Provably fair
    server_seed VARCHAR(64),
    client_seed VARCHAR(64),
    nonce BIGINT,
    result_hash VARCHAR(64),

    -- Game-specific data
    game_data JSONB NOT NULL DEFAULT '{}',
    result_data JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);

CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_game ON bets(game);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_created_at ON bets(created_at DESC);
CREATE INDEX idx_bets_user_game ON bets(user_id, game);

-- ============================================
-- CRASH ROUNDS TABLE (for multiplayer crash game)
-- ============================================

CREATE TABLE crash_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_number SERIAL UNIQUE,

    -- Provably fair
    server_seed VARCHAR(64) NOT NULL,
    public_seed VARCHAR(64) NOT NULL,
    crash_point DECIMAL(20, 2) NOT NULL,
    hash VARCHAR(64) NOT NULL,

    -- Stats
    total_bets INT DEFAULT 0,
    total_wagered DECIMAL(20, 8) DEFAULT 0,
    total_payout DECIMAL(20, 8) DEFAULT 0,

    started_at TIMESTAMPTZ,
    crashed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crash_rounds_number ON crash_rounds(round_number DESC);
CREATE INDEX idx_crash_rounds_created_at ON crash_rounds(created_at DESC);

-- ============================================
-- CRASH BETS TABLE
-- ============================================

CREATE TABLE crash_bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    round_id UUID NOT NULL REFERENCES crash_rounds(id) ON DELETE CASCADE,
    bet_id UUID REFERENCES bets(id),

    bet_amount DECIMAL(20, 8) NOT NULL,
    currency currency_type NOT NULL,

    auto_cashout DECIMAL(20, 2),
    cashout_multiplier DECIMAL(20, 2),

    cashed_out BOOLEAN DEFAULT FALSE,
    cashed_out_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crash_bets_user_id ON crash_bets(user_id);
CREATE INDEX idx_crash_bets_round_id ON crash_bets(round_id);

-- ============================================
-- CHAT TABLES
-- ============================================

CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type chat_room_type DEFAULT 'global',
    game game_type,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    content TEXT NOT NULL CHECK (char_length(content) <= 500),

    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_by UUID REFERENCES users(id),

    -- For tips
    tip_amount DECIMAL(20, 8),
    tip_currency currency_type,
    tip_recipient_id UUID REFERENCES users(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ============================================
-- VIP/LOYALTY TABLES
-- ============================================

CREATE TABLE vip_levels (
    tier vip_tier PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    points_required BIGINT NOT NULL,
    rakeback_percentage DECIMAL(5, 2) NOT NULL,
    level_up_bonus DECIMAL(20, 8) DEFAULT 0,
    weekly_bonus_percentage DECIMAL(5, 2) DEFAULT 0,
    monthly_bonus_percentage DECIMAL(5, 2) DEFAULT 0,
    priority_support BOOLEAN DEFAULT FALSE,
    exclusive_promotions BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default VIP levels
INSERT INTO vip_levels (tier, name, points_required, rakeback_percentage, level_up_bonus, weekly_bonus_percentage, monthly_bonus_percentage, priority_support, exclusive_promotions) VALUES
    ('bronze', 'Bronze', 0, 0.10, 0, 0, 0, FALSE, FALSE),
    ('silver', 'Silver', 10000, 0.25, 50, 0.05, 0.10, FALSE, FALSE),
    ('gold', 'Gold', 50000, 0.50, 200, 0.10, 0.20, TRUE, FALSE),
    ('platinum', 'Platinum', 250000, 0.75, 1000, 0.15, 0.30, TRUE, TRUE),
    ('diamond', 'Diamond', 1000000, 1.00, 5000, 0.25, 0.50, TRUE, TRUE);

CREATE TABLE rakeback_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20, 8) NOT NULL,
    currency currency_type NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rakeback_claims_user_id ON rakeback_claims(user_id);

-- ============================================
-- PROMOTIONS/BONUSES
-- ============================================

CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    type VARCHAR(50) NOT NULL, -- 'deposit_match', 'free_spins', 'cashback', etc.
    value DECIMAL(20, 8) NOT NULL,
    max_value DECIMAL(20, 8),

    min_deposit DECIMAL(20, 8),
    wagering_requirement DECIMAL(5, 2) DEFAULT 1,

    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,

    max_uses INT,
    uses_count INT DEFAULT 0,
    max_uses_per_user INT DEFAULT 1,

    vip_tier_required vip_tier,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,

    bonus_amount DECIMAL(20, 8),
    wagered_amount DECIMAL(20, 8) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,

    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    UNIQUE(user_id, promotion_id)
);

-- ============================================
-- ADMIN/AUDIT TABLES
-- ============================================

CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- 'user', 'bet', 'transaction', etc.
    target_id UUID,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at DESC);

CREATE TABLE game_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game game_type NOT NULL,
    date DATE NOT NULL,

    total_bets INT DEFAULT 0,
    total_wagered DECIMAL(20, 8) DEFAULT 0,
    total_payout DECIMAL(20, 8) DEFAULT 0,
    house_profit DECIMAL(20, 8) DEFAULT 0,
    unique_players INT DEFAULT 0,

    UNIQUE(game, date)
);

CREATE INDEX idx_game_statistics_date ON game_statistics(date DESC);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seed_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE crash_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rakeback_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_promotions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = role); -- Prevent role escalation

CREATE POLICY "Public profiles visible"
    ON users FOR SELECT
    USING (hide_stats = FALSE);

-- Wallets policies
CREATE POLICY "Users can view own wallets"
    ON wallets FOR SELECT
    USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Seed pairs policies
CREATE POLICY "Users can view own seed pairs"
    ON seed_pairs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own client seed"
    ON seed_pairs FOR UPDATE
    USING (auth.uid() = user_id);

-- Bets policies
CREATE POLICY "Users can view own bets"
    ON bets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Public bets visible"
    ON bets FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = bets.user_id
        AND users.hide_stats = FALSE
    ));

-- Chat policies
CREATE POLICY "Users can view chat messages"
    ON chat_messages FOR SELECT
    USING (NOT is_deleted);

CREATE POLICY "Users can send chat messages"
    ON chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate VIP points from wager
CREATE OR REPLACE FUNCTION calculate_vip_points(wager_amount DECIMAL)
RETURNS BIGINT AS $$
BEGIN
    -- 1 point per $1 wagered
    RETURN FLOOR(wager_amount);
END;
$$ LANGUAGE plpgsql;

-- Update user VIP tier
CREATE OR REPLACE FUNCTION update_user_vip_tier()
RETURNS TRIGGER AS $$
DECLARE
    new_tier vip_tier;
BEGIN
    SELECT tier INTO new_tier
    FROM vip_levels
    WHERE points_required <= NEW.vip_points
    ORDER BY points_required DESC
    LIMIT 1;

    IF new_tier IS NOT NULL AND new_tier != NEW.vip_tier THEN
        NEW.vip_tier = new_tier;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_vip_tier_upgrade
    BEFORE UPDATE OF vip_points ON users
    FOR EACH ROW EXECUTE FUNCTION update_user_vip_tier();

-- Process bet completion
CREATE OR REPLACE FUNCTION process_bet_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('won', 'lost', 'cashout') AND OLD.status = 'active' THEN
        -- Update user stats
        UPDATE users
        SET
            total_wagered = total_wagered + NEW.bet_amount,
            vip_points = vip_points + calculate_vip_points(NEW.bet_amount)
        WHERE id = NEW.user_id;

        NEW.settled_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bet_completion_trigger
    BEFORE UPDATE OF status ON bets
    FOR EACH ROW EXECUTE FUNCTION process_bet_completion();

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE crash_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE crash_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE bets;
