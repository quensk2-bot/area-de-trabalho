-- PostgREST precisa de USAGE no schema para anon/authenticated
grant usage on schema app_v7 to anon, authenticated;

grant select on all tables in schema app_v7 to anon, authenticated;
grant insert, update, delete on all tables in schema app_v7 to authenticated;

grant usage, select on all sequences in schema app_v7 to authenticated;

alter default privileges in schema app_v7
  grant select on tables to anon, authenticated;

alter default privileges in schema app_v7
  grant insert, update, delete on tables to authenticated;
