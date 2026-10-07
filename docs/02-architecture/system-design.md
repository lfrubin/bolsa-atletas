# Arquitetura do Sistema: Bolsa de Atletas

## 1. Visão Geral da Arquitetura

O sistema adota o padrão de **Monólito Modular** (Modular Monolith) com arquitetura orientada a eventos internos (Event-Driven Architecture) para garantir consistência ACID nas operações financeiras e baixa latência no motor de matching.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENTES / INTERFACES                         │
│            Web App (React)  │  Mobile App  │  Admin Panel               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS / WebSockets
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             API GATEWAY / AUTH                          │
│                    JWT Auth │ Rate Limiter │ TLS                        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────┘
│                          CORE APPLICATION SERVER                        │
│                                                                         │
│  ┌────────────────────┐   ┌────────────────────┐   ┌─────────────────┐  │
│  │  Módulo Financeiro │   │ Módulo IPO/Emissão │   │ Módulo Governança│  │
│  │ (Wallets & Ledger) │   │ (Mercado Primário) │   │  (KYC & Audit)  │  │
│  └─────────┬──────────┘   └─────────┬──────────┘   └────────┬────────┘  │
│            │                        │                       │           │
│            └────────────────────────┼───────────────────────┘           │
│                                     ▼                                   │
│                       ┌───────────────────────────┐                     │
│                       │   MOTOR DE MATCHING (LOB) │                     │
│                       │ In-Memory Order Book / LMAX│                     │
│                       └─────────────┬─────────────┘                     │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
   ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
   │ PostgreSQL Primary │  │   Redis Cluster    │  │   PIX / BaaS API   │
   │ (ACID Transactions)│  │ (PubSub / WS Cache)│  │ (Gateway Externo)  │
   └────────────────────┘  └────────────────────┘  └────────────────────┘
```

---

## 2. Componentes Principais

### 2.1 Módulo Financeiro & Ledger (ACID)
* **Responsabilidade:** Gerenciamento imutável de carteiras, retenções e lançamentos contábeis de partida dobrada (Double-Entry Bookkeeping).
* **Garantia:** Todas as transações usam isolamento de transação do PostgreSQL (`SERIALIZABLE` ou `REPEATABLE READ` com bloqueios pessimistas `FOR UPDATE`) para evitar condições de corrida (*race conditions*) em saldos.

### 2.2 Motor de Matching (Limit Order Book - LOB)
* **Estrutura:** Livro de ofertas mantido em memória, segregado por `athlete_id`.
* **Fila de Execução:** Fila única serializada (*Single-threaded event loop*) por ativo para garantir ordenação rigorosa por prioridade de Preço e Tempo.
* **Regra de Execução:** All-or-None (Execução Total). O motor avalia se a melhor contraparte possui quantidade >= quantidade da ordem de entrada. Se sim, liquida; se não, a ordem entra no livro mantendo seu status aberto.

### 2.3 Módulo de WebSockets & Real-time Market Data
* **Engine:** Redis Pub/Sub integrado com gateway WebSocket.
* **Tópicos Pub/Sub:**
  * `ticker:{athlete_id}`: Atualizações de preço do último negócio e variação 24h.
  * `orderbook:{athlete_id}`: Alterações nas ofertas de compra e venda ativas.
  * `user:{user_id}`: Notificações privadas de execução de ordem ou alteração de saldo.

---

## 3. Fluxos Críticos do Sistema

### 3.1 Fluxo de Execução de Ordem de Compra (Pregão)

```text
[Investidor] ──(1) Envia Ordem (Ex: 100 ações a R$ 1,00)──> [API Gateway]
                                                               │
                                                              (2) Valida JWT e Saldo
                                                               ▼
[PostgreSQL] <──(3) Lock Saldo R$ 101,00 (RESERVADO) ────── [Ledger Service]
                                                               │
                                                              (4) Evento: OrderCreated
                                                               ▼
                                                        [Matching Engine]
                                                               │
                                                        (5) Checa Livro do Atleta
                                                               │
                        ┌──────────────────────────────────────┴──────────────────────────────────────┐
                        │                                                                             │
              [Contraparte Incompatível]                                                     [Match Integral Encontrado]
                        │                                                                             │
        (6a) Adiciona Ordem ao Livro                                                     (6b) Bloqueia Vendedor e Liquidar
                        │                                                                             │
        (7a) Responde HTTP 201 (OPEN)                                                    (7b) Atualiza Custódias e Saldos
                                                                                                      │
                                                                                        (8b) Notifica WebSockets (Executado)
```

### 3.2 Fluxo de Liquidação de IPO

```text
[Cron Worker] ──(1) Checa IPOs Vencidos──> [IPO Service]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
          [Total >= Soft Cap (SUCESSO)]                   [Total < Soft Cap (FRACASSO)]
                      │                                               │
(2a) Transfere 95% do valor ao Clube             (2b) Estorna 100% das reservas aos Investidores
(3a) Transfere 5% de taxa à Plataforma           (3c) Altera status do IPO para FAILED
(4a) Emite Custódia de ações aos Investidores    (4c) Notifica participantes via e-mail/push
(5a) Habilita Atleta para o Pregão
```