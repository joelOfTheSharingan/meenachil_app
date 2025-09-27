import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signInWithGoogle, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      setError(error.message)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setError('')
      await signInWithGoogle()
      // Redirect happens automatically after OAuth
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed')
    }
  }

  // Redirect user based on role
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'admin') {
        navigate('/admin')
      } else if (user.role === 'supervisor') {
        navigate('/home')
      } else {
        navigate('/unauthorized')
      }
    }
  }, [user, authLoading, navigate])

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
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={loading || authLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50"
          >
            {loading || authLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6">
          <button
            onClick={handleGoogleLogin}
            disabled={authLoading}
            className="w-full border border-gray-300 py-2 rounded-md flex items-center justify-center hover:bg-gray-100 transition duration-200 disabled:opacity-50"
          >
            <img
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google"
              className="w-5 h-5 mr-2"
            />
            Continue with Google
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/signup')}
          className="text-blue-600 hover:text-blue-500 w-full mt-4 text-center"
        >
          Don’t have an account? Sign up
        </button>
      </div>
    </div>
  )
}

export default LoginPage
export { LoginPage }
