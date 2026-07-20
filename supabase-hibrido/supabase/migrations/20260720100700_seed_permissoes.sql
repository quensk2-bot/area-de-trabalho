insert into app_v7.permissoes (codigo, descricao, modulo) values
  ('usuarios.admin', 'Administrar usuários e vínculos', 'admin'),
  ('ruptura.ver', 'Visualizar dashboards e pacotes de ruptura', 'ruptura'),
  ('ruptura.processar', 'Solicitar preparação e processamento de pacotes', 'ruptura'),
  ('ruptura.admin', 'Administrar configuração de ruptura', 'ruptura'),
  ('auditoria.ver', 'Visualizar trilha de auditoria do escopo', 'admin')
on conflict (codigo) do nothing;
