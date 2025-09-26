import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'

const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signUp, signInWithGoogle, handleOAuthRedirect } = useAuth()
  const navigate = useNavigate()

  // ✅ Handle OAuth redirect token
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('access_token')) {
      handleOAuthRedirect(hash)
      navigate('/home', { replace: true })
    }
  }, [navigate, handleOAuthRedirect])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signUp(email, password, 'supervisor')
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      navigate('/home')
    }
  }

  const handleGoogleSignUp = async () => {
    try {
      setError('')
      await signInWithGoogle()
      // OAuth redirect will trigger useEffect
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-6">Create an Account</h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSignUp} className="space-y-4">
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
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6">
          <button
            onClick={handleGoogleSignUp}
            className="w-full border border-gray-300 py-2 rounded-md flex items-center justify-center hover:bg-gray-100 transition duration-200"
          >
            <img
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google"
              className="w-5 h-5 mr-2"
            />
            Sign up with Google
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-blue-600 hover:text-blue-500 w-full mt-4 text-center"
        >
          Already have an account? Login
        </button>
      </div>
    </div>
  )
}

export default SignUpPage
