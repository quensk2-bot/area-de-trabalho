create table app_v7.auditoria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id),
  modulo text not null,
  acao text not null,
  entidade text not null,
  entidade_id text,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index auditoria_modulo_criado_idx on app_v7.auditoria (modulo, criado_em desc);
create index auditoria_user_idx on app_v7.auditoria (user_id, criado_em desc);

grant select, insert on app_v7.auditoria to authenticated;
grant all on app_v7.auditoria to service_role;
