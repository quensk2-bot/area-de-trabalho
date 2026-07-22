# EXPORT-COLUNAS-MATRIZ

Gerado: 2026-07-22T15:37:08.573Z | Base: AJUSTE-02 × oficial (129.828 chaves)

## Legenda de ações

| Código | Significado |
|--------|-------------|
| A | Coluna PQ/fórmula — permanece em CAMPOS_AUSENTES (22 cols) |
| B | Mapeável via JSON/consolidado |
| C | Adapter de export (ex.: BANDEIRA → COMPER) |
| D | Investigar Motor/consolidado (PENDCPA) — não alterar BRE à cegas |
| E | Vazio em ambos — sem ação |

## Resumo preenchimento AJUSTE-02

| Categoria | Qtd cols | Observação |
|-----------|----------|------------|
| Preenchidas (>0%) | **40** | Inclui cols parcialmente preenchidas |
| Vazias intencionais (A) | **22** | Colunas PQ — aba CAMPOS_AUSENTES |
| Vazias não-PQ | **1** | CATEGORIA (fonte consolidado ausente) |
| 100% igual ao oficial | **22** | LOJA..SETOR2, ESTQ_CD*, flags prazo, PRODUTO, etc. |
| Divergência principal | PENDCPA, BANDEIRA, COMPRADOR, Status CD | Ver matriz |

## Matriz (AJUSTE-02 vs oficial)

| # | Coluna | Pos | Fill Oficial | Fill V7 | % Igual | Origem | Ação |
|---|--------|-----|--------------|---------|---------|--------|------|
| 1 | LOJA | 1 | 100,0% | 100,0% | 100,0% | gestao.loja | B |
| 2 | SEQPRODUTO | 2 | 100,0% | 100,0% | 100,0% | gestao.seqproduto | B |
| 3 | DESCCOMPLETA | 3 | 100,0% | 100,0% | 100,0% | gestao.descricao | B |
| 4 | CODFORN | 4 | 100,0% | 100,0% | 100,0% | gestao.codFornecedor | B |
| 5 | RAZAO | 5 | 100,0% | 100,0% | 100,0% | gestao.razaoFornecedor | B |
| 6 | ESTOQUE | 6 | 100,0% | 100,0% | 99,0% | gestao.estoqueLoja | B |
| 7 | PARMAX | 7 | 100,0% | 100,0% | 100,0% | gestao.parMax | B |
| 8 | PENDCPA | 8 | 100,0% | 100,0% | **41,1%** | consolidado.pendenciaCpaCd | D |
| 9 | EMBCPA | 9 | 100,0% | 100,0% | 100,0% | gestao.embalagemCompra | B |
| 10 | SETOR | 10 | 100,0% | 100,0% | 100,0% | gestao.divisao | B |
| 11 | SETOR2 | 11 | 100,0% | 100,0% | 100,0% | gestao.setorN2 | B |
| 12 | CATEGORIA | 12 | 100,0% | **0,0%** | 0,0% | gestao.categoriaN1 | B |
| 13 | ESTQ_CD1 | 13 | 100,0% | 100,0% | 100,0% | cds[pos=1] | B |
| 14 | ESTQ_CD2 | 14 | 100,0% | 100,0% | 100,0% | cds[pos=2] | B |
| 15 | ESTQ_CD3 | 15 | 100,0% | 100,0% | 100,0% | cds[pos=3] | B |
| 16 | ESTQ_CD4 | 16 | 100,0% | 100,0% | 100,0% | cds[pos=4] | B |
| 17 | Ruptura 104C | 17 | 100,0% | 100,0% | 100,0% | ruptura104c→texto | B |
| 18 | Inventário (Unid) | 18 | 100,0% | **5,7%** | 5,7% | gestao.inventarioUnid | B |
| 19 | Ruptura Inventário | 19 | 100,0% | 100,0% | 100,0% | gestao.rupturaComInventario | B |
| 20 | % Rup Inventário | 20 | variável | **0,0%** | 0,0% | PQ | A |
| 21 | % Ruptura Sem Inventário | 21 | variável | **0,0%** | 0,0% | PQ | A |
| 22 | Flag Ruptura 104c | 22 | 100,0% | 100,0% | 100,0% | gestao.geraRuptura | B |
| 23 | Menor que três Unidades | 23 | 100,0% | 100,0% | 100,0% | gestao.ruptura104c | B |
| 24 | % < 3 | 24 | variável | **0,0%** | 0,0% | PQ | A |
| 25 | ESTQ_CD5 | 25 | 100,0% | 100,0% | 100,0% | cds[pos=5] | B |
| 26 | Mod_CurtoPrazo | 26 | variável | 100,0% | 99,2% | consolidado | B |
| 27 | NCurtoPrazo | 27 | variável | 100,0% | 99,3% | consolidado | B |
| 28 | Curto Prazo | 28 | 100,0% | 100,0% | 100,0% | consolidado | B |
| 29 | Cross Docking | 29 | variável | 100,0% | 100,0% | consolidado | B |
| 30–39 | Sku´s / % prazo | 30–39 | variável | **0,0%** | 0,0% | PQ | A |
| 40 | PRODUTO | 40 | 100,0% | 100,0% | **100,0%** | formatTextoProduto | B |
| 41 | Dias Pedido | 41 | 100,0% | 100,0% | 100,0% | gestao.diasPedido | B |
| 42–47 | Avaliar/Pend/%/Último | 42–47 | variável | **0,0%** | 0–18% | PQ | A |
| 48 | Rede | 48 | 100,0% | 99,7% | 99,7% | gestao.rede | B |
| 49 | BANDEIRA | 49 | Comper MT | COMPER | **0,0%** | adapter export | C |
| 50 | Status Sol. Ativação CD | 50 | 100,0% | 100,0% | 7,9% | gestao | B |
| 51–54 | Sku´s / Dias / Ativação | 51–54 | variável | **0,0%** | 0–99,8% | PQ / gestao | A/B |
| 55 | Status Estoque CDs | 55 | 100,0% | 100,0% | 71,6% | gestao | B |
| 56 | Ação Curto Prazo | 56 | 100,0% | 100,0% | 100,0% | gestao | B |
| 57 | Ação Médio Prazo | 57 | 100,0% | 100,0% | 99,3% | gestao | B |
| 58 | Estrura Real | 58 | 0,0% | 0,0% | 100,0% | PQ | E |
| 59 | COMPRADOR | 59 | 100,0% | **25,0%** | 18,9% | gestao.comprador | B |
| 60–61 | Itens Vda / % Rup | 60–61 | 100,0% | **0,0%** | 0,0% | PQ | A |
| 62 | Dias Pedido (Análise Geral) | 62 | 99,6% | 100,0% | 69,9% | gestao.diasPedido | B |

## Delta IMPORTADO 2 → AJUSTE-02 (melhoria)

| Métrica | IMPORTADO 2 | AJUSTE-02 | Δ |
|---------|-------------|-----------|---|
| Ordem colunas oficial | Não | **Sim** | Corrigido |
| Chaves só-V7 | 46.855 | **0** | −46.855 |
| Células mapeáveis iguais | 2.842.914 | **4.038.640** | +1.195.726 (+42%) |
| % mapeável igual | ~57,6% | **81,86%** | +24 pp |
| PRODUTO preenchido | 0% | **100%** | +100 pp |
| PRODUTO correto | — | **100%** | AJUSTE-01 tinha CD NNN |

## Pós-ajuste código

- Ordem colunas = oficial (`CABECALHOS_OFICIAL_CONFERENCIA`)
- ESTQ_CD mapeado por `posicaoLogica`
- 22 colunas PQ permanecem null + aba CAMPOS_AUSENTES
- PRODUTO via `formatTextoProduto(descricao, seqproduto)` — corrigido em AJUSTE-02
- Universo `oficial_compativel` filtra às 129.841 chaves congeladas
