# Plano de Execução: Fase 1 - Fundação e Módulo Financeiro

## Objetivo
Implementar a estrutura base do projeto, autenticação, validação KYC, carteira digital e operações de depósito/saque via PIX com isolamento transacional.

---

## Tarefas de Implementação

### 1. Setup do Projeto e Banco de Dados
- [ ] Criar projeto com TypeScript e ORM (Prisma/TypeORM/Drizzle).
- [ ] Executar migrations do banco PostgreSQL conforme `docs/02-architecture/data-model.md`.
- [ ] Configurar container Docker do PostgreSQL e Redis.

### 2. Autenticação e KYC
- [ ] Implementar endpoint `POST /api/v1/auth/register` com validação de CPF/CNPJ.
- [ ] Implementar endpoint `POST /api/v1/auth/login` e emissão de token JWT.
- [ ] Criar middleware de autenticação e verificação de perfil (`INVESTOR`, `CLUB`, `ADMIN`).

### 3. Módulo Financeiro (Ledger e Saldos)
- [ ] Criar serviço de carteira com suporte a transações ACID (`available_balance` e `reserved_balance`).
- [ ] Implementar `POST /api/v1/wallets/deposit/pix` com simulação de webhook de recebimento PIX (Cash-in sem taxa).
- [ ] Implementar `POST /api/v1/wallets/withdraw/pix` aplicando a validação de mesma titularidade e cobrança da taxa fixa de saque (R$ 1,50).