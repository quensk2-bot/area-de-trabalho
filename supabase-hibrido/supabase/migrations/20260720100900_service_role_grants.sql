-- Tabelas criadas após o grant inicial precisam de privilégios para service_role (Worker)
grant all on all tables in schema app_v7 to service_role;
grant all on all sequences in schema app_v7 to service_role;
grant execute on all functions in schema app_v7 to service_role;

alter default privileges in schema app_v7
  grant all on tables to service_role;

alter default privileges in schema app_v7
  grant all on sequences to service_role;
