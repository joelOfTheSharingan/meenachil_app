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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Ensure user row exists
  const ensureUserRow = async (authId: string, email: string, role: Role = "supervisor") => {
    try {
      // First check if user exists by auth_id
      const { data: authData, error: authError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authId)
        .maybeSingle();

      // If not found by auth_id, check by email (in case auth_id changed)
      let { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (authData && !authError) {
        // User found by auth_id - check if we need to update auth_id
        console.log("✅ User found by auth_id");
        if (authData.auth_id !== authId) {
          console.log("🔄 Updating auth_id for existing user");
          const { error: updateError } = await supabase
            .from("users")
            .update({ auth_id: authId })
            .eq("id", authData.id);
          if (updateError) console.error("Error updating auth_id:", updateError);
        }
        return;
      }

      if (data && !error) {
        // User found by email - update auth_id
        console.log("✅ User found by email, updating auth_id");
        const { error: updateError } = await supabase
          .from("users")
          .update({ auth_id: authId })
          .eq("id", data.id);
        if (updateError) console.error("Error updating auth_id:", updateError);
      } else if (!data && !error) {
        // No user found - create new user
        console.log("➕ Creating new user row");
        const { error: insertError } = await supabase.from("users").insert([
          {
            auth_id: authId,
            email,
            role,
          },
        ]);
        if (insertError) {
          console.error("Error inserting user row:", insertError);
        } else {
          console.log("✅ New user created successfully");
        }
      }
    } catch (err) {
      console.error("ensureUserRow failed:", err);
    }
  };

  // ✅ Fetch user row, fall back to auth user if table fails
  const fetchUser = async (authId: string, email: string) => {
    try {
      const dbPromise = (async () => {
        await ensureUserRow(authId, email);
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", authId)
          .single();

        if (error) {
          console.warn("Database query failed, using fallback:", error.message);
          return null;
        }
        return data;
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database timeout")), 5000)
      );

      const data = await Promise.race([dbPromise, timeoutPromise]);

      if (data) {
        setUser(data);
        console.log("✅ User data loaded from database");
      } else {
        console.warn("⚠️ Using fallback user data");
        setUser({ id: authId, email, role: "supervisor" });
      }
    } catch (err: any) {
      console.error("❌ fetchUser failed:", err);
      if (err.message === "Database timeout") {
        console.warn("⚠️ Database slow, using fallback user data");
        setUser({ id: authId, email, role: "supervisor" });
      } else {
        setUser(null);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const handleOAuthRedirect = async () => {
      const hash = window.location.hash;

      if (hash.includes("access_token")) {
        console.log("🔑 OAuth redirect detected:", hash);

        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (error) {
          console.error("OAuth session exchange failed:", error.message);
        } else {
          console.log("✅ Session restored from redirect");
          // Clean up the URL to remove tokens
          window.history.replaceState({}, document.title, window.location.pathname + "#/");
        }
      }
    };

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔄 First handle redirect tokens if present
        await handleOAuthRedirect();

        console.log("🔐 Starting auth initialization...");

        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn("⏰ Auth initialization timeout - forcing loading to false");
            setLoading(false);
            setError("Authentication timeout - please refresh the page");
          }
        }, 15000);

        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("getSession timeout")), 10000)
        );

        const {
          data: { session },
        } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

        console.log("✅ Session retrieved:", session ? "User found" : "No user");

        if (session?.user && mounted) {
          console.log("👤 Fetching user data...");
          await fetchUser(session.user.id, session.user.email!);
        } else if (mounted) {
          setUser(null);
        }
      } catch (error: any) {
        console.error("❌ Auth initialization error:", error);
        if (mounted) {
          setUser(null);
          if (error.message === "getSession timeout") {
            setError("Authentication service is slow - please refresh");
          } else {
            setError("Failed to initialize authentication");
          }
        }
      } finally {
        if (mounted) {
          clearTimeout(timeoutId);
          setLoading(false);
          console.log("🏁 Auth initialization complete");
        }
      }
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        try {
          if (session?.user) {
            await fetchUser(session.user.id, session.user.email!);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error("Auth state change error:", error);
          setUser(null);
          setError("Authentication error occurred");
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  // ✅ Auth actions
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      await ensureUserRow(data.user.id, email);
    }
    return { error };
  };

  const signUp = async (email: string, password: string, role: Role = "supervisor") => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.user) {
      await ensureUserRow(data.user.id, email, role);
    }
    return { error };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = window.location.hostname.includes("github.io")
      ? "https://joelofthesharingan.github.io/meenachil_app/"
      : "http://localhost:3000/";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
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
      value={{ user, loading, error, signIn, signUp, signInWithGoogle, signOut }}
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
