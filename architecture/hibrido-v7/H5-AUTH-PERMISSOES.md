# H5 — Auth, Perfis e Permissões (modo híbrido)

## Objetivo

Autenticação via Supabase Auth do projeto **html_projetoV7** (`kdlhztpzedanwirifzsb`), perfil operacional em `app_v7`, sem uso de `public.usuarios` quando `VITE_MODO_HIBRIDO=true`.

## Módulo `src/auth-v7/`

| Arquivo | Responsabilidade |
|---------|------------------|
| `AuthProvider.tsx` | Sessão, perfil, vínculos, permissões, signIn/out, reset |
| `authService.ts` | Supabase Auth (anon) |
| `userProfileService.ts` | Consultas explícitas em `app_v7.*` |
| `permissionService.ts` | Regras de menu e escopo |
| `RequireAuth.tsx` | Bloqueia app sem perfil ativo |
| `RequirePermission.tsx` | Bloqueia módulo sem permissão |

## Fluxo

1. Supabase Auth resolve sessão.
2. Carrega `app_v7.usuarios_perfil`.
3. Bloqueia ausente/inativo.
4. Carrega regionais, bandeiras, lojas e permissões em paralelo.
5. Libera `MainShellHibrido`.

**Sem fallback silencioso** para o banco antigo. Erro exibido: *"Não foi possível carregar o perfil no ambiente híbrido."*

## Feature flag

```env
VITE_MODO_HIBRIDO=true
VITE_SUPABASE_URL=https://kdlhztpzedanwirifzsb.supabase.co
VITE_SUPABASE_ANON_KEY=<anon>
```

Produção (GitHub Pages): `pages.yml` injeta as três variáveis via Secrets.

## RLS (migrations 006–010)

- RLS em todas as tabelas `app_v7`.
- `anon`: sem grants (010 revoga).
- Autenticado: lê próprio perfil/vínculos; ADM administra tudo.
- N1: escopo regional/bandeira.
- GERENTE_LOJA: escopo por loja (010 corrige `user_has_bandeira`).
- `service_role`: Worker/admin local apenas.

## Permissões seed

- `usuarios.admin`, `ruptura.ver`, `ruptura.processar`, `ruptura.admin`, `auditoria.ver`
- `drive.ver`, `drive.validar`, `drive.processar` (migration 010)

## Recuperação de senha

`resetPasswordForEmail` com redirect:

`https://quensk2-bot.github.io/area-de-trabalho/`

Configurar **Site URL** e **Redirect URLs** no Dashboard do projeto novo.

## Testes

```bash
npm run auth-v7:test
npm run auth-v7:verify-rls   # local, requer .env + service_role
```

## Segurança

- Frontend: nunca `SUPABASE_SERVICE_ROLE_KEY`.
- Teste `buildSecurity.test.ts` bloqueia segredos no runtime.
- Projeto antigo `lghcztadxobrotyoqpbq` não referenciado em runtime híbrido.
