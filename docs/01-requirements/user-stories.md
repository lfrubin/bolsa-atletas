# Histórias de Usuário e Critérios de Aceite

## Módulo 1: Autenticação e KYC

### US01 - Cadastro e Validação do Investidor (KYC)
- **Como** Investidor,
- **Quero** realizar meu cadastro e ter meu CPF validado,
- **Para que** eu possa depositar fundos e operar na plataforma de forma segura.
- **Critérios de Aceite:**
  1. O sistema deve validar o CPF junto aos órgãos competentes no cadastro.
  2. O usuário só pode depositar ou sacar se o status do KYC for `APROVADO`.
  3. O sistema deve bloquear contas duplicadas com o mesmo CPF.

---

## Módulo 2: Gestão Financeira e PIX

### US02 - Depósito via PIX (Cash-in)
- **Como** Investidor,
- **Quero** gerar um QR Code/Copia e Cola PIX,
- **Para que** eu possa transferir dinheiro para meu saldo disponível na plataforma.
- **Critérios de Aceite:**
  1. O sistema deve emitir PIX cobrando exatamente R$ 0,00 de taxa adicional.
  2. A conciliação deve verificar se o CPF pagador é exatamente igual ao CPF cadastrado.
  3. Se o CPF for divergente, a transação deve ser rejeitada/estornada automaticamente.

### US03 - Saque via PIX (Cash-out)
- **Como** Investidor,
- **Quero** solicitar o saque do meu saldo disponível para minha conta bancária,
- **Para que** eu possa resgatar meus rendimentos ou capital.
- **Critérios de Aceite:**
  1. O sistema deve descontar a taxa fixa de saque (ex: R$ 1,50) do valor total a ser transferido.
  2. O saque só pode ser direcionado para chaves PIX associadas ao mesmo CPF/CNPJ do titular.
  3. O saldo solicitado + taxa fixa deve ser movido para `RESERVADO` até a confirmação do envio.

---

## Módulo 3: IPO (Mercado Primário)

### US04 - Reserva de Ações no IPO (FIFO)
- **Como** Investidor,
- **Quero** comprar ações de um atleta na fase de captação inicial,
- **Para que** eu adquira o ativo antes da listagem no pregão secundário.
- **Critérios de Aceite:**
  1. A compra deve ser processada estritamente por ordem de chegada (FIFO).
  2. O valor da reserva deve ser debitado do *Saldo Disponível* e retido no *Saldo Reservado*.
  3. Se o total arrecadado atingir o Hard Cap, a captação deve ser encerrada imediatamente.

### US05 - Liquidação de IPO com Sucesso/Falha
- **Como** Sistema,
- **Quero** processar o encerramento do IPO no prazo limite,
- **Para que** os fundos sejam repassados ou estornados corretamente.
- **Critérios de Aceite:**
  1. Se total $\ge$ Soft Cap: Descontar 5% de taxa da plataforma, transferir o valor restante ao clube e disponibilizar as ações na carteira dos investidores.
  2. Se total < Soft Cap: Estornar 100% dos saldos mantidos em reserva para os investidores sem cobrança de taxas.

---

## Módulo 4: Pregão e Motor de Matching

### US06 - Envio de Ordem de Compra/Venda a Limite (Execução Total)
- **Como** Investidor,
- **Quero** cadastrar uma ordem de compra ou venda definindo preço e quantidade exatos,
- **Para que** a ordem seja executada apenas se houver contraparte integral.
- **Critérios de Aceite:**
  1. O sistema deve bloquear `(Quantidade * Preço) * 1.01` para ordens de compra e as ações correspondentes para vendas.
  2. O motor deve casar ordens somente quando a quantidade de contraparte atender 100% do lote da ordem.
  3. Não é permitida liquidação parcial.
  4. Cancelamentos de ordens não executadas devem liberar 100% dos saldos/ações bloqueados de forma gratuita e imediata.