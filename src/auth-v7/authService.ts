import type { AuthError, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { getPasswordResetRedirectUrl } from "../lib/env";
import { AUTH_V7_MESSAGES } from "./authV7Types";

export function mapAuthError(error: AuthError | null): string {
  if (!error) return AUTH_V7_MESSAGES.invalidCredentials;
  const msg = error.message.toLowerCase();
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
    return AUTH_V7_MESSAGES.invalidCredentials;
  }
  if (msg.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }
  return error.message;
}

export async function signInWithPassword(email: string, password: string): Promise<{ session: Session | null; error: AuthError | null }> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password: password.trim(),
  });
  return { session: data.session ?? null, error };
}

export async function signOutAuth(): Promise<void> {
  await supabase.auth.signOut();
}

export async function resetPasswordForEmail(email: string): Promise<{ error: AuthError | null }> {
  const redirectTo = getPasswordResetRedirectUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  return { error };
}

export function subscribeAuth(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}

export async function getInitialSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}
