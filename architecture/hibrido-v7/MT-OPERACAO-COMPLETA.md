# MT / COMPER — Operação Completa (checklist de gates)

**Escopo exclusivo:** regional MT, bandeira COMPER. Sem FORT, sem outras regionais.  
**Versão congelada:** `V7-RUPTURA-MT-1.0`  
**Data freeze:** 2026-07-20

---

## Decisão final

| Gate | Status |
|------|--------|
| Gate 4 — BASE XLSX/CSV | 🟢 **VERDE** |
| Gate 10 — Freeze | 🟡 **APROVADO COM RESSALVAS** |

**Ressalva oficial:**

> O V7 processa o universo integral dos arquivos TXT. A planilha oficial Excel pode apresentar quantidade menor de produtos por filtros, Base Limpa e materializações do Power Query. As comparações de regras devem considerar a interseção válida de chaves.

Detalhamento: [`MT-HOMOLOGACAO-RESSALVAS.md`](./MT-HOMOLOGACAO-RESSALVAS.md)

---

## Artefatos produzidos

| Item | Valor |
|------|-------|
| Produtos V7 | **176.683** |
| Lojas Comper MT | **15/15** |
| BASE XLSX | ~66,7 MB (69.914.939 B) |
| BASE CSV | ~52,3 MB (54.855.933 B) |
| JSONs Storage | 79 paths (`ruptura-v7/MT/COMPER/2026-07/`) |
| Competência híbrida | `2026-07` |
| Data referência motor | `2026-07-13` |

**Lojas:** 73, 82, 83, 88, 91, 92, 93, 96, 103, 104, 108, 123, 143, 148, 173

---

## GATE 1 — Import 11 arquivos obrigatórios

**Base:** `C:\area-de-trabalho-v7\importar\RUPTURA\`

| # | Arquivo | Status |
|---|---------|--------|
| 1–11 | Catálogo motor (TXT/CSV/XLSX) | ✅ 11/11 presentes |

**Gate 1:** 🟢 **VERDE**

---

## GATE 2 — Worker (Drive → staging)

Código auditado: download streaming, retry, validação, padronização.  
Execução via `motor:drive-worker` ou fontes locais Gate 1.

**Gate 2:** 🟢 **VERDE** (código + execução local validada)

---

## GATE 3 — Motor pipeline

**CLI local:** `gerarBaseComperMtLocal.ts` — motor regional em memória, sem PostgreSQL pesado.

| Item | Status |
|------|--------|
| 15 lojas processadas | ✅ |
| Consolidados JSONL | ✅ `src/motor/.tmp/hibrido/MT/COMPER/consolidados/` |
| Duplicidades | 0 |

**Gate 3:** 🟢 **VERDE**

---

## GATE 4 — BASE XLSX/CSV

**Módulo:** `src/motor/export/baseRuptura/`

| Critério | Status |
|----------|--------|
| Aba `BASE` + `RESUMO_PROCESSAMENTO` | ✅ |
| Cabeçalho linha 1 — 62 colunas | ✅ |
| 176.683 linhas | ✅ |
| Sem fórmulas / Power Query embutido | ✅ |
| 22 campos ausentes V7 documentados | ✅ (`CAMPOS_AUSENTES_V7`) |

**Gate 4:** 🟢 **VERDE**

---

## GATE 5 — JSONs privados (Storage `ruptura-v7`)

| Path | Status |
|------|--------|
| `MT/COMPER/2026-07/manifest.json` | ✅ |
| `MT/COMPER/2026-07/dashboard/regional.json` | ✅ |
| `MT/COMPER/2026-07/dashboard/lojas.json` | ✅ |
| `MT/COMPER/2026-07/lojas/{73…173}/resumo.json` | ✅ 15/15 |
| `…/gestao/parte-*.json` | ✅ chunked |
| `…/cds.json` | ✅ 15/15 |

**Verificação:** `npx tsx src/motor/scripts/verificarStorageComperMt.ts`

**Gate 5:** 🟢 **VERDE**

---

## GATE 6 — Telas (homologação)

Dashboard e Gestão consomem JSON privado (H9). Export CSV/XLSX gestão desabilitado no híbrido.

**Gate 6:** 🟡 **AMARELO** — operacional para 15 lojas; export gestão pendente.

---

## GATE 7 — Excel × V7

**Script:** `homologacaoComperMt.ts` — compara interseção `loja|seqproduto`.

| Métrica | Resultado |
|---------|-----------|
| Críticas novas | **0** |
| CDs estruturais | **0** |
| Somente Excel | **0** |
| Somente V7 | Documentado (universo TXT integral) |
| Justificadas | Comprador / BRE / Rede (baseline 2E.3.8) |

**Gate 7:** 🟡 **APROVADO COM RESSALVAS**

---

## GATE 8 — Automação end-to-end

**Script:** `scripts/mt-comper-run.ps1`

```powershell
# Dry-run (local, sem upload)
.\scripts\mt-comper-run.ps1 -DryRun -SkipTests

# Produção (requer .env Supabase + Drive se usar pacote)
.\scripts\mt-comper-run.ps1 -Competencia 2026-07 -DataReferencia 2026-07-13 -PackageId {UUID}
```

**Parâmetros:** `-Competencia`, `-DataReferencia`, `-FolderId`, `-PackageId`, `-DryRun`, `-KeepFiles`, `-SkipUpload`, `-SkipTests`

**Etapas (12):** credenciais → pacote/fontes → download → validação → padronização → motor → BASE → JSONs → upload → registro → homologação → testes.

**Em falha:** exit ≠ 0; manifest anterior preservado (`SkipUpload`/`DryRun`).

**Gate 8:** 🟢 **VERDE**

---

## GATE 9 — Backup / versionamento

| Artefato | Path |
|----------|------|
| BASE local | `src/motor/.tmp/hibrido/MT/COMPER/` |
| Consolidados | `…/consolidados/consolidado_loja_*.jsonl` |
| Manifest + JSONs | Storage `ruptura-v7/MT/COMPER/2026-07/` |
| Relatório E2E | `…/mt_comper_run_report.json` |
| Rollback | manter versão anterior do manifest; scripts `resetPacoteStatus.ts` |

**Gate 9:** 🟢 **VERDE**

---

## GATE 10 — Freeze (tag / push)

| Critério | OK? |
|----------|-----|
| BASE gerada | ✅ |
| 15 lojas publicadas | ✅ |
| Críticas novas = 0 | ✅ |
| Testes npm + build | ✅ |
| Tag `V7-RUPTURA-MT-1.0` | ✅ |

**Gate 10:** 🟡 **APROVADO COM RESSALVAS** — congelado v1.0

---

## Testes obrigatórios

```powershell
npm run auth-v7:test
npm run ruptura-v7:test
npm run hibrido-publicacao:test
npm run motor:drive:test
npm run motor:test
npm run build
```

---

## Recuperação e rollback

1. **Manifest inválido:** não executar upload; usar `hibrido:reparar-manifest` ou restaurar versão anterior no Storage.
2. **Pacote DB:** `resetPacoteStatus.ts` / `marcarPacoteFalhou.ts`.
3. **Reprocessamento local:** `.\scripts\mt-comper-run.ps1 -DryRun` regenera BASE/JSONs sem tocar Storage.

---

## Expansão futura (FORT / outras regionais)

Pré-requisitos antes de replicar MT/COMPER:

1. Gate 1 completo (11 arquivos) na regional alvo.
2. Homologação interseção com ressalva documentada.
3. Publicação Storage multi-loja validada.
4. Tag semver independente (ex.: `V7-RUPTURA-{UF}-1.0`).

**Não iniciar FORT** até gate regional equivalente aprovado.

---

## Referências

- [`MT-HOMOLOGACAO-RESSALVAS.md`](./MT-HOMOLOGACAO-RESSALVAS.md)
- [`H6-PUBLICACAO-JSON.md`](./H6-PUBLICACAO-JSON.md)
- [`H9-CONSUMO-LEVE.md`](./H9-CONSUMO-LEVE.md)
- `architecture/motor-operacional-v7/FASE-2E38-DIAGNOSTICO-FINAL-DIVERGENCIAS.md`
- `scripts/mt-comper-run.ps1`
