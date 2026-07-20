# Supabase Híbrido V7 — Baseline

Projeto: **html_projetoV7**  
Ref: `kdlhztpzedanwirifzsb`  
URL: `https://kdlhztpzedanwirifzsb.supabase.co`  
Região: South America (São Paulo)

## Objetivo

Schema leve `app_v7` — **sem** datamart de produtos/CDs.

## Migrations (11 arquivos baseline + grants + fix)

| Arquivo | Conteúdo |
|---------|----------|
| `20260720100000_app_v7_schema.sql` | Schema + helpers base |
| `20260720100100_usuarios_perfis.sql` | Perfil + regionais/bandeiras/lojas |
| `20260720100200_permissoes.sql` | Permissões granulares |
| `20260720100300_drive_pastas.sql` | Config pastas Drive |
| `20260720100400_pacotes_worker.sql` | Pacotes resumo + fila worker |
| `20260720100500_auditoria.sql` | Log de ações |
| `20260720100600_rls.sql` | RLS + helpers de escopo |
| `20260720100700_seed_permissoes.sql` | Seeds iniciais |
| `20260720100800_postgrest_grants.sql` | Grants authenticated |
| `20260720100900_service_role_grants.sql` | Grants Worker |
| `20260720101000_permissoes_drive_rls_fix.sql` | drive.* seeds + GERENTE_LOJA + revoke anon |

## Fases documentadas

- [H5 — Auth e Permissões](./H5-AUTH-PERMISSOES.md)
- [H16 — Piloto de Usuários](./H16-PILOTO-USUARIOS.md)

## Estrutura

```
supabase-hibrido/
└── supabase/
    ├── config.toml
    └── migrations/   (11 arquivos)
```

## CLI

```bash
supabase --workdir supabase-hibrido link --project-ref kdlhztpzedanwirifzsb
supabase --workdir supabase-hibrido migration list
supabase --workdir supabase-hibrido db push
```

**Status (2026-07-20):** 11 migrations aplicadas no projeto remoto.

**API exposta:** `app_v7` via `supabase config push` (`[api].schemas`).

**Chaves:**
- Frontend/GitHub: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (+ `VITE_MODO_HIBRIDO=true` no workflow)
- Worker local: `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_...` (não legacy JWT)
- Desativar legacy `service_role` JWT no Dashboard após migração

## Segurança

- **Nunca** commitar `service_role` ou senha do banco.
- Frontend: apenas `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- Worker: `SUPABASE_SERVICE_ROLE_KEY` local.

## Separado do histórico

Não usar `supabase/migrations` (92 arquivos do projeto antigo).
