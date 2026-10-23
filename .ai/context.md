# Contexto Ativo do Projeto - Bolsa de Atletas

## 1. Status do Projeto
- **Fase Atual:** Fase 3 - Mercado Secundário e Pregão Real-Time [Em andamento - Orderbook e Matching Engine]
- **Fase Anterior:** Fase 2 - Mercado Primário (IPO) (**100% Concluída e Validada**)
- **Stack:** Node.js (ES Modules / JS), Express, Prisma ORM, PostgreSQL 16, Redis 7, Docker.

---

## 2. Histórico de Entregas e Validações

### Fase 1: Fundação e Financeiro (CONCLUÍDA)
- [x] Infraestrutura Docker (PostgreSQL + Redis) operacional.
- [x] Schemas Prisma (`User`, `Wallet`, `LedgerTransaction`) aplicados via migrações.
- [x] Módulo de validação algorítmica de CPF e CNPJ.
- [x] Autenticação com hash de senha (`bcryptjs`) e emissão de tokens JWT.
- [x] Módulo Financeiro: Depósito PIX e Saque PIX com taxa fixa de R$ 1,50 e verificação estrita de mesma titularidade.
- [x] Endpoint de consulta de extrato e saldos (`GET /api/v1/wallets/me`).

### Fase 2: Mercado Primário - IPO (CONCLUÍDA)
- [x] Schemas Prisma de Atletas (`Athlete`), Ofertas (`IpoOffer`) e Reservas (`IpoReservation`).
- [x] Endpoints de gestão de atletas e criação de ofertas públicas.
- [x] Endpoint de reserva de ações com trava pessimista (`FOR UPDATE`) e movimentação para `reservedBalance`.
- [x] Engine de liquidação de IPO (`POST /api/v1/ipo/offers/:id/settle`) com verificação de Soft Cap, cobrança de taxa de 5% da plataforma, repasse ao clube e estornos em caso de não atingimento da meta.

### Fase 3: Mercado Secundário - Trading (EM ANDAMENTO)
- [x] Modelagem de Custódia (`UserAsset`), Ordens (`Order`) e Negociações (`Trade`) migrada no PostgreSQL (`20261023125741_add_trading_and_assets`).
- [x] Integração da liquidação do IPO com a carteira de custódia (`UserAsset`).
- [x] Endpoint de consulta de custódia e posições (`GET /api/v1/assets/me`).
- [ ] Endpoints de emissão e cancelamento de ordens de Compra/Venda.
- [ ] Matching Engine em memória com execução integral e cobrança de 1% de taxa por ponta.