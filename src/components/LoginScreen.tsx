// src/components/LoginScreen.tsx
import type React from "react";
import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { theme } from "../styles";
import { useOptionalAuthV7, AUTH_V7_MESSAGES } from "../auth-v7";

const loginStyles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    width: "100vw",
    margin: 0,
    padding: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at top, #020617 0, #020617 55%, #000 100%)",
    color: theme.colors.text,
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    boxSizing: "border-box",
  },
  card: {
    width: 380,
    maxWidth: "100%",
    background: "#020617",
    borderRadius: 24,
    border: "2px solid #f97316",
    boxShadow: "0 25px 60px rgba(0,0,0,0.9), 0 0 30px rgba(249,115,22,0.25)",
    padding: "28px 26px 30px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  titleBlock: { textAlign: "center", marginBottom: 10 },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    width: 38,
    height: 38,
    borderRadius: "999px",
    background: "conic-gradient(from 120deg, #22c55e, #f97316, #22c55e, #22c55e)",
    boxShadow: "0 0 18px rgba(34,197,94,0.55)",
    border: "2px solid #020617",
  },
  badgeInner: {
    width: 24,
    height: 24,
    borderRadius: "999px",
    background: "#020617",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#22c55e",
  },
  title: { fontSize: 24, fontWeight: 800, letterSpacing: "0.04em", color: "#f97316" },
  subtitle: { fontSize: 13, marginTop: 4, fontWeight: 600, color: theme.colors.text },
  sectionTitle: { marginTop: 10, fontSize: 15, fontWeight: 600 },
  form: { marginTop: 0, display: "flex", flexDirection: "column", gap: 12 },
  label: { fontSize: 13, color: theme.colors.textSoft, marginBottom: 2 },
  input: {
    width: "100%",
    borderRadius: 999,
    border: "1px solid #1f2937",
    padding: "10px 14px",
    fontSize: 14,
    background: "#020617",
    color: theme.colors.text,
    outline: "none",
  },
  buttonBase: {
    marginTop: 6,
    width: "100%",
    borderRadius: 999,
    border: "none",
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    background: theme.colors.neon,
    color: "#000",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  linkButton: {
    marginTop: 4,
    background: "none",
    border: "none",
    color: "#f97316",
    fontSize: 12,
    cursor: "pointer",
    textDecoration: "underline",
    alignSelf: "center",
  },
  error: { marginTop: 4, fontSize: 12, color: "#f97373", textAlign: "center" },
  success: { marginTop: 4, fontSize: 12, color: "#22c55e", textAlign: "center" },
};

type Props = {
  modo?: "hibrido" | "legado";
};

export function LoginScreen({ modo = "legado" }: Props) {
  const auth = useOptionalAuthV7();
  const hibrido = modo === "hibrido";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [focusField, setFocusField] = useState<"email" | "senha" | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (hibrido && auth) {
        await auth.signIn(email, senha);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha.trim(),
      });

      if (error) {
        setErrorMsg(hibrido ? AUTH_V7_MESSAGES.invalidCredentials : "E-mail ou senha inválidos.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro inesperado ao tentar entrar.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!email.trim()) {
      setErrorMsg("Informe seu e-mail para recuperar a senha.");
      return;
    }
    setLoading(true);
    try {
      if (hibrido && auth) {
        await auth.resetPassword(email);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: "https://quensk2-bot.github.io/area-de-trabalho/",
        });
        if (error) throw error;
      }
      setSuccessMsg("Enviamos um link de recuperação para seu e-mail.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Não foi possível enviar o e-mail de recuperação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={loginStyles.container}>
      <div style={loginStyles.card}>
        <div style={loginStyles.titleBlock}>
          <div style={loginStyles.badge}>
            <div style={loginStyles.badgeInner}>V7</div>
          </div>
          <div style={loginStyles.title}>{hibrido ? "Área de Trabalho V7" : "SUPPLY CHAIN"}</div>
          <div style={loginStyles.subtitle}>
            {hibrido ? "Login — ambiente híbrido" : "CONTROL CENTER"}
          </div>
        </div>

        <div style={loginStyles.sectionTitle}>Acesso</div>

        <form style={loginStyles.form} onSubmit={handleLogin}>
          <div>
            <label style={loginStyles.label}>E-mail</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusField("email")}
              onBlur={() => setFocusField(null)}
              style={{
                ...loginStyles.input,
                ...(focusField === "email" ? { borderColor: theme.colors.neon, boxShadow: "0 0 0 2px rgba(34,197,94,0.35)" } : {}),
              }}
              placeholder="seuemail@empresa.com"
            />
          </div>

          <div>
            <label style={loginStyles.label}>Senha</label>
            <input
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onFocus={() => setFocusField("senha")}
              onBlur={() => setFocusField(null)}
              style={{
                ...loginStyles.input,
                ...(focusField === "senha" ? { borderColor: theme.colors.neon, boxShadow: "0 0 0 2px rgba(34,197,94,0.35)" } : {}),
              }}
              placeholder="••••••••"
            />
          </div>

          {errorMsg && <p style={loginStyles.error}>{errorMsg}</p>}
          {successMsg && <p style={loginStyles.success}>{successMsg}</p>}

          <button type="submit" style={{ ...loginStyles.buttonBase, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <button type="button" style={loginStyles.linkButton} onClick={() => void handleResetPassword()} disabled={loading}>
            Esqueci minha senha
          </button>
        </form>
      </div>
    </div>
  );
}
