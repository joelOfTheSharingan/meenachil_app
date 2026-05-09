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

  const authDone = useRef(false);

  /**
   * PROFILE FETCH (NON-BLOCKING)
   */
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
    } catch (err) {
      console.error("Profile error:", err);

      setUser({
        id: authUser.id,
        email: authUser.email || "",
        role: "supervisor",
      });
    }
  };

  /**
   * INIT AUTH (CRITICAL FIX)
   */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);

        if (session?.user) {
          fetchProfile(session.user); // 🔥 DO NOT AWAIT
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error(err);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false); // 🔥 ALWAYS STOP SPINNER
          authDone.current = true;
        }
      }
    };

    init();

    /**
     * AUTH LISTENER (NO LOADING CONTROL HERE)
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * AUTH FUNCTIONS
   */
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
    const redirectTo = window.location.hostname.includes("github.io")
      ? "https://joelofthesharingan.github.io/meenachil_app/"
      : window.location.origin;

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
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      await fetchProfile(authUser);
    }
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

/**
 * HOOK
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};