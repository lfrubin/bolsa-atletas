# Diretrizes do Backend para Agentes de IA

1. **Precisão Numérica:**
   - **NUNCA** utilize o tipo `float` ou `double` para valores monetários ou quantidade de ações.
   - Utilize sempre tipos de alta precisão (ex: `Big`, `Decimal` ou `NUMERIC(15,2)`).

2. **Consistência de Saldos:**
   - Toda alteração nos campos `available_balance` ou `reserved_balance` deve obrigatoriamente ocorrer dentro de uma transação SQL com bloqueio pessimista (`SELECT ... FOR UPDATE`).

3. **Erros e Exceções:**
   - Retorne respostas de erro sempre estruturadas no padrão JSON:
     ```json
     {
       "error": "CODIGO_DO_ERRO",
       "message": "Descrição amigável"
     }
     ```

4. **Testes Obrigatórios:**
   - Toda regra de negócio das entidades de carteira, IPO e motor de matching deve ter testes unitários e de integração correspondentes na pasta `/tests`.