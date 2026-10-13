# Contexto Ativo do Projeto - Bolsa de Atletas

## 1. Status do Projeto
- **Fase Atual:** Fase 2 - Mercado Primário (IPO) [Em andamento - Módulo de Reserva Concluído]
- **Fase Anterior:** Fase 1 - Fundação e Módulo Financeiro (**100% Concluída e Validada**)
- **Stack:** Node.js (ES Modules / JS), Express, Prisma ORM, PostgreSQL 16, Redis 7, Docker.

---

## 2. Histórico de Entregas e Validações

### Fase 1: Fundação e Financeiro (CONCLUÍDA)
- [x] Infraestrutura Docker (PostgreSQL + Redis) operacional.
- [x] Schemas Prisma (`User`, `Wallet`, `LedgerTransaction`) aplicados via migrações.
- [x] Módulo de validação algorítmica de CPF e CNPJ.
- [x] Autenticação com hash de senha (`bcryptjs`) e emissão de tokens JWT.
- [x] Módulo Financeiro: Depósito PIX e Saque PIX com taxa fixa de R$ 1,50 e verificação estrita de mesma titularidade.
- [x] Controle de concorrência financeira com bloqueio pessimista (`FOR UPDATE`) em SQL nativo no Prisma.
- [x] Suíte de testes unitários e de integração configurada e aprovada.

### Fase 2: Mercado Primário - IPO (EM ANDAMENTO)
- [x] Schemas Prisma de Atletas (`Athlete`), Ofertas (`IpoOffer`) e Reservas (`IpoReservation`) migrados para o banco.
- [x] Endpoints de gestão de atletas (`POST /api/v1/athletes`) e criação de ofertas públicas (`POST /api/v1/ipo/offers`).
- [x] Endpoint de reserva de ações (`POST /api/v1/ipo/reserve`) com trava pessimista em ofertas/carteiras e movimentação para `reservedBalance`.
- [ ] Worker/Service de liquidação do IPO (processamento ao fim da oferta, cobrança da taxa de 5% da plataforma no sucesso ou reembolso integral no fracasso do Soft Cap).