-- Catálogo operacional de lojas (fonte única para filtros V7)

create table app_v7.lojas (
  id uuid primary key default gen_random_uuid(),
  regional text not null,
  bandeira text not null,
  loja integer not null check (loja > 0),
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (regional, bandeira, loja)
);

create index lojas_regional_bandeira_idx on app_v7.lojas (regional, bandeira, loja);
create index lojas_regional_idx on app_v7.lojas (regional);

create trigger tr_lojas_atualizado
before update on app_v7.lojas
for each row execute function app_v7.set_atualizado_em();

grant select on app_v7.lojas to authenticated;
grant all on app_v7.lojas to service_role;

alter table app_v7.lojas enable row level security;

create policy lojas_select on app_v7.lojas
  for select to authenticated
  using (
    ativo
    and (
      app_v7.user_is_adm()
      or app_v7.user_has_loja(regional, bandeira, loja)
      or (
        app_v7.user_nivel() in ('N0', 'N1')
        and app_v7.user_has_bandeira(regional, bandeira)
      )
    )
  );

create policy lojas_admin on app_v7.lojas
  for all to authenticated
  using (app_v7.user_is_adm())
  with check (app_v7.user_is_adm());

-- Piloto MT / COMPER (demais regionais entram via INSERT sem alterar telas)
insert into app_v7.lojas (regional, bandeira, loja, nome) values
  ('MT', 'COMPER', 73, 'COMPER CPA I'),
  ('MT', 'COMPER', 82, 'COMPER CENTRO'),
  ('MT', 'COMPER', 83, 'COMPER LOJA 83'),
  ('MT', 'COMPER', 88, 'COMPER LOJA 88'),
  ('MT', 'COMPER', 91, 'COMPER LOJA 91'),
  ('MT', 'COMPER', 92, 'COMPER LOJA 92'),
  ('MT', 'COMPER', 93, 'COMPER LOJA 93'),
  ('MT', 'COMPER', 96, 'COMPER LOJA 96'),
  ('MT', 'COMPER', 103, 'COMPER LOJA 103'),
  ('MT', 'COMPER', 104, 'COMPER LOJA 104'),
  ('MT', 'COMPER', 108, 'COMPER LOJA 108'),
  ('MT', 'COMPER', 123, 'COMPER LOJA 123'),
  ('MT', 'COMPER', 143, 'COMPER LOJA 143'),
  ('MT', 'COMPER', 148, 'COMPER LOJA 148'),
  ('MT', 'COMPER', 173, 'COMPER LOJA 173'),
  ('MT', 'FORT', 90, 'FORT LOJA 90'),
  ('MT', 'FORT', 95, 'FORT LOJA 95'),
  ('MT', 'FORT', 120, 'FORT LOJA 120'),
  ('MT', 'FORT', 415, 'FORT LOJA 415'),
  ('MT', 'FORT', 495, 'FORT LOJA 495')
on conflict (regional, bandeira, loja) do update
  set nome = excluded.nome,
      ativo = true,
      atualizado_em = now();
