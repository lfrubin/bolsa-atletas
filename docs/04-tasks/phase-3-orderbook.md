# Plano de Execução: Fase 3 - Mercado Secundário e Pregão Real-Time

## Objetivo
Construir o motor de matching em memória (Limit Order Book), suporte a execuções totais, cobrança de taxa de corretagem de 1% de cada ponta e sincronização em tempo real via WebSockets.

---

## Tarefas de Implementação

### 1. Estrutura do Livro de Ofertas em Memória
- [ ] Criar estrutura de dados no backend para manter ordens `BUY` e `SELL` organizadas por preço e tempo.
- [ ] Integrar persistência das ordens no banco PostgreSQL.

### 2. Motor de Matching (Sem Execução Parcial)
- [ ] Implementar algoritmo de casamento de ofertas com prioridade Preço-Tempo.
- [ ] Aplicar regra estrita: Casar apenas se `shares_count` do topo do livro cobrir 100% da ordem.
- [ ] **Liquidação do Trade:**
  - **Comprador:** Creditar ações na custódia e debitar valor + 1% de taxa.
  - **Vendedor:** Debitar ações da custódia e creditar valor - 1% de taxa.
  - **Plataforma:** Registrar o montante de 2% de corretagem acumulado na transação.
- [ ] Gerar registro imutável em `trades` e emitir Nota de Corretagem.

### 3. WebSockets e Circuit Breaker
- [ ] Configurar servidor WebSocket integrado ao Redis Pub/Sub.
- [ ] Transmitir atualizações de orderbook e ticker (preço do último negócio) em tempo real.
- [ ] Criar funcionalidade administrativa para congelamento manual de mercado (Circuit Breaker).