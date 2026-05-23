import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export type UserRole = "admin" | "rececionista" | "explicador" | "encarregado";

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: UserRole | null;
  centro_id: string | null;
  centro?: string | null;
}

// Combined shape preserves compatibility with existing code that reads
// `user.role`, `user.nome`, `user.centro`.
export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  centro_id: string;
  centro: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (args: { nome: string; email: string; password: string; centroNome: string }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  // Back-compat alias for legacy callers.
  login: (email: string, password: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, nome, email, role, centro_id, centros(nome)")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    // Erro real (rede/RLS): deixa o caller manter a sessão e tentar de novo.
    console.error("fetchProfile error", error);
    throw error;
  }
  if (!data) return null; // Sem linha → perfil genuinamente inexistente.
  const centroNome = (data as { centros?: { nome: string } | null }).centros?.nome ?? null;
  return {
    id: data.id,
    nome: data.nome,
    email: data.email,
    role: data.role as UserRole | null,
    centro_id: data.centro_id,
    centro: centroNome,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Rede de segurança: a app nunca fica presa no spinner.
    const timeoutId = window.setTimeout(() => {
      if (mounted) {
        console.warn("[Auth] Auth init timeout — forcing loading=false");
        setLoading(false);
      }
    }, 5000);

    // Corre SEMPRE fora do lock de auth (via setTimeout no listener), para
    // evitar o deadlock do supabase-js: nunca chamar diretamente dentro do
    // callback onAuthStateChange.
    const syncProfile = async (s: Session | null, manageLoading: boolean) => {
      if (!s?.user) {
        setProfile(null);
        if (manageLoading && mounted) setLoading(false);
        return;
      }
      try {
        const p = await fetchProfile(s.user.id);
        if (!mounted) return;
        setProfile(p);
        if (!p) {
          // Sessão válida mas sem linha de perfil legível → estado inválido.
          console.warn("[Auth] No profile row for session — signing out");
          supabase.auth.signOut();
        }
      } catch (err) {
        // Erro transitório (rede/RLS): mantém a sessão, não expulsa o utilizador.
        console.error("[Auth] fetchProfile failed (keeping session):", err);
      } finally {
        if (manageLoading && mounted) setLoading(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);

      if (event === "SIGNED_OUT" || !s) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // INITIAL_SESSION / SIGNED_IN: bloqueia a UI com spinner até o perfil
      // resolver (evita redirect para /login num refresh válido ou pós-login).
      // TOKEN_REFRESHED / USER_UPDATED: re-sincroniza em background, sem spinner.
      const manageLoading = event === "INITIAL_SESSION" || event === "SIGNED_IN";
      if (manageLoading) setLoading(true);

      // Adia para FORA do lock — crítico para não causar deadlock.
      setTimeout(() => { syncProfile(s, manageLoading); }, 0);
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  }, []);

  const signUp = useCallback(async ({ nome, email, password, centroNome }: { nome: string; email: string; password: string; centroNome: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });
    if (error) return { ok: false, error: error.message };
    if (!data.session) {
      // Email confirmation pode estar ligado — sem sessão não dá para chamar a RPC.
      return { ok: false, error: "Confirmação de email necessária. Desative em Supabase ou confirme o email." };
    }
    const { error: rpcErr } = await supabase.rpc("create_centro_for_new_admin", { p_centro_nome: centroNome });
    if (rpcErr) return { ok: false, error: rpcErr.message };
    try {
      const p = await fetchProfile(data.session.user.id);
      setProfile(p);
    } catch (err) {
      console.error("[Auth] fetchProfile after signUp failed:", err);
    }
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      try {
        const p = await fetchProfile(session.user.id);
        setProfile(p);
      } catch (err) {
        console.error("[Auth] refreshProfile failed:", err);
      }
    }
  }, [session]);

  const user: AuthUser | null = session?.user && profile && profile.role && profile.centro_id
    ? {
        id: profile.id,
        nome: profile.nome,
        email: profile.email,
        role: profile.role,
        centro_id: profile.centro_id,
        centro: profile.centro ?? "",
      }
    : null;

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!session,
    signIn,
    signUp,
    logout,
    login: signIn,
    refreshProfile,
  }), [user, session, profile, loading, signIn, signUp, logout, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
