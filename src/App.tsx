// src/App.tsx
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import { isModoHibrido } from "./lib/env";
import type { Usuario } from "./types";
import { styles } from "./styles";
import { MainShellV14 } from "./components/MainShellV14";
import AdminPage from "./components/AdminPage";
import { LoginScreen } from "./components/LoginScreen";
import { AuthProvider, RequireAuth, useAuthV7 } from "./auth-v7";
import { MainShellHibrido } from "./components/MainShellHibrido";

type PerfilStatus = "idle" | "loading" | "ok" | "error";

function AppHibridoInner() {
  const { session, loading } = useAuthV7();

  if (loading && !session) {
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
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Carregando sessão…</h2>
            <p style={{ color: "#ccc", marginTop: 16 }}>Por favor, aguarde.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen modo="hibrido" />;
  }

  return (
    <RequireAuth>
      <MainShellHibrido />
    </RequireAuth>
  );
}

function AppLegado() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [perfilStatus, setPerfilStatus] = useState<PerfilStatus>("idle");
  const [perfilErro, setPerfilErro] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const restaurarSessao = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) console.error("getSession error:", error);
        setSession(data.session ?? null);
      } catch (err) {
        console.error("getSession exception:", err);
        if (isMounted) setSession(null);
      } finally {
        if (isMounted) setSessionLoaded(true);
      }
    };

    restaurarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (!isMounted) return;
      setSession(sess ?? null);
      setSessionLoaded(true);
      setPerfil(null);
      setPerfilStatus("idle");
      setPerfilErro(null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const carregarPerfil = useCallback(async (sess: Session | null) => {
    if (!sess?.user) {
      setPerfil(null);
      setPerfilStatus("idle");
      setPerfilErro(null);
      return;
    }

    setPerfilStatus("loading");
    setPerfilErro(null);

    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", sess.user.id)
        .maybeSingle();

      if (error) {
        setPerfil(null);
        setPerfilStatus("error");
        setPerfilErro(error.message);
        return;
      }

      if (!data) {
        setPerfil(null);
        setPerfilStatus("error");
        setPerfilErro(
          "Usuário não encontrado na tabela 'usuarios'. Verifique se ele foi cadastrado.",
        );
        return;
      }

      setPerfil(data as Usuario);
      setPerfilStatus("ok");
      setPerfilErro(null);
    } catch {
      setPerfil(null);
      setPerfilStatus("error");
      setPerfilErro("Erro inesperado ao carregar perfil.");
    }
  }, []);

  useEffect(() => {
    if (!session) {
      setPerfil(null);
      setPerfilStatus("idle");
      setPerfilErro(null);
      return;
    }
    carregarPerfil(session);
  }, [session, carregarPerfil]);

  if (!sessionLoaded) {
    return (
      <div style={styles.appShell}>
        <div style={styles.mainContent}>
          <div style={{ ...styles.card, minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Carregando sessão…</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen modo="legado" />;
  }

  if (perfilStatus === "loading" && !perfil) {
    return (
      <div style={styles.appShell}>
        <div style={styles.mainContent}>
          <div style={{ ...styles.card, minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Carregando perfil…</h2>
          </div>
        </div>
      </div>
    );
  }

  if (perfilStatus === "error" && !perfil) {
    return (
      <div style={styles.appShell}>
        <div style={styles.mainContent}>
          <div style={{ ...styles.card, minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Erro ao carregar perfil</h2>
            <p style={{ color: "#f97373", marginTop: 12, textAlign: "center", fontSize: 14 }}>{perfilErro}</p>
            <button
              style={{ marginTop: 18, padding: "8px 16px", borderRadius: 999, border: "none", cursor: "pointer", background: "#22c55e", color: "#000", fontWeight: 600 }}
              onClick={() => carregarPerfil(session)}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div style={styles.appShell}>
        <div style={styles.mainContent}>
          <div style={{ ...styles.card, minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Perfil não encontrado</h2>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setPerfil(null);
    setPerfilStatus("idle");
    setPerfilErro(null);
  };

  if (perfil.nivel === "ADM") {
    return <AdminPage />;
  }

  return <MainShellV14 perfil={perfil} onLogout={handleLogout} />;
}

function App() {
  if (isModoHibrido()) {
    return (
      <AuthProvider>
        <AppHibridoInner />
      </AuthProvider>
    );
  }
  return <AppLegado />;
}

export default App;
