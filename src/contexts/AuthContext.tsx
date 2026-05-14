import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.ts";

type Role = "admin" | "supervisor";

export type AppUser = {
  id: string;
  email: string;
  role: Role;
  username?: string | null;
  phone?: string | null;
};

type AuthContextType = {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;

  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrated = useRef(false);

  const fetchProfile = async (authUser: User) => {
    try {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!data) {
        setUser({
          id: authUser.id,
          email: authUser.email || "",
          role: "supervisor",
        });
        return;
      }

      setUser({
        id: data.id,
        email: data.email,
        role: data.role,
        username: data.username,
        phone: data.phone,
      });
    } catch {
      setUser({
        id: authUser.id,
        email: authUser.email || "",
        role: "supervisor",
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);

        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        const session = data.session;

        setSession(session);

        if (session?.user) {
          fetchProfile(session.user); // IMPORTANT: don't await
        } else {
          setUser(null);
        }

        hydrated.current = true;
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);

        if (session?.user) {
          fetchProfile(session.user);
        } else {
          setUser(null);
        }

        if (hydrated.current) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error?.message || null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    return { error: error?.message || null };
  };

  const signInWithGoogle = async () => {
    const redirectTo = window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) await fetchProfile(data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error: null,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};