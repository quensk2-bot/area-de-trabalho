-- Permissões Drive + ajustes RLS (GERENTE_LOJA / anon)

insert into app_v7.permissoes (codigo, descricao, modulo) values
  ('drive.ver', 'Visualizar pastas e arquivos Drive configurados', 'drive'),
  ('drive.validar', 'Validar pacotes de arquivos Drive', 'drive'),
  ('drive.processar', 'Solicitar processamento de pacotes Drive', 'drive')
on conflict (codigo) do nothing;

-- GERENTE_LOJA: escopo por loja vinculada (não regional inteira)
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
    )
    or (
      app_v7.user_nivel() = 'GERENTE_LOJA'
      and exists (
        select 1
        from app_v7.usuario_lojas ul
        where ul.user_id = auth.uid()
          and ul.ativo
          and upper(ul.regional) = upper(p_regional)
          and upper(ul.bandeira) = upper(p_bandeira)
      )
    );
$$;

-- anon: revogar leitura direta (RLS + grants mínimos)
revoke all on all tables in schema app_v7 from anon;
revoke usage on schema app_v7 from anon;

-- usuário autenticado inativo: perfil visível só para si (policy existente) — bloqueio no app
