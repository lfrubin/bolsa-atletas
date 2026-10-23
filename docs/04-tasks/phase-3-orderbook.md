# Plano de Execução: Fase 3 - Mercado Secundário e Pregão Real-Time

## Objetivo
Construir a carteira de custódia de ativos (`UserAsset`), o motor de matching em memória (Limit Order Book) com execução integral, cobrança de taxa de corretagem de 1% de cada ponta (2% total) e sincronização em tempo real via WebSockets com mecanismo de Circuit Breaker.

---

## Tarefas de Implementação

### 1. Modelagem do Banco e Custódia de Ativos
- [x] Criar modelos no Prisma Schema: `UserAsset` (custódia de ações), `Order` (livro de ordens) e `Trade` (histórico de execuções).
- [x] Aplicar migração no PostgreSQL (`add_trading_and_assets`).
- [x] Creditar automaticamente as ações na custódia (`UserAsset`) dos investidores cujas reservas foram confirmadas no encerramento do IPO.
- [x] Endpoint de consulta de custódia e ativos do investidor (`GET /api/v1/assets/me`).

### 2. Estrutura do Livro de Ofertas e Motor de Matching
- [ ] Estrutura de dados no backend para manter ordens `BUY` e `SELL` organizadas por prioridade de Preço e Tempo.
- [ ] Endpoint de emissão de ordem de compra (`POST /api/v1/orders/buy`) com bloqueio prévio do saldo financeiro + 1% de taxa.
- [ ] Endpoint de emissão de ordem de venda (`POST /api/v1/orders/sell`) com bloqueio prévio das ações em custódia.
- [ ] Endpoint de cancelamento de ordem aberta (`POST /api/v1/orders/:id/cancel`) com liberação dos recursos retidos.
- [ ] **Regra de Casamento (Sem Execução Parcial):**
  - Casar apenas se a quantidade (`sharesCount`) do topo do livro cobrir 100% da ordem.
- [ ] **Liquidação do Trade:**
  - **Comprador:** Creditar ações na custódia e debitar valor + 1% de taxa da plataforma.
  - **Vendedor:** Debitar ações da custódia e creditar valor - 1% de taxa da plataforma.
  - **Plataforma:** Registrar no `LedgerTransaction` o montante de 2% de corretagem total recolhido.
- [ ] Gerar registro imutável na tabela `trades` e disponibilizar dados para Nota de Corretagem.

### 3. WebSockets e Circuit Breaker
- [ ] Servidor WebSocket integrado ao Redis Pub/Sub para emissão de eventos do livro e negócios.
- [ ] Transmitir atualizações do Order Book e Ticker (preço e volume do último negócio) em tempo real.
- [ ] Endpoint/Painel administrativo para congelamento e descongelamento manual de mercado (Circuit Breaker).