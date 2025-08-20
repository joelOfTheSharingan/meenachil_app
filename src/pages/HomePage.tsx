import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'

const HomePage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return

    if (user.role === 'admin') {
      navigate('/admin')
    } else if (user.role === 'supervisor') {
      navigate('/supervisor')
    }
  }, [user, navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Loading your dashboard...</p>
    </div>
  )
}

export default HomePage
