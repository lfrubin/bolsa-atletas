# Especificação das APIs (REST e WebSockets)

## 1. Endpoints REST (OpenAPI 3.0 / JSON)

### Auth & KYC
* `POST /api/v1/auth/register` - Criação de conta (Investidor ou Clube)
* `POST /api/v1/auth/login` - Autenticação e emissão de JWT
* `GET /api/v1/users/me` - Consulta de dados do perfil e status de KYC

### Carteira Digital & PIX
* `GET /api/v1/wallets/balance` - Retorna saldos (`available`, `reserved`, `total_assets`)
* `POST /api/v1/wallets/deposit/pix` - Gera QR Code PIX para Cash-in (Taxa: R$ 0,00)
* `POST /api/v1/wallets/withdraw/pix` - Solicita saque via PIX (Taxa: R$ 1,50)
* `GET /api/v1/wallets/statement` - Extrato de transações e notas de corretagem

### Mercado Primário (IPO)
* `GET /api/v1/ipos` - Listagem de IPOs abertos e encerrados
* `GET /api/v1/ipos/:id` - Detalhes do IPO (Progresso, Hard/Soft Cap, Cronômetro)
* `POST /api/v1/ipos/:id/reserve` - Reserva ações no IPO via alocação FIFO
  * **Payload:**
    ```json
    {
      "shares_count": 500
    }
    ```

### Mercado Secundário (Pregão)
* `GET /api/v1/athletes` - Catálogo de atletas com cotação e variação 24h
* `GET /api/v1/athletes/:id` - Card completo do atleta (Dados esportivos + financeiros)
* `GET /api/v1/orders/book/:athleteId` - Livro de ofertas aberto (Depth de compra e venda)
* `POST /api/v1/orders` - Cadastra nova ordem no pregão
  * **Payload:**
    ```json
    {
      "athlete_id": "uuid-athlete-id",
      "side": "BUY",
      "type": "LIMIT",
      "price": 1.50,
      "shares_count": 100
    }
    ```
* `DELETE /api/v1/orders/:id` - Cancela ordem aberta no livro sem custo

---

## 2. Eventos WebSocket (Real-Time Engine)

* **URL de Conexão:** `wss://api.bolsaatletas.com.br/ws/v1?token={JWT_TOKEN}`

### Inscrição em Canais
```json
{
  "action": "subscribe",
  "channels": [
    "orderbook:uuid-athlete",
    "ticker:uuid-athlete"
  ]
}
```

### Evento: Atualização do Livro de Ofertas (`orderbook:update`)
```json
{
  "event": "orderbook:update",
  "athlete_id": "uuid-athlete-id",
  "bids": [
    {
      "price": 1.50,
      "shares_count": 1000
    }
  ],
  "asks": [
    {
      "price": 1.52,
      "shares_count": 500
    }
  ]
}
```

### Evento: Execução Privada de Ordem (`order:executed`)
```json
{
  "event": "order:executed",
  "order_id": "uuid-order-id",
  "athlete_id": "uuid-athlete-id",
  "side": "BUY",
  "filled_price": 1.50,
  "shares_count": 100,
  "total_fee": 1.50,
  "executed_at": "2026-10-05T16:00:00Z"
}
```