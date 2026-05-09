import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.tsx";

const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signUp(email, password);

    setLoading(false);

    if (error) {
      setError(error);
      return;
    }

    /**
     * ❌ DO NOT navigate to /home
     * AuthContext will handle session + redirect
     */
    navigate("/home");
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle();

      /**
       * ❌ remove navigation here too
       * OAuth redirect handles it
       */
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-6">
          Create an Account
        </h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSignUp} className="space-y-4">
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
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <button
          onClick={handleGoogleSignUp}
          className="w-full border mt-6 py-2 rounded-md"
        >
          Sign up with Google
        </button>

        <button
          onClick={() => navigate("/login")}
          className="text-blue-600 w-full mt-4"
        >
          Already have an account? Login
        </button>
      </div>
    </div>
  );
};

export default SignUpPage;