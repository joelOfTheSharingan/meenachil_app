// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase.ts";
import type { User } from "@supabase/supabase-js";

type Role = "admin" | "supervisor";

type AuthContextType = {
  user: any;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, role?: Role) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  handleOAuthRedirect: (hash: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureUserRow = async (authId: string, email: string, role: Role = "supervisor") => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authId)
        .maybeSingle();

      if (!data && !error) {
        const { error: insertError } = await supabase.from("users").insert([
          {
            auth_id: authId,
            email,
            name: email.split("@")[0],
            role,
          },
        ]);
        if (insertError) console.error("Error inserting user row:", insertError);
      }
    } catch (err) {
      console.error("ensureUserRow failed:", err);
    }
  };

  const fetchUser = async (authId: string, email: string) => {
    try {
      const dbPromise = (async () => {
        await ensureUserRow(authId, email);
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", authId)
          .single();
        if (error) return null;
        return data;
      })();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      );

      const data = await Promise.race([dbPromise, timeoutPromise]);
      
      if (data) setUser(data);
      else setUser({ id: authId, email, role: "supervisor" });
    } catch (err) {
      console.error("fetchUser failed:", err);
      setUser({ id: authId, email, role: "supervisor" });
    }
  };

  const handleOAuthRedirect = async (hash: string) => {
  if (!hash) return;
  const params = new URLSearchParams(hash.replace('#', ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (!access_token || !refresh_token) {
    console.warn("OAuth tokens missing in redirect hash");
    return;
  }

  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) setError(error.message);
  if (data.session?.user) {
    await fetchUser(data.session.user.id, data.session.user.email!);
  }
};

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      setError(null);

      try {
        if (window.location.hash.includes('access_token')) {
          await handleOAuthRedirect(window.location.hash);
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            await fetchUser(session.user.id, session.user.email!);
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        if (mounted) {
          setUser(null);
          setError("Failed to initialize authentication");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) await fetchUser(session.user.id, session.user.email!);
      else setUser(null);
    });

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) await ensureUserRow(data.user.id, email);
    return { error };
  };

  const signUp = async (email: string, password: string, role: Role = "supervisor") => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.user) await ensureUserRow(data.user.id, email, role);
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/meenachil_app/#/`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Sign-Out Error:", error);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, signIn, signUp, signInWithGoogle, signOut, handleOAuthRedirect }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

