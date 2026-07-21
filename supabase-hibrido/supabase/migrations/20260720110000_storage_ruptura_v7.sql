-- Bucket privado ruptura-v7 + RLS por perfil app_v7
-- Path: {regional}/{bandeira}/{competencia}/manifest.json | dashboard/* | lojas/{loja}/*

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ruptura-v7',
  'ruptura-v7',
  false,
  52428800,
  array['application/json', 'application/gzip', 'application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Helper: extrai segmentos do path storage.objects.name
create or replace function app_v7.storage_path_parts(p_name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(trim(both '/' from p_name), '/');
$$;

create or replace function app_v7.user_can_read_ruptura_storage(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = app_v7, public, storage
as $$
declare
  parts text[];
  p_regional text;
  p_bandeira text;
  p_loja text;
begin
  if app_v7.user_is_adm() then
    return true;
  end if;

  parts := app_v7.storage_path_parts(p_name);
  if array_length(parts, 1) is null or array_length(parts, 1) < 3 then
    return false;
  end if;

  p_regional := parts[1];
  p_bandeira := parts[2];

  if not app_v7.user_has_bandeira(p_regional, p_bandeira) then
    return false;
  end if;

  if app_v7.user_nivel() in ('N0', 'N1') then
    return true;
  end if;

  -- GERENTE_LOJA: manifest + dashboard agregado + somente loja vinculada
  if parts[4] = 'manifest.json' or p_name like '%/manifest.json' then
    return true;
  end if;

  if parts[4] = 'dashboard' then
    return true;
  end if;

  if parts[4] = 'lojas' and parts[5] is not null then
    p_loja := parts[5];
    if p_loja !~ '^\d+$' then
      return false;
    end if;
    return app_v7.user_has_loja(p_regional, p_bandeira, p_loja::integer);
  end if;

  return false;
end;
$$;

-- SELECT authenticated
create policy ruptura_v7_select_authenticated on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ruptura-v7'
    and app_v7.user_can_read_ruptura_storage(name)
  );

-- service_role: upload/update/delete Worker
create policy ruptura_v7_insert_service on storage.objects
  for insert to service_role
  with check (bucket_id = 'ruptura-v7');

create policy ruptura_v7_update_service on storage.objects
  for update to service_role
  using (bucket_id = 'ruptura-v7')
  with check (bucket_id = 'ruptura-v7');

create policy ruptura_v7_delete_service on storage.objects
  for delete to service_role
  using (bucket_id = 'ruptura-v7');

create policy ruptura_v7_select_service on storage.objects
  for select to service_role
  using (bucket_id = 'ruptura-v7');

grant execute on function app_v7.storage_path_parts(text) to authenticated, service_role;
grant execute on function app_v7.user_can_read_ruptura_storage(text) to authenticated, service_role;
