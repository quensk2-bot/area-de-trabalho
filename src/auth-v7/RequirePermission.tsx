import type { ReactNode } from "react";
import { styles } from "../styles";
import { useAuthV7 } from "./AuthProvider";
import { AUTH_V7_MESSAGES } from "./authV7Types";

type Props = {
  codigo: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function RequirePermission({ codigo, children, fallback }: Props) {
  const { hasPermission, loading, perfil } = useAuthV7();

  if (loading && !perfil) {
    return null;
  }

  if (!hasPermission(codigo)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div style={styles.appShell}>
        <div style={styles.mainContent}>
          <div style={{ ...styles.card, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Acesso restrito</h2>
            <p style={{ color: "#f97373", fontSize: 14 }}>{AUTH_V7_MESSAGES.permissionDenied}</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
