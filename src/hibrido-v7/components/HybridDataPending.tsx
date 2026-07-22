import type { CSSProperties } from "react";
import { theme } from "../../styles.ts";
import {
  HYBRID_DATA_PENDING_MESSAGE,
  HYBRID_BANDEIRA_NAO_PUBLICADA_MESSAGE,
  HYBRID_FORBIDDEN_MESSAGE,
  HYBRID_LOJA_NAO_PUBLICADA_MESSAGE,
  HYBRID_NENHUMA_LOJA_MESSAGE,
  HYBRID_NOT_PUBLISHED_MESSAGE,
  type HybridServiceErrorCode,
} from "../hybridErrors.ts";

type Props = {
  code?: HybridServiceErrorCode;
  message?: string;
  detail?: string | null;
};

const cardStyle: CSSProperties = {
  borderRadius: 16,
  border: `1px dashed ${theme.colors.borderSoft ?? "#334155"}`,
  background: "rgba(15,23,42,0.55)",
  padding: 24,
  maxWidth: 640,
};

const messages: Record<HybridServiceErrorCode, string> = {
  hybrid_pending: HYBRID_DATA_PENDING_MESSAGE,
  not_published: HYBRID_NOT_PUBLISHED_MESSAGE,
  loja_not_published: HYBRID_LOJA_NAO_PUBLICADA_MESSAGE,
  bandeira_not_published: HYBRID_BANDEIRA_NAO_PUBLICADA_MESSAGE,
  no_loja_selected: HYBRID_NENHUMA_LOJA_MESSAGE,
  forbidden: HYBRID_FORBIDDEN_MESSAGE,
  invalid_manifest: "Manifest inválido ou corrompido. Contate o administrador.",
  network: "Não foi possível carregar os dados operacionais. Tente novamente.",
};

export function HybridDataPending({ code = "hybrid_pending", message, detail }: Props) {
  const texto = message ?? messages[code];
  return (
    <div style={cardStyle} role="status">
      <h2 style={{ margin: "0 0 8px", fontSize: 18, color: theme.colors.neonOrange ?? "#fb923c" }}>
        Dados operacionais — modo híbrido
      </h2>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: theme.colors.textSoft ?? "#cbd5e1" }}>{texto}</p>
      {detail && code !== "hybrid_pending" ? (
        <p style={{ margin: "12px 0 0", fontSize: 12, color: theme.colors.textMuted ?? "#94a3b8" }}>{detail}</p>
      ) : null}
    </div>
  );
}
