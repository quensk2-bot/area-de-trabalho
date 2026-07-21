# H9 — Consumo leve (frontend híbrido)

## Objetivo

Substituir consultas `consumo_v7` por download autenticado de JSON no Storage privado.

## Serviços

| Arquivo | Função |
|---------|--------|
| `manifestService.ts` | Carrega e valida `manifest.json` |
| `storageJsonService.ts` | Download + cache 30s |
| `rupturaResumoHibridoService.ts` | Dashboard ← `resumo.json` |
| `rupturaGestaoHibridoService.ts` | Gestão ← `gestao.json` (+ chunks) |
| `rupturaCdsHibridoService.ts` | CDs sob demanda ← `cds.json` |
| `hibridoScope.ts` | Escopo ADM/N1/Gerente |

## Páginas

| Página | Comportamento híbrido |
|--------|----------------------|
| `RupturaDashboardPage` | Serviços híbridos; `HybridDataPending` se 404/sem publicação |
| `RupturaGestaoPage` | Paginação client-side; export CSV/XLSX desabilitado |
| `MainShellHibrido` | Menu intacto; rotas congeladas documentadas |

## Estados UI

| Código | Mensagem |
|--------|----------|
| `hybrid_pending` | Migração para modelo híbrido (legado schema) |
| `not_published` | Versão ainda não publicada |
| `forbidden` | Escopo/RLS negado (ex.: gerente tentando loja 82) |
| `invalid_manifest` | Manifest corrompido |

## Escopo piloto

- **GERENTE 73**: regional MT, bandeira COMPER, loja 73 fixas (inputs readonly)
- **N1 MT**: MT/COMPER; pode escolher loja publicada
- **ADM**: qualquer path permitido pelo manifest

## Cache

Cache em memória por path (TTL 30s) — invalidar após nova publicação Worker.

## Próxima fase

- Worker publicação completa com consolidado real loja 73
- Download XLSX/CSV via Drive fileId do manifest (proxy seguro)
- Importação Drive migrada para `app_v7` (sem `infra_v7` antigo)
