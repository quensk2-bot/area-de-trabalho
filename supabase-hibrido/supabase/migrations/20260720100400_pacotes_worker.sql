create table app_v7.pacotes_processamento (
  id uuid primary key default gen_random_uuid(),
  modulo text not null default 'ruptura',
  regional text not null,
  bandeira text not null,
  competencia date not null,
  data_referencia date not null,
  status text not null default 'rascunho' check (status in (
    'rascunho', 'validando', 'aguardando_worker', 'processando',
    'publicando', 'concluido', 'falhou', 'cancelado'
  )),
  hash_metadados text,
  hash_conteudo text,
  total_arquivos integer not null default 0,
  total_produtos integer,
  total_cds integer,
  versao integer not null default 1,
  manifest_url text,
  base_xlsx_url text,
  base_csv_url text,
  relatorio_url text,
  solicitado_por uuid references auth.users (id),
  iniciado_em timestamptz,
  finalizado_em timestamptz,
  erro_resumo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index pacotes_processamento_escopo_idx
  on app_v7.pacotes_processamento (modulo, regional, bandeira, competencia desc);

create trigger tr_pacotes_processamento_atualizado
before update on app_v7.pacotes_processamento
for each row execute function app_v7.set_atualizado_em();

create table app_v7.solicitacoes_worker (
  id uuid primary key default gen_random_uuid(),
  pacote_id uuid not null references app_v7.pacotes_processamento (id) on delete cascade,
  tipo text not null check (tipo in ('preparar', 'processar', 'publicar')),
  status text not null default 'pendente' check (status in (
    'pendente', 'em_execucao', 'concluido', 'falhou', 'cancelado'
  )),
  prioridade integer not null default 100,
  solicitado_por uuid references auth.users (id),
  worker_id text,
  tentativa integer not null default 0,
  solicitado_em timestamptz not null default now(),
  iniciado_em timestamptz,
  finalizado_em timestamptz,
  erro_resumo text,
  metricas jsonb not null default '{}'::jsonb
);

create index solicitacoes_worker_pacote_idx on app_v7.solicitacoes_worker (pacote_id);
create index solicitacoes_worker_status_idx on app_v7.solicitacoes_worker (status, prioridade, solicitado_em);

grant select, insert, update on app_v7.pacotes_processamento to authenticated;
grant select, insert, update on app_v7.solicitacoes_worker to authenticated;
grant all on app_v7.pacotes_processamento to service_role;
grant all on app_v7.solicitacoes_worker to service_role;
