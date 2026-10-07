# Diretrizes do Frontend para Agentes de IA

1. **Feedback de Estado:**
   - Toda ação financeira (compra de ações, depósito, reserva) deve exibir explicitamente estados de *Carregando*, *Sucesso* e *Erro*.

2. **Atualização do Pregão:**
   - Dados do livro de ofertas e cotações devem ser consumidos via WebSocket, mantendo o estado local atualizado em tempo real sem recarregar a página.

3. **Formatadores de Moeda:**
   - Formatar valores em Reais (R$) utilizando a API nativa:
     ```javascript
     Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
     ```

4. **Segurança no Cliente:**
   - **Nunca** armazenar senhas ou dados sensíveis de pagamento no `localStorage`.
   - Armazenar apenas tokens de autenticação de vida curta (JWT).