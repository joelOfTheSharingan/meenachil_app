import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.tsx";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn, signInWithGoogle, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  /**
   * LOGIN
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn(email, password);

    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    /**
     * DO NOT navigate here
     * AuthContext will update `user`
     */
  };

  /**
   * GOOGLE LOGIN
   */
  const handleGoogleLogin = async () => {
    try {
      setError("");
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    }
  };

  /**
   * REDIRECT AFTER AUTH IS READY
   */
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    if (user.role === "admin") {
      navigate("/admin", { replace: true });
    } else if (user.role === "supervisor") {
      navigate("/home", { replace: true });
    } else {
      navigate("/unauthorized", { replace: true });
    }
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-6">
          Sign in to your account
        </h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
            required
          />

          <button
            disabled={loading || authLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-md"
          >
            {loading || authLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <button
          onClick={handleGoogleLogin}
          className="w-full border mt-6 py-2 rounded-md"
        >
          Continue with Google
        </button>

        <button
          onClick={() => navigate("/signup")}
          className="text-blue-600 w-full mt-4"
        >
          Don’t have an account? Sign up
        </button>
      </div>
    </div>
  );
};

export default LoginPage;