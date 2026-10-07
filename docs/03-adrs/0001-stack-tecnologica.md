# ADR 0001: Escolha da Stack Tecnológica

## Status
Aceito

## Contexto
A plataforma Bolsa de Atletas exige alta consistência financeira (transações ACID para saldos e custódia) combinada com baixa latência para o mercado secundário (pregão em tempo real via WebSockets). Precisamos de uma stack madura, com suporte nativo a tipos numéricos de alta precisão e ecossistema robusto para integração com APIs financeiras (BaaS).

## Decisão
Adotaremos a seguinte combinação tecnológica:

* **Backend Framework:** Node.js (TypeScript) ou Go para os serviços da API e motor em memória, devido à alta performance em I/O assíncrono e tipagem estática rigorosa.
* **Banco de Dados Principal:** PostgreSQL 16+. Justificativa: Suporte nativo a transações relacionais ACID, suporte ao tipo `NUMERIC` para evitar erros de ponto flutuante financeiro, e suporte a travamentos pessimistas (`SELECT ... FOR UPDATE`).
* **Cache & Pub/Sub:** Redis Cluster. Justificativa: Gerenciamento do estado volátil do livro de ofertas em memória e distribuição de eventos em tempo real via WebSockets.
* **Frontend:** React / Next.js com Tailwind CSS para criar dashboards de negociação responsivos e dinâmicos.

## Consequências
* **Positivas:** Segurança absoluta em operações financeiras e alta velocidade de resposta nos gráficos e livro de ofertas do pregão.
* **Negativas/Riscos:** A manipulação de saldos concorrentes exige atenção rigorosa nos níveis de isolamento do PostgreSQL para evitar deadlocks sob alta carga.