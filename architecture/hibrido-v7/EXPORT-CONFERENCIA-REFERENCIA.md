# EXPORT-CONFERENCIA-REFERENCIA

Metadados congelados dos arquivos de validação Ruptura MT/COMPER — **não alterar os XLSX originais**.

Gerado em: 2026-07-22 | Homologação final: 2026-07-22T15:37Z

## Arquivo oficial (referência PQ)

| Campo | Valor |
|-------|-------|
| Caminho | `C:\area-de-trabalho-v7\importar\RUPTURA\VALIDAÇÃO\ARQUIVO CONFERENCIA RESULTADO.xlsx` |
| SHA-256 | `7e2ab3cd00e43269494d4d302b64297aa7d6f34e000759fb1afd16d382651abf` |
| Tamanho | 31.840.978 bytes |
| mtime | 2026-07-17T03:32:36.350Z |
| Abas | `Plan1` |
| Dimensões Plan1 | 129.884 × 62 (incl. cabeçalho) |
| Linhas de dados | 129.883 |
| Chaves únicas LOJA+SEQPRODUTO | 129.829 (54 duplicatas) |
| Colunas | 62 |

## Arquivo V7 exportado (baseline pré-ajuste)

| Campo | Valor |
|-------|-------|
| Caminho | `C:\area-de-trabalho-v7\importar\RUPTURA\VALIDAÇÃO\IMPORTADO 2.xlsx` |
| SHA-256 | `08a8ca932393b617e1dd0aa69c5eff76c7bf975993a1d1417fef521fe3b3e0c1` |
| Tamanho | 19.071.658 bytes |
| mtime | 2026-07-22T13:50:37.662Z |
| Abas | `BASE`, `RESUMO_PROCESSAMENTO`, `LOJAS_SELECIONADAS`, `CAMPOS_AUSENTES` |
| Dimensões BASE | 176.684 × 62 |
| Linhas de dados BASE | 176.683 |
| Chaves únicas LOJA+SEQPRODUTO | 176.683 |
| Colunas BASE | 62 |

## Arquivo V7 pós-ajuste AJUSTE-01 (intermediário — PRODUTO quebrado)

| Campo | Valor |
|-------|-------|
| Caminho | `C:\area-de-trabalho-v7\importar\RUPTURA\VALIDAÇÃO\IMPORTADO_2_AJUSTE-01.xlsx` |
| SHA-256 | `3b187c00942040ea49c276488e80b1e1993ed3f122c31eff6aedf5163940aa84` |
| Tamanho | 56.502.306 bytes |
| mtime | 2026-07-22T14:27:25.106Z |
| Aba | `BASE` |
| Dimensões BASE | 129.829 × 62 |
| Linhas de dados | 129.828 |
| Chaves únicas | 129.828 |
| Defeito | PRODUTO preenchido com `textoProdutoCentralizado` (`CD 753`) em vez de `descricao - seqproduto` |

## Arquivo V7 homologação AJUSTE-02 (oficial_compativel — decisão final)

| Campo | Valor |
|-------|-------|
| Caminho | `C:\area-de-trabalho-v7\importar\RUPTURA\VALIDAÇÃO\IMPORTADO_2_AJUSTE-02.xlsx` |
| SHA-256 | `d670324e3c2c74dba42ded41104492dd3525a1c330279a7070e833f9bb4d435e` |
| Tamanho | 57.714.772 bytes |
| mtime | 2026-07-22T15:26:44.262Z |
| Aba | `BASE` |
| Dimensões BASE | 129.829 × 62 |
| Linhas de dados | 129.828 |
| Chaves únicas LOJA+SEQPRODUTO | 129.828 |
| Modo | `oficial_compativel` (filtrado `chaves-oficiais-conferencia.json`) |
| Abas auxiliares | `RESUMO_PROCESSAMENTO`, `CAMPOS_AUSENTES` |

## Chaves oficiais congeladas (JSON)

| Campo | Valor |
|-------|-------|
| Arquivo | `architecture/hibrido-v7/chaves-oficiais-conferencia.json` |
| Total chaves | 129.841 |
| Uso | Modo export `oficial_compativel` |

## Ordem oficial das colunas (Plan1 linha 1)

1. LOJA → 62. Dias Pedido (Análise Geral)

**Nota crítica:** `ESTQ_CD5` está na **posição 25**, após `% < 3` e **não** junto de ESTQ_CD1..4.

## Resultado homologação AJUSTE-02 × oficial

| Camada | Métrica | Resultado | Decisão |
|--------|---------|-----------|---------|
| Schema | 62 cols, ordem idêntica | SIM | APP OK |
| Universo | Em ambos / só oficial / só V7 | 129.828 / 1 / 0 | APP RESSALVAS |
| Mapeáveis (38 cols, excl. PQ) | Células iguais | 4.038.640 / 4.933.464 (**81,86%**) | APP RESSALVAS |
| Completo (60 cols) | Células iguais | 4.192.199 / 7.789.680 (**53,82%**) | APP NOT OK |

## Divergências baseline (pré-ajuste) vs AJUSTE-02

| Métrica | Oficial | IMPORTADO 2 | AJUSTE-02 |
|---------|---------|-------------|-----------|
| Chaves em comum | 129.828 | 129.828 | 129.828 |
| Só oficial | 1 | 1 | 1 |
| Só V7 | — | 46.855 | **0** |
| Ordem colunas idêntica | — | Não | **Sim** |
| BANDEIRA dominante | Comper MT | COMPER | Comper MT (compat) |
| Mapeável % igual | — | ~57,6% | **81,86%** |
| PRODUTO | descricao-seq | vazio / CD NNN | **100% igual** |

## Scripts de validação

- `node scripts/compare-ruptura-validacao.cjs`
- `node scripts/compare-ruptura-validacao-layered.cjs [arquivoV7]`
- `node scripts/audit-ruptura-universo.cjs`
- `node scripts/homologacao-ruptura-analise.cjs [arquivoV7]`

## Export de teste pós-ajuste

Gerar (não sobrescreve referências):

```bash
node --import tsx scripts/gerar-ruptura-ajuste-export.mjs AJUSTE-02
```

Saída esperada em `VALIDAÇÃO/`:

- `IMPORTADO_2_AJUSTE-02.xlsx` (modo oficial_compativel)
- `IMPORTADO_2_AJUSTE-02_V7_INTEGRAL.xlsx` (modo V7_INTEGRAL)

## Decisão homologação

**APP RESSALVAS** — schema e universo compatível; colunas mapeáveis ≥80%; divergências residuais em PENDCPA (consolidado), BANDEIRA (adapter), CATEGORIA/COMPRADOR (fonte) e 22 cols PQ (esperado).
