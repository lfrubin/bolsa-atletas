# Plano de Execução: Fase 2 - Mercado Primário (IPO)

## Objetivo
Implementar o fluxo completo de criação de IPOs pelos clubes, reserva de ações por investidores no modelo FIFO Direct Drive e liquidação com base no Soft Cap e Hard Cap.

---

## Tarefas de Implementação

### 1. Gestão de Atletas e IPOs (Clube/Admin)
- [ ] Implementar cadastro de atletas vinculados ao clube emissor.
- [ ] Implementar criação e aprovação de novos IPOs (parâmetros: `hard_cap`, `soft_cap`, `share_price`, `start_date`, `end_date`).

### 2. Processo de Reserva (FIFO Direct Drive)
- [ ] Implementar endpoint `POST /api/v1/ipos/:id/reserve`.
- [ ] Validar saldo disponível e mover valor correspondente para `reserved_balance`.
- [ ] Garantir bloqueio atômico para impedir que o Hard Cap seja ultrapassado sob acessos concorrentes.

### 3. Worker de Encerramento e Liquidação de IPO
- [ ] Criar rotina agendada (Cron Job) para checar IPOs com prazo expirado ou Hard Cap atingido.
- [ ] **Cenário Sucesso (≥ Soft Cap):**
  - Reter 5% do montante total como taxa da plataforma.
  - Transferir 95% do saldo para a carteira do clube emissor.
  - Criar registros na tabela `custodies` emitindo as ações aos investidores.
  - Ativar o status de negociação do atleta (`is_trading_active = TRUE`).
- [ ] **Cenário Falha (< Soft Cap):**
  - Estornar 100% dos saldos mantidos em `reserved_balance` para `available_balance` dos investidores.
  - Marcar status do IPO como FRACASSO.