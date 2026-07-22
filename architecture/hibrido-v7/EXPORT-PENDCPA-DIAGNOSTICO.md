# EXPORT-PENDCPA-DIAGNOSTICO

Investigação PENDCPA — amostra divergente LOJA+SEQPRODUTO (oficial vs V7).

Gerado em: 2026-07-22 | Revalidado pós AJUSTE-02: 2026-07-22T15:37Z

## Caso exemplar (primeira divergência do compare)

| Campo | Oficial | V7 AJUSTE-02 |
|-------|---------|----------------|
| LOJA | 73 | 73 |
| SEQPRODUTO | 1252 | 1252 |
| PENDCPA | 144 | 146 |
| EMBCPA | 72 | 72 |
| DESCCOMPLETA | CD.GEL CLOSE UP 90G RED HOT | CD.GEL CLOSE UP 90G RED HOT |

**Delta PENDCPA:** +2 unidades no V7 (persiste idêntico ao IMPORTADO 2 e AJUSTE-01).

## Traçamento da cadeia de dados

```
TXT Grupo Ruptura (PENDCPA por CD)
  → Motor parse/transform
  → BRE classificarPrazo / pendência CPA (soma CDs)
  → consolidado.pendenciaCpaCd
  → mapearBaseRuptura → coluna PENDCPA
  → compare vs oficial
```

### Camada export

- O mapper export (`mapearBaseRuptura` / `mapearBaseRupturaHibrido`) repassa `pendenciaCpaCd` **sem transformação**.
- Não há bug de arredondamento ou cast na exportação.
- AJUSTE-02 confirma: divergência **não** é artefato de PRODUTO, schema ou universo.

### Camada Motor / consolidado

- `pendenciaCpaCd` origina-se de `classificarPrazo` → `pendencia.soma` sobre CDs dinâmicos.
- Divergência ±1..±2 sugere diferença de **soma de pendências CD** ou **timing de arquivos fonte** (oficial 2026-07-17 vs Motor 2026-07-13/22), não erro de coluna export.

## Amostra 50 chaves divergentes

Arquivo gerado pelo comparativo em camadas:

`architecture/hibrido-v7/pendcpa-amostra-50.json`

Execute:

```bash
node scripts/compare-ruptura-validacao-layered.cjs "C:/area-de-trabalho-v7/importar/RUPTURA/VALIDAÇÃO/IMPORTADO_2_AJUSTE-02.xlsx"
```

## Métricas PENDCPA (AJUSTE-02 × oficial, 129.828 chaves)

| Métrica | Valor |
|---------|-------|
| Células comparadas | 129.828 |
| Iguais | 53.422 (**41,15%**) |
| Divergentes | 76.406 (**58,85%**) |
| Classificação | **D** — consolidado/Motor, não exportador |

## Classificação: consolidado vs exportador

| Evidência | Conclusão |
|-----------|-----------|
| Mapper repassa valor sem alteração | **Exportador OK** |
| Delta ±1..±2 coerente com soma CD | **Consolidado** |
| Persiste após AJUSTE-01 e AJUSTE-02 | **Não é regressão de export** |
| EMBCPA 99,996% igual na mesma chave | Fonte TXT/CD distinta para pendência |

**Veredito:** divergência **consolidado** (Motor/BRE/fonte), **não exportador**.

## Decisão

| Ação | Status |
|------|--------|
| Alterar regra BRE pendência | **NÃO** — sem confirmação PQ/oficial |
| Corrigir mapper export | **N/A** — mapper já espelha consolidado |
| Documentar delta consolidado | **SIM** |
| Revalidar após AJUSTE-02 | **Concluído** — delta persiste |

## Hipóteses (ordenadas por probabilidade)

1. **Arquivos fonte distintos** — conferência gerada em 17/07, Motor V7 em 13/07.
2. **Universo CD** — normalização posição lógica alterou soma em casos limítrofes.
3. **Timing publicação** — oficial pode refletir reprocessamento PQ posterior.

## Próximo passo recomendado

Comparar `consolidado.pendenciaCpaCd` do Motor local vs oficial para as 50 chaves da amostra — se delta persistir, escalar para auditoria Motor 2E38; se zerar, confirmar divergência de data de corte dos arquivos fonte.
