import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.tsx";
import { supabase } from "../lib/supabase.ts";

interface Profile {
  username: string;
  phone: string;
  role: "admin" | "supervisor";
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (authLoading) return;

      if (!user) {
        setLoading(false);
        navigate("/login", { replace: true });
        return;
      }

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("users")
          .select("username, phone, role")
          .eq("id", user.id)
          .maybeSingle(); // ✅ SAFE

        if (error) throw error;

        if (!data) {
          setProfile(null);
          setLoading(false); // ✅ IMPORTANT
          return;
        }

        setProfile(data);
        setUsername(data.username || "");
        setPhone(data.phone || "");

        if (data.username && data.phone) {
          navigate(
            data.role === "admin" ? "/admin" : "/supervisor",
            { replace: true }
          );
        }
      } catch (err: any) {
        console.error("Profile fetch failed:", err);
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false); // ✅ ALWAYS STOP LOADING
      }
    };

    fetchProfile();
  }, [user, authLoading, navigate]);

  /**
   * SAVE PROFILE (FIXED)
   */
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError("");

    try {
      const { data, error } = await supabase
        .from("users")
        .upsert(
          {
            id: user.id,
            email: user.email,
            username,
            phone,
            role: "supervisor",
          },
          { onConflict: "id" }
        )
        .select()
        .maybeSingle(); // ✅ FIX HERE

      if (error) throw error;

      if (!data) {
        setError("Failed to save profile");
        return;
      }

      setProfile(data);

      navigate(
        data.role === "admin" ? "/admin" : "/supervisor",
        { replace: true }
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save profile");
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!profile?.username || !profile?.phone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
          <h1 className="text-xl font-bold mb-4">Complete Your Profile</h1>

          {error && <p className="text-red-500 mb-3">{error}</p>}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <input
              className="w-full border rounded p-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
            />

            <input
              className="w-full border rounded p-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              required
            />

            <button className="w-full bg-blue-600 text-white py-2 rounded">
              Save & Continue
            </button>
          </form>

          <button
            onClick={handleLogout}
            className="mt-4 w-full bg-red-500 text-white py-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default HomePage;