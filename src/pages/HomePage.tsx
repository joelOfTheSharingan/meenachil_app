import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Redirect based on role
  useEffect(() => {
    if (!user) return

    if (user.role === 'admin') {
      navigate('/admin')
    } else if (user.role === 'supervisor') {
      navigate('/supervisor')
    }
  }, [user, navigate])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Welcome, {user?.email}</h1>

      {/* See All Equipments Button */}
      <button
        onClick={() => navigate('/inventory')}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        See All Equipments
      </button>
    </div>
  )
}

export default HomePage
