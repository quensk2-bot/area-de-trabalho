# EXPORT-HOMOLOGACAO-FINAL

Encerramento homologado da exportação BASE Ruptura V7 × referência oficial PQ (COMPER MT).

Gerado em: 2026-07-22 | Status: **APP APROVADO COM RESSALVAS**

## Decisão

| Item | Resultado |
|------|-----------|
| Schema (62 colunas, ordem) | Aprovado |
| Modo `OFICIAL_COMPATIVEL` | Aprovado (~129.828 linhas) |
| Modo `V7_INTEGRAL` | Aprovado (~176k linhas) |
| Colunas mapeáveis (38, excl. PQ) | **81,9%** igualdade célula a célula |
| Colunas PQ (22) | Ausentes por design — null/empty |
| PENDCPA | Condicional à mesma data de referência |
| BANDEIRA | Adapter só em `OFICIAL_COMPATIVEL` |

## Modos de exportação

| Modo interno | Rótulo arquivo / RESUMO / UI | Universo | BANDEIRA na BASE |
|--------------|------------------------------|----------|------------------|
| `integral` | `V7_INTEGRAL` | Completo V7 (~176k) | `COMPER` / `FORT` |
| `oficial_compativel` | `OFICIAL_COMPATIVEL` | Interseção chaves PQ (~129.828) | `Comper MT` (MT/COMPER) |

Valores internos (`COMPER`, `FORT`) permanecem inalterados em catálogo, filtros, manifest e storage.

Implementação: `formatBandeiraExportCompativel(regional, bandeira)` aplicado apenas quando `modoUniverso === "oficial_compativel"`.

## Métricas homologação (AJUSTE-02 × oficial)

| Camada | Métrica | Valor |
|--------|---------|-------|
| Schema | 62 cols, ordem idêntica | Sim |
| Universo | Em ambos / só oficial / só V7 | 129.828 / 1 / **0** |
| Mapeáveis (38 cols) | Iguais / total | 4.038.640 / 4.933.464 (**81,86%**) |
| PRODUTO | `descricao - seqproduto` | **100%** na interseção |
| BANDEIRA | Após adapter compatível | Alinhado a `Comper MT` |

Referência completa de hashes e artefatos: [EXPORT-CONFERENCIA-REFERENCIA.md](./EXPORT-CONFERENCIA-REFERENCIA.md).

## PENDCPA — ressalva documentada

Divergência **não é bug do exportador**. O mapper repassa `pendenciaCpaCd` sem transformação.

| Aspecto | Detalhe |
|---------|---------|
| Causa provável | Diferença de snapshot: oficial **2026-07-17** vs V7 **2026-07-13** |
| Camada | Motor / consolidado / soma pendências CD |
| Ação export | Nenhuma — passthrough |
| Ação Motor/BRE | **Nenhuma** neste encerramento |

Detalhamento: [EXPORT-PENDCPA-DIAGNOSTICO.md](./EXPORT-PENDCPA-DIAGNOSTICO.md).

## 22 colunas PQ ausentes por design

Listadas em `CAMPOS_AUSENTES_V7` e aba `CAMPOS_AUSENTES` do XLSX. Export mantém **null** (sem zero fill).

Exemplos: `% Rup Inventário`, `% Curto Prazo`, `Sku´s Médio Prazo`, `Avaliar Pedido`, `Estrura Real`, etc.

Matriz completa: [EXPORT-COLUNAS-MATRIZ.md](./EXPORT-COLUNAS-MATRIZ.md).

## Artefatos de teste (fora do git)

| Artefato | Local | Git |
|----------|-------|-----|
| XLSX/CSV VALIDAÇÃO | `importar/RUPTURA/VALIDAÇÃO/` | **Não commitar** |
| AJUSTE-02 homologado | `IMPORTADO_2_AJUSTE-02.xlsx` | Fora do git |
| Chaves oficiais | `chaves-oficiais-conferencia.json` | Sim |

Regenerar export de teste:

```bash
node --import tsx scripts/gerar-ruptura-ajuste-export.mjs AJUSTE-03
```

Saída esperada:

- `IMPORTADO_2_AJUSTE-03.xlsx` — `OFICIAL_COMPATIVEL`
- `IMPORTADO_2_AJUSTE-03_V7_INTEGRAL.xlsx` — `V7_INTEGRAL`

## Testes automatizados

Cobertura em `src/ruptura-v7/tests/rupturaExportBase.test.ts`:

- Ordem exata 62 colunas (`CABECALHOS_OFICIAL_CONFERENCIA`)
- PRODUTO `descricao - seqproduto`
- BANDEIRA: `COMPER` vs `Comper MT`
- PENDCPA passthrough
- Colunas PQ null
- Filtro universo oficial vs integral

## Scripts de validação manual

```bash
node scripts/compare-ruptura-validacao-layered.cjs "C:/area-de-trabalho-v7/importar/RUPTURA/VALIDAÇÃO/IMPORTADO_2_AJUSTE-02.xlsx"
node scripts/homologacao-ruptura-analise.cjs
```
