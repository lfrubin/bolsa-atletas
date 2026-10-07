# ADR 0002: Execução Total de Ordens (All-or-None) e Matching Preço-Tempo

## Status
Aceito

## Contexto
No Bloco 2 das especificações de negócio, determinamos que o sistema não permitirá execuções parciais de ordens no início da operação da plataforma. Uma ordem só deve ser liquidada se houver liquidez suficiente para cobrir 100% da quantidade de ações solicitada.

## Decisão
* O motor de matching funcionará no modelo **All-or-None (AON)**.
* A ordenação de ofertas no livro seguirá a regra **Preço-Tempo** (Preço mais vantajoso tem prioridade; em caso de empate, a ordem criada primeiro é priorizada).
* Se a melhor ordem de contraparte disponível no topo do livro não possuir a quantidade total necessária para suprir a nova ordem, o motor não executa parcialmente. A nova ordem permanece em estado `OPEN` no livro de ofertas.

## Consequências
* **Positivas:** Simplifica drasticamente a lógica de liquidação, cálculo de taxas de corretagem (1%) e conciliação de carteira no V1 do sistema.
* **Negativas/Riscos:** Pode reduzir a taxa de conversão/liquidez do pregão em ativos de menor volume, pois ordens grandes podem ficar presas aguardando uma contraparte de tamanho exato ou maior.