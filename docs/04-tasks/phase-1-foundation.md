# Plano de Execução: Fase 1 - Fundação e Módulo Financeiro

## Objetivo
Estruturar a base do projeto backend em Node.js (ES Modules), PostgreSQL e Redis via Docker, além de implementar a camada de segurança e o módulo financeiro (Ledger, Carteiras com Lock Pessimista, depósitos e saques PIX com taxa e validação de mesma titularidade).

---

## Tarefas de Implementação

### 1. Infraestrutura e Setup Inicial
- [x] Configuração da estrutura modular de pastas (`src/backend/` e `src/frontend/`).
- [x] Orquestração do ambiente local com `docker-compose.yml` (PostgreSQL 16 e Redis 7).
- [x] Configuração do Prisma ORM com suporte a transações e tipos decimais para precisão financeira.

### 2. Autenticação e Segurança
- [x] Modelagem de usuários (`User`) com papéis (`INVESTOR`, `CLUB`, `ADMIN`).
- [x] Módulo de validação de algoritmos de CPF e CNPJ (`document-validator.js`).
- [x] Rotas de cadastro (`/api/v1/auth/register`) com criação automática de carteira e hash de senha via `bcryptjs`.
- [x] Rotas de autenticação (`/api/v1/auth/login`) com emissão de JWT.
- [x] Middleware de autenticação (`auth.middleware.js`) para proteção de rotas e validação de permissões por perfil.

### 3. Carteira Financeira e Ledger Imutável
- [x] Modelagem de `Wallet` e `LedgerTransaction` para controle de saldo disponível e reservado.
- [x] Endpoint de simulação de depósito PIX (`/api/v1/wallets/deposit/pix`) creditando saldo e gerando histórico de transação.
- [x] Endpoint de saque PIX (`/api/v1/wallets/withdraw/pix`) com validação estrita de mesma titularidade (CPF/CNPJ).
- [x] Cobrança automatizada de taxa fixa de R$ 1,50 no saque PIX debitada no extrato.
- [x] Aplicação de bloqueio pessimista (`FOR UPDATE`) no banco de dados para prevenção de *race conditions* em saques simultâneos.