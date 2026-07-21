# H6 — Publicação JSON privada

## Fluxo

```
Motor (memória)
  → geradores src/motor/export/hibrido/
  → validarArtefatosHibridos()
  → publicarStoragePrivado() [service_role, Worker local]
  → registrarPacoteLeve() → app_v7.pacotes_processamento
  → frontend lê via Storage + manifest.json
```

## Bucket

- Nome: `ruptura-v7`
- **Privado** (`public = false`)
- Migration: `supabase-hibrido/supabase/migrations/20260720110000_storage_ruptura_v7.sql`

## Estrutura de paths

```
MT/COMPER/2026-07/manifest.json
MT/COMPER/2026-07/dashboard/regional.json
MT/COMPER/2026-07/dashboard/lojas.json
MT/COMPER/2026-07/lojas/73/resumo.json
MT/COMPER/2026-07/lojas/73/gestao.json
MT/COMPER/2026-07/lojas/73/cds.json
```

Chunks gestão (>5 MB):

```
lojas/73/gestao/index.json
lojas/73/gestao/parte-001.json
...
```

## Módulos

| Caminho | Responsabilidade |
|---------|------------------|
| `src/hibrido-v7/manifest/` | Contrato, validação, builder, paths |
| `src/motor/export/hibrido/` | Geração, validação, upload Worker, registro DB |
| `src/ruptura-v7/services/hibrido/` | Consumo frontend autenticado |

## RLS Storage

- **ADM**: leitura total
- **N1/N0**: regional/bandeira vinculada
- **GERENTE_LOJA**: manifest + dashboard + `lojas/{sua_loja}/*`
- **anon**: zero
- **service_role**: upload Worker

## Segurança

- Nenhum JSON real no git/build
- Nenhum `service_role` no frontend
- Paths relativos validados (sem URL pública, sem `..`)

## CLI Worker (local)

```bash
# Requer SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no .env (gitignored)
npx tsx src/motor/export/hibrido/publicarPilotoCli.ts  # próxima fase
```

## Testes

```bash
npm run hibrido-publicacao:test
```
