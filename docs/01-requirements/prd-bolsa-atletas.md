# Documento de Especificação Funcional (PRD): Bolsa de Atletas

## 1. Visão Geral do Produto
A Bolsa de Atletas viabiliza a captação de recursos para clubes e a negociação de ativos esportivos por investidores. O ecossistema é dividido em Mercado Primário (IPO) e Mercado Secundário (Pregão em tempo real).

---

## 2. Tabela de Taxas e Tarifas

| Operação | Alvo da Cobrança | Valor / Alíquota | Regra de Cobrança |
| :--- | :--- | :--- | :--- |
| **Emissão Inicial (IPO)** | Clube Emissor | 5,0% | Retido do montante total repassado ao clube na liquidação do IPO. |
| **Corretagem no Pregão** | Comprador e Vendedor | 1,0% por ponta | +1% debitado do comprador; -1% deduzido do crédito do vendedor. |
| **Depósito PIX** | Investidor | Gratuito | Custos absorvidos pela plataforma. |
| **Saque PIX** | Investidor | Taxa Fixa Repassada (R$ 1,50) | Cobrado por solicitação no ato do saque. |

---

## 3. Módulos Funcionais

### 3.1 Módulo de IPO (Mercado Primário)
- **Definição de Métricas:** Hard Cap (teto da oferta), Soft Cap (mínimo para validação) e Data/Hora limite de captação.
- **Alocação FIFO:** Processamento em tempo real por ordem de chegada.
- **Estados da Captação:**
  - `EM_CAPTACAO`: Reservas abertas; saldo do investidor em status `RESERVADO`.
  - `SUCESSO`: Arrecadação $\ge$ Soft Cap. Repasse de 95% do montante ao clube, emissão e custódia das ações aos investidores e habilitação do card no pregão.
  - `FRACASSO`: Arrecadação < Soft Cap no prazo. Estorno de 100% dos saldos e encerramento da oferta.

### 3.2 Módulo de Pregão e Motor de Matching (Mercado Secundário)
- **Ordens:** *A Limite* e *A Mercado*.
- **Sem Execução Parcial:** Liquidação obrigatoriamente integral do volume solicitado na ordem.
- **Prioridade de Execução:** Preço (Melhor compra/Melhor venda) seguido de Tempo (Registro mais antigo).
- **Bloqueio de Ativos/Saldo:**
  - Ordem de Compra: Retém `(Quantidade * Preço) * 1.01` no Saldo Reservado.
  - Ordem de Venda: Retém a quantidade de ações na Carteira Bloqueada.

### 3.3 Módulo de Precificação e Indicadores Esportivos
- Formação de preço puramente por oferta e demanda no pregão.
- Atualização contínua durante jogos ao vivo.
- Circuit breaker ativado manualmente por administradores para cenários excepcionais (lesões permanentes/disputas legais).

### 3.4 Módulo de Liquidação por Evento Corporativo
- Encerramento do contrato ou venda real do atleta injeta os fundos na plataforma e liquida o ativo distribuindo os valores proporcionalmente entre os detentores das ações.

### 3.5 Módulo Financeiro e Carteira Digital
- Gestão de saldos: `Disponível`, `Reservado` e `Valor em Ativos`.
- Validação estrita de CPF/CNPJ de mesma titularidade nas transações via PIX.
- Emissão de Nota de Corretagem por operação executada.

### 3.6 Módulo de Governança, KYC e Audit Log
- Validação automatizada de perfil (Investidores - KYC; Clubes - KYB).
- Log de auditoria imutável registrando IP, timestamp, ID do usuário e payload em todas as ações sensíveis.