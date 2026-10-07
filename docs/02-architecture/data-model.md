# Modelo de Dados (Data Model & Schema)

## 1. Diagrama Entidade-Relacionamento (Conceitual)

```text
  ┌─────────────┐       1:N       ┌─────────────┐       1:1       ┌─────────────┐
  │    USERS    ├─────────────────┤   WALLETS   ├─────────────────┤  CUSTODIES  │
  └──────┬──────┘                 └─────────────┘                 └──────┬──────┘
         │                                                               │
         │ 1:N                                                           │ N:1
         ▼                                                               ▼
  ┌─────────────┐                 ┌─────────────┐                 ┌─────────────┐
  │   ORDERS    ├─────────────────┤   TRADES    ├─────────────────┤  ATHLETES   │
  └─────────────┘       1:N       └─────────────┘       N:1       └──────┬──────┘
                                                                         │ 1:1
                                                                         ▼
                                                                  ┌─────────────┐
                                                                  │    IPOS     │
                                                                  └─────────────┘
```

## 2. Esquema Relacional (DDL PostgreSQL)

```sql
-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enumerações do Sistema
CREATE TYPE user_role AS ENUM ('INVESTOR', 'CLUB', 'ADMIN');
CREATE TYPE user_status AS ENUM ('PENDING_KYC', 'ACTIVE', 'BLOCKED');
CREATE TYPE ipo_status AS ENUM ('DRAFT', 'EM_CAPTACAO', 'SUCESSO', 'FRACASSO');
CREATE TYPE order_type AS ENUM ('LIMIT', 'MARKET');
CREATE TYPE order_side AS ENUM ('BUY', 'SELL');
CREATE TYPE order_status AS ENUM ('OPEN', 'FILLED', 'CANCELLED');
CREATE TYPE pix_type AS ENUM ('CASH_IN', 'CASH_OUT');
CREATE TYPE pix_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- 1. Tabela de Usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL DEFAULT 'INVESTOR',
    status user_status NOT NULL DEFAULT 'PENDING_KYC',
    name VARCHAR(255) NOT NULL,
    document_number VARCHAR(18) UNIQUE NOT NULL, -- CPF ou CNPJ
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Carteiras Financeiras
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    available_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (available_balance >= 0),
    reserved_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (reserved_balance >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Atletas
CREATE TABLE athletes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    current_club VARCHAR(255) NOT NULL,
    position VARCHAR(100) NOT NULL,
    total_shares BIGINT NOT NULL CHECK (total_shares > 0),
    last_share_price NUMERIC(15, 2) NOT NULL CHECK (last_share_price > 0),
    is_trading_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de IPOs
CREATE TABLE ipos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID UNIQUE NOT NULL REFERENCES athletes(id),
    hard_cap NUMERIC(15, 2) NOT NULL,
    soft_cap NUMERIC(15, 2) NOT NULL,
    total_raised NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    share_price NUMERIC(15, 2) NOT NULL DEFAULT 1.00,
    status ipo_status NOT NULL DEFAULT 'DRAFT',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de Custódia de Ações por Usuário
CREATE TABLE custodies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    shares_available BIGINT NOT NULL DEFAULT 0 CHECK (shares_available >= 0),
    shares_reserved BIGINT NOT NULL DEFAULT 0 CHECK (shares_reserved >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_athlete_custody UNIQUE (user_id, athlete_id)
);

-- 6. Tabela de Ordens do Pregão
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    user_id UUID NOT NULL REFERENCES users(id),
    side order_side NOT NULL,
    type order_type NOT NULL,
    price NUMERIC(15, 2) NOT NULL CHECK (price > 0),
    shares_count BIGINT NOT NULL CHECK (shares_count > 0),
    status order_status NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabela de Trades Executados
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id),
    buy_order_id UUID NOT NULL REFERENCES orders(id),
    sell_order_id UUID NOT NULL REFERENCES orders(id),
    buyer_user_id UUID NOT NULL REFERENCES users(id),
    seller_user_id UUID NOT NULL REFERENCES users(id),
    price NUMERIC(15, 2) NOT NULL,
    shares_count BIGINT NOT NULL,
    buyer_fee NUMERIC(15, 2) NOT NULL,
    seller_fee NUMERIC(15, 2) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabela de Transações PIX
CREATE TABLE pix_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    type pix_type NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status pix_status NOT NULL DEFAULT 'PENDING',
    pix_key VARCHAR(255),
    external_e2e_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX idx_orders_matching ON orders(athlete_id, side, price, created_at) WHERE status = 'OPEN';
CREATE INDEX idx_trades_athlete ON trades(athlete_id, executed_at DESC);
CREATE INDEX idx_custodies_user ON custodies(user_id);
```