# H6 — Mapa consumo_v7 → JSON híbrido

Auditoria das páginas/serviços `ruptura-v7` que consultam `consumo_v7` e equivalente Storage.

## Matriz principal

| Página / fluxo | Serviço antigo | View / origem antiga | JSON futuro (Storage) | Campos necessários |
|----------------|----------------|----------------------|------------------------|-------------------|
| Dashboard KPI loja | `rupturaDashboardService.consultarDashboardLoja` | `vw_ruptura_dashboard_loja` | `lojas/{loja}/resumo.json` | totalProdutos, ruptura, CP/MP/LP, semRuptura, bloqueados, percentualRuptura |
| Dashboard setores | `consultarDashboardSetores` | `vw_ruptura_dashboard_setor` | `resumo.json` → `setores[]` | setor, totalRuptura |
| Dashboard fornecedores | `consultarDashboardFornecedores` | `vw_ruptura_dashboard_fornecedor` | `resumo.json` → `fornecedores[]` | fornecedor, comprador, totalRuptura |
| Dashboard compradores | `consultarCompradoresTop` | agregação em `vw_ruptura_dashboard_fornecedor` | `resumo.json` → `compradores[]` | comprador, totalRuptura |
| Dashboard estoque CD | `consultarEstoquePorCd` | `vw_ruptura_produto_loja_cd` | `resumo.json` → `estoquePorCd[]` | codigoFisico, posicaoLogica, totalEstoque |
| Dashboard versão | `consultarExecucaoAtiva` | `vw_ruptura_execucao_ativa` | `manifest.json` | versao, geradoEm |
| Gestão tabela | `rupturaProdutosService.consultarProdutosPaginados` | `vw_ruptura_produto_loja` | `lojas/{loja}/gestao.json` (+ chunks) | campos Gestão (produto, classificação, estoques, ação…) |
| Detalhe produto | `consultarProdutoDetalhe` | `vw_ruptura_produto_loja` | `gestao.json` (filtro seqproduto) | mesmos campos linha |
| Export CSV/XLSX | `rupturaExport.exportarProdutosCsvXlsx` | lote `vw_ruptura_produto_loja` | **Drive** (manifest `baseXlsxDriveFileId`) | desabilitado fase H6 |
| CDs detalhe | `rupturaCdsService` | `vw_ruptura_produto_loja_cd` | `lojas/{loja}/cds.json` | cds[] dinâmicos por produto |
| Visão 360 | `rupturaOficialService.*` | `vw_ruptura_oficial_*` | futuro JSON oficial | congelado no shell híbrido |
| Central Ações | `rupturaAcoesService` | `vw_ruptura_central_acoes` | futuro JSON ações | congelado no shell híbrido |
| Execuções | `rupturaExecucoesService` | `vw_ruptura_execucoes` | `app_v7.pacotes_processamento` | resumo leve |
| Importação Drive | `rupturaPacoteDriveService` | `consumo_v7` + `infra_v7` RPCs | `app_v7` + Worker | migração Worker fase seguinte |

## Filtros e paginação

| Capacidade | Postgres antigo | JSON híbrido |
|------------|-----------------|--------------|
| Regional / loja / data | SQL `.eq()` | manifest + path Storage |
| Classificação CP/MP/LP | SQL `.in()` | filtro client-side em `gestao.json` |
| Busca produto | SQL `ilike` | filtro client-side (mín. 2 chars) |
| Paginação | SQL `range()` | slice client-side após download parte |
| Ordenação | SQL `order()` | sort client-side |
| Escopo GERENTE | views + RLS antigo | frontend + Storage RLS |

## Tipos TypeScript

| Antigo | Híbrido |
|--------|---------|
| `RupturaDashboardLoja` | `ResumoLojaJson` → mapeado |
| `RupturaProdutoLoja` | `HibridoProdutoGestao` → mapeado |
| `RupturaProdutoCd` | `CdsLojaJson.produtos[].cds[]` |

## Modo híbrido (runtime)

Quando `VITE_MODO_HIBRIDO=true`:

- **Não** chama `consumo_v7` (guard em `rupturaDb.ts`).
- Dashboard/Gestão usam `src/ruptura-v7/services/hibrido/*`.
- Erro conhecido substituído por `HybridDataPending`.

## Piloto

Escopo publicação: **MT / COMPER / loja 73 / competência 2026-07**.
