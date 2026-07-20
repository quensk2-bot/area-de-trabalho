import type { ReactNode } from "react";
import { styles } from "../styles";
import { useAuthV7 } from "./AuthProvider";
import { AUTH_V7_MESSAGES } from "./authV7Types";

type Props = {
  children: ReactNode;
};

function LoadingCard({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={styles.appShell}>
      <div style={styles.mainContent}>
        <div
          style={{
            ...styles.card,
            minHeight: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</h2>
          {subtitle ? <p style={{ color: "#ccc", marginTop: 16 }}>{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={styles.appShell}>
      <div style={styles.mainContent}>
        <div
          style={{
            ...styles.card,
            minHeight: 220,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Acesso indisponível</h2>
          <p
            style={{
              color: "#f97373",
              marginTop: 12,
              textAlign: "center",
              whiteSpace: "pre-line",
              fontSize: 14,
            }}
          >
            {message}
          </p>
          {onRetry ? (
            <button
              style={{
                marginTop: 18,
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: "#22c55e",
                color: "#000",
                fontWeight: 600,
                fontSize: 14,
              }}
              onClick={onRetry}
            >
              Tentar novamente
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: Props) {
  const { session, perfil, loading, error, refreshProfile, signOut } = useAuthV7();

  if (loading && !session) {
    return <LoadingCard title="Carregando sessão…" subtitle="Por favor, aguarde." />;
  }

  if (!session) {
    return null;
  }

  if (loading && !perfil) {
    return <LoadingCard title="Carregando perfil…" subtitle="Por favor, aguarde." />;
  }

  if (error && !perfil) {
    return (
      <ErrorCard
        message={error || AUTH_V7_MESSAGES.hybridLoadFailed}
        onRetry={() => void refreshProfile()}
      />
    );
  }

  if (!perfil) {
    return (
      <ErrorCard
        message={AUTH_V7_MESSAGES.profileMissing}
        onRetry={() => void refreshProfile()}
      />
    );
  }

  if (!perfil.ativo) {
    return (
      <ErrorCard
        message={AUTH_V7_MESSAGES.profileInactive}
        onRetry={() => void signOut()}
      />
    );
  }

  return <>{children}</>;
}
