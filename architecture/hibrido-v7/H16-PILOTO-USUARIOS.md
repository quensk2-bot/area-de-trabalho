# H16 — Piloto de Usuários

## Perfis preparados

| Perfil | Escopo | Permissões iniciais |
|--------|--------|---------------------|
| **ADM** | Global (RLS ADM) | Todas piloto |
| **N1 MT** | Regional MT, bandeira COMPER | ruptura + drive + processar |
| **GERENTE_LOJA 73** | Loja 73 MT/COMPER | `ruptura.ver` somente |

## Criação manual (Auth)

1. Dashboard Supabase → Authentication → Users.
2. Criar usuário (convite ou e-mail/senha).
3. Copiar **User UID** (não colocar no Git).

## Scripts de vínculo (local, service_role)

```bash
# Perfil base
npx tsx src/scripts/hibridoSeedPerfilPiloto.ts --user-id <UUID> --nivel ADM --nome "Admin Piloto" --email admin@empresa

# Vínculos e permissões
npx tsx src/scripts/hibridoVincularPiloto.ts --user-id <UUID> --perfil ADM
npx tsx src/scripts/hibridoVincularPiloto.ts --user-id <UUID> --perfil N1_MT
npx tsx src/scripts/hibridoVincularPiloto.ts --user-id <UUID> --perfil GERENTE_73
```

**Não** migrar senhas do projeto antigo.

## Regras de menu (MainShellHibrido)

| Nível | Menus |
|-------|-------|
| ADM | Início, Ruptura, Drive, Admin usuários, Meu Perfil |
| N1 MT | Início, Ruptura, Importação Drive (conforme permissão) |
| GERENTE 73 | Início, Ruptura Dashboard/Gestão loja 73 — sem processar, sem Worker |

Módulos congelados nesta fase: Recebimento, Ponto Extra, Rotinas/KPI, Visão 360, Central Ações, Execuções antigas.

## Testes RLS esperados

| Ator | Deve | Não deve |
|------|------|----------|
| ADM | Ler todos perfis, administrar vínculos | — |
| N1 MT | Ler MT/COMPER | Regional não autorizada, admin usuários |
| Gerente 73 | Loja 73 | Loja 82, pacotes, Worker, usuários |
| anon | — | Qualquer dado |
| Inativo | Login Auth pode existir | App bloqueia; policies não liberam operacional |

Verificação automatizada leve:

```bash
npm run auth-v7:verify-rls
```

Testes autenticados por perfil exigem JWT de cada usuário piloto (manual ou CI futuro).

## Próximo passo

**H6/H9** — UI completa de administração de usuários e publicação JSON/Drive operacional.
