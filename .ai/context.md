# Contexto da Aplicação: Bolsa de Atletas

## 1. Resumo do Negócio
A Bolsa de Atletas é uma plataforma de crowdfunding e negociação secundária de ativos ligados a contratos esportivos.
- **Mercado Primário (IPO):** Clubes emitem ações de contratos de atletas para captar recursos (ex: R$ 100 mi divididos em 100 mi de ações a R$ 1,00). Taxa do clube: 5% sobre o total arrecadado no sucesso.
- **Mercado Secundário (Pregão):** Investidores negociam ações em tempo real. Taxa de negociação: 1% de cada ponta (comprador e vendedor).
- **Modelo de Cotação:** 100% definido por oferta e demanda no pregão.

## 2. Regras Críticas do Sistema
1. **Modelo de Alocação do IPO:** FIFO Direct Drive (ordem de chegada).
2. **Condição de Sucesso do IPO:** Arrecadação $\ge$ Soft Cap dentro do prazo. Em caso de falha, estorno de 100% sem taxas aos investidores.
3. **Motor de Matching:**
   - Prioridade **Preço-Tempo**.
   - **Sem Execução Parcial:** Apenas liquidação integral do lote da ordem.
   - Tipos de ordens: *A Limite* e *A Mercado*.
4. **Circuito Breaker:** Negociações permanecem ativas durante jogos; congelamento pontual/manual apenas em eventos críticos (lesões graves, impasses jurídicos).
5. **Aporte e Resgate (PIX):**
   - Validação rigorosa de mesma titularidade (CPF/CNPJ).
   - Depósito (Cash-in) gratuito; Saque (Cash-out) com taxa fixa de repasse ao investidor.

## 3. Direcionamento Técnico para a IA
- Todas as validações financeiras e retenções de saldo devem ser ACID (atômicas e isoladas).
- Priorize a integridade dos dados e trilhas de auditoria imutáveis.
- Siga rigorosamente a especificação antes de propor abstrações de código.