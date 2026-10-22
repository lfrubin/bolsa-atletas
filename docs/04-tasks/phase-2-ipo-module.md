# Plano de Execução: Fase 2 - Mercado Primário (IPO)

## Objetivo
Implementar o cadastro e gestão de atletas por clubes, o lançamento de ofertas públicas primárias (IPO) com regras de Soft/Hard Cap, o fluxo de reserva de ações com retenção de saldo em garantia e a rotina de liquidação/cancelamento de captações.

---

## Tarefas de Implementação

### 1. Estrutura de Dados e Endpoints de Gestão
- [x] Atualização dos modelos `Athlete`, `IpoOffer` e `IpoReservation` no Prisma Schema.
- [x] Execução da migration `add_ipo_and_athletes` no PostgreSQL.
- [x] Endpoint de cadastro de atletas (`POST /api/v1/athletes`) para perfis `CLUB` e `ADMIN`.
- [x] Endpoint de criação de oferta de IPO (`POST /api/v1/ipo/offers`) com validações de Soft Cap, Hard Cap e datas de captação.

### 2. Fluxo de Reserva de Ações (Investidor)
- [x] Endpoint de reserva de ações (`POST /api/v1/ipo/reserve`).
- [x] Trava com bloqueio pessimista (`FOR UPDATE`) no IPO para impedir overbooking de ações.
- [x] Transferência atômica de valor do `availableBalance` para `reservedBalance` na carteira do investidor.
- [x] Emissão de registro no `LedgerTransaction` com o identificador da reserva.

### 3. Engine de Liquidação e Reembolso do IPO
- [x] Serviço/Endpoint de encerramento e liquidação de ofertas (`POST /api/v1/ipo/offers/:id/settle`).
- [x] **Cenário de Sucesso (Soft Cap Atingido):**
  - Debitar `reservedBalance` de todos os investidores participantes.
  - Creditar valor total arrecadado na carteira do Clube emissor com desconto da taxa de 5% da plataforma.
  - Atualizar status da oferta para `SUCCESSFUL` e das reservas para `CONFIRMED`.
- [x] **Cenário de Falha (Soft Cap Não Atingido):**
  - Devolver integralmente o `reservedBalance` para o `availableBalance` de todos os investidores participantes.
  - Atualizar status da oferta para `FAILED` e das reservas para `REFUNDED`.