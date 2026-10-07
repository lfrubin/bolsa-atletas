# Diretrizes de Testes para Agentes de IA

1. **Cobertura de Regras Financeiras:**
   - Todos os cálculos de saldo, retenção, liquidação de IPO e taxas (ex: 1% de corretagem no pregão, R$ 1,50 em saques PIX) **devem** ter testes unitários cobrindo cenários com valores exatos e casos de borda (ex: saldos insuficientes, arredondamentos).

2. **Testes de Concorrência e Isolamento:**
   - Operações em carteiras (`available_balance` e `reserved_balance`) devem incluir testes de integração que simulem requisições simultâneas para validar o funcionamento do bloqueio pessimista (`SELECT ... FOR UPDATE`).

3. **Validação do Motor de Matching (AON):**
   - Testar exaustivamente a regra *All-or-None* (AON): garantir que ordens sem liquidez integral na melhor oferta do topo do livro **não** sejam executadas parcialmente e permaneçam com status `OPEN`.

4. **Mocks e Testes de Integração:**
   - Utilizar mocks para gateways externos (ex: APIs de BaaS/PIX e Webhooks).
   - Testes de integração de banco de dados devem rodar contra uma instância PostgreSQL/Redis isolada (container ou banco de teste), limpando a massa de dados após cada suíte.