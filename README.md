# Bolsa de Atletas

Plataforma de investimento esportivo que permite a torcedores e investidores negociarem participações nos direitos e performances de atletas por meio de mercado primário (**IPO**) e mercado secundário em tempo real (**Pregão**).

---

## 🚀 Tecnologias

- **Backend:** Node.js (TypeScript) / Go
- **Banco de Dados:** PostgreSQL 16+ (Transações ACID, `NUMERIC` para precisão financeira)
- **Cache & Pub/Sub:** Redis 7+
- **Frontend:** React / Next.js com Tailwind CSS
- **Metodologia:** Spec-Driven Development (SDD)

---

## 📁 Estrutura do Projeto

```text
bolsa-atletas/
├── .ai/                     # Diretrizes e regras para assistentes de IA
│   └── rules/
│       ├── backend-rules.md
│       ├── frontend-rules.md
│       └── testing-rules.md
├── docs/                    # Documentação formal (SDD)
│   ├── 01-prd/              # Requisitos do produto
│   ├── 02-architecture/     # System Design, Data Model (DDL) e API Spec
│   ├── 03-adrs/             # Decisões de arquitetura
│   └── 04-tasks/            # Planos de execução por fase
├── docker-compose.yml       # Infraestrutura local (PostgreSQL + Redis)
└── README.md
```

---

## 🛠️ Como Executar Localmente

### Pré-requisitos
- Docker e Docker Compose instalados
- Node.js (v20+) ou Go (v1.22+)

### 1. Subir Infraestrutura (PostgreSQL e Redis)
```bash
docker compose up -d
```

### 2. Desenvolvimento e Tarefas
Acompanhe os planos de execução sequenciais em `docs/04-tasks/` para implementar os módulos da aplicação.

---

## 📋 Regras Principais do Negócio

- **Mercado Primário (IPO):** Alocação FIFO, Soft Cap / Hard Cap, taxa de 5% cobrada do clube emissor em caso de sucesso.
- **Mercado Secundário (Pregão):** Livro de Ofertas Limitadas em memória, casamento Preço-Tempo, execução **All-or-None (AON)** e taxa de 1% por ponta.
- **Financeiro:** Depósitos PIX gratuitos, saques via PIX com taxa fixa de R$ 1,50.