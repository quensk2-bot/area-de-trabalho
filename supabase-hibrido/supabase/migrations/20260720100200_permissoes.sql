create table app_v7.permissoes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  modulo text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table app_v7.usuario_permissoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  permissao_id uuid not null references app_v7.permissoes (id) on delete cascade,
  permitido boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (user_id, permissao_id)
);

create index usuario_permissoes_user_idx on app_v7.usuario_permissoes (user_id);

grant select on app_v7.permissoes to authenticated;
grant select, insert, update, delete on app_v7.usuario_permissoes to authenticated;
