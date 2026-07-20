import { theme } from "../styles";

export function AdminUsuariosHibridoPlaceholder() {
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Administração de usuários</h1>
      <p style={{ fontSize: 14, color: theme.colors.textSoft, maxWidth: 640 }}>
        Módulo de gestão de perfis <code>app_v7</code> será expandido na fase H6. Nesta fase piloto (H16),
        utilize os scripts de vínculo locais após criar usuários manualmente no Supabase Auth.
      </p>
      <ul style={{ marginTop: 16, fontSize: 13, color: theme.colors.textMuted }}>
        <li>Permissão exigida: <strong>usuarios.admin</strong></li>
        <li>RLS já restringe leitura/escrita por nível ADM</li>
        <li>A página legada <code>AdminPage</code> permanece no código para referência</li>
      </ul>
    </div>
  );
}
