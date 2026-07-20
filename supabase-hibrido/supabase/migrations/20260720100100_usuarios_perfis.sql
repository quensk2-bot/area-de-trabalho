-- Perfis e vínculos de escopo (regional / bandeira / loja)

create table app_v7.usuarios_perfil (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  nivel text not null check (nivel in (
    'ADM', 'N0', 'N1', 'GERENTE_LOJA', 'COMPRADOR', 'VISUALIZADOR'
  )),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index usuarios_perfil_email_uq on app_v7.usuarios_perfil (lower(email));

create trigger tr_usuarios_perfil_atualizado
before update on app_v7.usuarios_perfil
for each row execute function app_v7.set_atualizado_em();

create table app_v7.usuario_regionais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  regional text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (user_id, regional)
);

create index usuario_regionais_user_idx on app_v7.usuario_regionais (user_id);
create index usuario_regionais_regional_idx on app_v7.usuario_regionais (regional);

create table app_v7.usuario_bandeiras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  regional text not null,
  bandeira text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (user_id, regional, bandeira)
);

create index usuario_bandeiras_user_idx on app_v7.usuario_bandeiras (user_id);

create table app_v7.usuario_lojas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  regional text not null,
  bandeira text not null,
  loja integer not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (user_id, regional, bandeira, loja)
);

create index usuario_lojas_user_idx on app_v7.usuario_lojas (user_id);
create index usuario_lojas_loja_idx on app_v7.usuario_lojas (regional, bandeira, loja);

grant select, insert, update on all tables in schema app_v7 to authenticated;
grant all on all tables in schema app_v7 to service_role;
