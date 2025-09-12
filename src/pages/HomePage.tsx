import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { supabase } from '../lib/supabase.ts'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ username: string; phone: string } | null>(null)
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [redirected, setRedirected] = useState(false) // ✅ prevent loop

  // 1️⃣ Check if user has profile info
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || redirected) return

      const { data, error } = await supabase
        .from('users')
        .select('username, phone')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error.message)
      } else {
        setProfile(data)
        if (!data.username || !data.phone) {
          setUsername(data.username || '')
          setPhone(data.phone || '')
        } else {
          // Already has username & phone → go to dashboard
          setRedirected(true)
          navigate('/supervisor')
        }
      }
      setLoading(false)
    }

    fetchProfile()
  }, [user, navigate, redirected])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username || !phone) {
      setError('Please fill in both fields.')
      return
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ username, phone })
      .eq('id', user?.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      navigate('/supervisor')
    }
  }

  const handleLogout = async () => {
    const { error } = await signOut()
    if (!error) navigate('/login')
  }

  if (loading) return <p className="p-6">Loading...</p>

  // If profile is incomplete, show form
  if (!profile || !profile.username || !profile.phone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Complete Your Profile
          </h2>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
            >
              Save & Continue
            </button>
          </form>
          <button
            onClick={handleLogout}
            className="w-full mt-4 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition duration-200"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  // Fallback
  return <p>Redirecting...</p>
}

export default HomePage
