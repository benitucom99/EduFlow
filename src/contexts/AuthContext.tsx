import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
    console.error("fetchProfile error", error);
    return null;
  }
  if (!data) return null;
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

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s?.user) {
      setProfile(null);
      return;
    }
    const p = await fetchProfile(s.user.id);
    setProfile(p);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      try {
        await loadProfile(data.session);
      } catch (err) {
        console.error("loadProfile error", err);
      }
    }).catch(console.error).finally(() => {
      if (mounted) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setSession(s);
      await loadProfile(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

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
    const p = await fetchProfile(data.session.user.id);
    setProfile(p);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      const p = await fetchProfile(session.user.id);
      setProfile(p);
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

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
