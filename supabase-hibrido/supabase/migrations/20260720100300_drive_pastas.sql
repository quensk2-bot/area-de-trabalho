create table app_v7.drive_pastas (
  id uuid primary key default gen_random_uuid(),
  modulo text not null,
  regional text not null,
  bandeira text not null,
  ano integer,
  mes integer,
  tipo_pasta text not null,
  drive_folder_id text not null,
  caminho_exibicao text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (modulo, regional, bandeira, ano, mes, tipo_pasta)
);

create trigger tr_drive_pastas_atualizado
before update on app_v7.drive_pastas
for each row execute function app_v7.set_atualizado_em();

create index drive_pastas_modulo_regional_idx
  on app_v7.drive_pastas (modulo, regional, bandeira)
  where ativo;

grant select on app_v7.drive_pastas to authenticated;
grant all on app_v7.drive_pastas to service_role;
