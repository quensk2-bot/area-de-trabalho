import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isModoHibrido } from "../lib/env";
import {
  getInitialSession,
  mapAuthError,
  resetPasswordForEmail,
  signInWithPassword,
  signOutAuth,
  subscribeAuth,
} from "./authService";
import { buildPermissionHelpers } from "./authProfileUtils";
import { AUTH_V7_MESSAGES, type AuthV7ContextValue, type AuthV7ProfileBundle } from "./authV7Types";
import { loadAuthV7Profile, ProfileLoadError } from "./userProfileService";

const AuthV7Context = createContext<AuthV7ContextValue | null>(null);

type Props = { children: ReactNode };

export function AuthProvider({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [bundle, setBundle] = useState<AuthV7ProfileBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearProfile = useCallback(() => {
    setBundle(null);
    setError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!isModoHibrido()) {
      setError(AUTH_V7_MESSAGES.hybridLoadFailed);
      setBundle(null);
      return;
    }

    const currentSession = session ?? (await getInitialSession());
    if (!currentSession?.user) {
      clearProfile();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loaded = await loadAuthV7Profile(currentSession.user.id);
      setBundle(loaded);
      setError(null);
    } catch (err) {
      setBundle(null);
      if (err instanceof ProfileLoadError) {
        setError(err.message);
      } else if (err instanceof Error && err.message.toLowerCase().includes("jwt")) {
        setError(AUTH_V7_MESSAGES.sessionExpired);
      } else {
        setError(AUTH_V7_MESSAGES.hybridLoadFailed);
      }
    } finally {
      setLoading(false);
    }
  }, [session, clearProfile]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const initial = await getInitialSession();
        if (!mounted) return;
        setSession(initial);
        setUser(initial?.user ?? null);
      } catch {
        if (mounted) {
          setSession(null);
          setUser(null);
          setError(AUTH_V7_MESSAGES.sessionExpired);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrap();

    const unsubscribe = subscribeAuth((next) => {
      if (!mounted) return;
      setSession(next);
      setUser(next?.user ?? null);
      if (!next) {
        clearProfile();
        setError(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [clearProfile]);

  useEffect(() => {
    if (!session?.user) {
      clearProfile();
      return;
    }
    if (!isModoHibrido()) return;
    void refreshProfile();
  }, [session?.user?.id, refreshProfile, clearProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const { session: nextSession, error: authError } = await signInWithPassword(email, password);
    if (authError || !nextSession) {
      setLoading(false);
      throw new Error(mapAuthError(authError));
    }
    setSession(nextSession);
    setUser(nextSession.user);
  }, []);

  const signOut = useCallback(async () => {
    await signOutAuth();
    setSession(null);
    setUser(null);
    clearProfile();
    setError(null);
    setLoading(false);
  }, [clearProfile]);

  const resetPassword = useCallback(async (email: string) => {
    const { error: resetError } = await resetPasswordForEmail(email);
    if (resetError) {
      throw new Error(resetError.message);
    }
  }, []);

  const permissionHelpers = useMemo(() => buildPermissionHelpers(bundle), [bundle]);

  const value = useMemo<AuthV7ContextValue>(
    () => ({
      session,
      user,
      perfil: bundle?.perfil ?? null,
      regionais: bundle?.regionais ?? [],
      bandeiras: bundle?.bandeiras ?? [],
      lojas: bundle?.lojas ?? [],
      permissoes: bundle?.permissoes ?? [],
      loading,
      error,
      signIn,
      signOut,
      resetPassword,
      refreshProfile,
      ...permissionHelpers,
    }),
    [session, user, bundle, loading, error, signIn, signOut, resetPassword, refreshProfile, permissionHelpers],
  );

  return <AuthV7Context.Provider value={value}>{children}</AuthV7Context.Provider>;
}

export function useAuthV7(): AuthV7ContextValue {
  const ctx = useContext(AuthV7Context);
  if (!ctx) {
    throw new Error("useAuthV7 deve ser usado dentro de AuthProvider");
  }
  return ctx;
}

export function useOptionalAuthV7(): AuthV7ContextValue | null {
  return useContext(AuthV7Context);
}
