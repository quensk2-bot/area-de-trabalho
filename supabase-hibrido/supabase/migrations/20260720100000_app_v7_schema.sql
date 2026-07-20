-- Baseline híbrido V7 — schema leve (sem datamart)
create schema if not exists app_v7;

revoke all on schema app_v7 from public;
grant usage on schema app_v7 to postgres, service_role;
grant usage on schema app_v7 to authenticated;

create or replace function app_v7.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create or replace function app_v7.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;
