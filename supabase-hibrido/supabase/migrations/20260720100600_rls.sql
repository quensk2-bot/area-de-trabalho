-- Helpers de autorização (RLS)

create or replace function app_v7.user_nivel()
returns text
language sql
stable
security definer
set search_path = app_v7, public
as $$
  select p.nivel
  from app_v7.usuarios_perfil p
  where p.user_id = auth.uid()
    and p.ativo
$$;

create or replace function app_v7.user_is_adm()
returns boolean
language sql
stable
security definer
set search_path = app_v7, public
as $$
  select coalesce(app_v7.user_nivel() = 'ADM', false);
$$;

create or replace function app_v7.user_has_regional(p_regional text)
returns boolean
language sql
stable
security definer
set search_path = app_v7, public
as $$
  select app_v7.user_is_adm()
    or exists (
      select 1
      from app_v7.usuario_regionais ur
      where ur.user_id = auth.uid()
        and ur.ativo
        and upper(ur.regional) = upper(p_regional)
    );
$$;

create or replace function app_v7.user_has_bandeira(p_regional text, p_bandeira text)
returns boolean
language sql
stable
security definer
set search_path = app_v7, public
as $$
  select app_v7.user_is_adm()
    or exists (
      select 1
      from app_v7.usuario_bandeiras ub
      where ub.user_id = auth.uid()
        and ub.ativo
        and upper(ub.regional) = upper(p_regional)
        and upper(ub.bandeira) = upper(p_bandeira)
    )
    or (
      app_v7.user_nivel() in ('N0', 'N1')
      and app_v7.user_has_regional(p_regional)
    );
$$;

create or replace function app_v7.user_has_loja(
  p_regional text,
  p_bandeira text,
  p_loja integer
)
returns boolean
language sql
stable
security definer
set search_path = app_v7, public
as $$
  select app_v7.user_is_adm()
    or exists (
      select 1
      from app_v7.usuario_lojas ul
      where ul.user_id = auth.uid()
        and ul.ativo
        and upper(ul.regional) = upper(p_regional)
        and upper(ul.bandeira) = upper(p_bandeira)
        and ul.loja = p_loja
    )
    or (
      app_v7.user_nivel() in ('N0', 'N1')
      and app_v7.user_has_bandeira(p_regional, p_bandeira)
    );
$$;

create or replace function app_v7.user_has_permission(p_codigo text)
returns boolean
language sql
stable
security definer
set search_path = app_v7, public
as $$
  select app_v7.user_is_adm()
    or exists (
      select 1
      from app_v7.usuario_permissoes up
      join app_v7.permissoes perm on perm.id = up.permissao_id
      where up.user_id = auth.uid()
        and up.permitido
        and perm.ativo
        and perm.codigo = p_codigo
    );
$$;

-- RLS

alter table app_v7.usuarios_perfil enable row level security;
alter table app_v7.usuario_regionais enable row level security;
alter table app_v7.usuario_bandeiras enable row level security;
alter table app_v7.usuario_lojas enable row level security;
alter table app_v7.permissoes enable row level security;
alter table app_v7.usuario_permissoes enable row level security;
alter table app_v7.drive_pastas enable row level security;
alter table app_v7.pacotes_processamento enable row level security;
alter table app_v7.solicitacoes_worker enable row level security;
alter table app_v7.auditoria enable row level security;

-- usuarios_perfil
create policy usuarios_perfil_select_self on app_v7.usuarios_perfil
  for select to authenticated
  using (user_id = auth.uid() or app_v7.user_is_adm());

create policy usuarios_perfil_admin_all on app_v7.usuarios_perfil
  for all to authenticated
  using (app_v7.user_is_adm())
  with check (app_v7.user_is_adm());

-- usuario_regionais / bandeiras / lojas
create policy usuario_regionais_select on app_v7.usuario_regionais
  for select to authenticated
  using (user_id = auth.uid() or app_v7.user_is_adm());

create policy usuario_bandeiras_select on app_v7.usuario_bandeiras
  for select to authenticated
  using (user_id = auth.uid() or app_v7.user_is_adm());

create policy usuario_lojas_select on app_v7.usuario_lojas
  for select to authenticated
  using (user_id = auth.uid() or app_v7.user_is_adm());

create policy usuario_regionais_admin on app_v7.usuario_regionais
  for all to authenticated
  using (app_v7.user_is_adm())
  with check (app_v7.user_is_adm());

create policy usuario_bandeiras_admin on app_v7.usuario_bandeiras
  for all to authenticated
  using (app_v7.user_is_adm())
  with check (app_v7.user_is_adm());

create policy usuario_lojas_admin on app_v7.usuario_lojas
  for all to authenticated
  using (app_v7.user_is_adm())
  with check (app_v7.user_is_adm());

-- permissoes
create policy permissoes_select on app_v7.permissoes
  for select to authenticated
  using (ativo or app_v7.user_is_adm());

create policy usuario_permissoes_select on app_v7.usuario_permissoes
  for select to authenticated
  using (user_id = auth.uid() or app_v7.user_is_adm());

create policy usuario_permissoes_admin on app_v7.usuario_permissoes
  for all to authenticated
  using (app_v7.user_is_adm())
  with check (app_v7.user_is_adm());

-- drive_pastas
create policy drive_pastas_select on app_v7.drive_pastas
  for select to authenticated
  using (
    ativo
    and app_v7.user_has_bandeira(regional, bandeira)
  );

create policy drive_pastas_admin on app_v7.drive_pastas
  for all to authenticated
  using (app_v7.user_is_adm())
  with check (app_v7.user_is_adm());

-- pacotes_processamento
create policy pacotes_select on app_v7.pacotes_processamento
  for select to authenticated
  using (
    app_v7.user_has_bandeira(regional, bandeira)
  );

create policy pacotes_insert on app_v7.pacotes_processamento
  for insert to authenticated
  with check (
    app_v7.user_has_permission('ruptura.processar')
    and app_v7.user_has_bandeira(regional, bandeira)
  );

create policy pacotes_update on app_v7.pacotes_processamento
  for update to authenticated
  using (
    app_v7.user_has_permission('ruptura.processar')
    and app_v7.user_has_bandeira(regional, bandeira)
  )
  with check (
    app_v7.user_has_permission('ruptura.processar')
    and app_v7.user_has_bandeira(regional, bandeira)
  );

create policy pacotes_admin on app_v7.pacotes_processamento
  for all to authenticated
  using (app_v7.user_is_adm())
  with check (app_v7.user_is_adm());

-- solicitacoes_worker
create policy solicitacoes_select on app_v7.solicitacoes_worker
  for select to authenticated
  using (
    exists (
      select 1
      from app_v7.pacotes_processamento p
      where p.id = pacote_id
        and app_v7.user_has_bandeira(p.regional, p.bandeira)
    )
  );

create policy solicitacoes_insert on app_v7.solicitacoes_worker
  for insert to authenticated
  with check (
    app_v7.user_has_permission('ruptura.processar')
    and exists (
      select 1
      from app_v7.pacotes_processamento p
      where p.id = pacote_id
        and app_v7.user_has_bandeira(p.regional, p.bandeira)
    )
  );

-- auditoria
create policy auditoria_select on app_v7.auditoria
  for select to authenticated
  using (
    user_id = auth.uid()
    or app_v7.user_is_adm()
    or app_v7.user_has_permission('auditoria.ver')
  );

create policy auditoria_insert on app_v7.auditoria
  for insert to authenticated
  with check (user_id = auth.uid() or app_v7.user_is_adm());

grant execute on all functions in schema app_v7 to authenticated, service_role;
