import type { ReactNode } from "react";
import { theme } from "../styles";
import { useAuthV7 } from "../auth-v7";

export function MeuPerfilHibridoPage() {
  const auth = useAuthV7();

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Meu Perfil</h1>
      <Section title="Identificação">
        <Row label="Nome" value={auth.perfil?.nome ?? "—"} />
        <Row label="E-mail" value={auth.perfil?.email ?? "—"} />
        <Row label="Nível" value={auth.perfil?.nivel ?? "—"} />
        <Row label="Status" value={auth.perfil?.ativo ? "Ativo" : "Inativo"} />
      </Section>
      <Section title="Escopo">
        <Row label="Regionais" value={auth.regionais.map((r) => r.regional).join(", ") || "Nenhuma"} />
        <Row label="Bandeiras" value={auth.bandeiras.map((b) => `${b.bandeira} (${b.regional})`).join(", ") || "Nenhuma"} />
        <Row label="Lojas" value={auth.lojas.map((l) => `${l.loja} — ${l.bandeira}/${l.regional}`).join(", ") || "Nenhuma"} />
      </Section>
      <Section title="Permissões">
        {auth.permissoes.length === 0 ? (
          <p style={{ fontSize: 13, color: theme.colors.textMuted }}>Nenhuma permissão granular atribuída (ADM ignora esta lista).</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {auth.permissoes.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#f97316", marginBottom: 8 }}>{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, marginBottom: 6 }}>
      <span style={{ color: theme.colors.textMuted }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}
