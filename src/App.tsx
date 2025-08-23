import React from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import SignUpPage from './pages/SignUpPage.tsx'
import HomePage from './pages/HomePage.tsx'
import AdminDashboard from './pages/AdminDashboard.tsx'
import SupervisorDashboard from './pages/SupervisorDashboard.tsx'
import MySiteTools from './pages/MySiteTools.tsx' // ✅ New page

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Default route */}
      <Route path="/" element={user ? <Navigate to="/home" replace /> : <SignUpPage />} />

      {/* Auth routes */}
      <Route path="/login" element={user ? <Navigate to="/home" replace /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/home" replace /> : <SignUpPage />} />

      {/* Protected routes */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/supervisor"
        element={
          <ProtectedRoute allowedRoles={['supervisor']}>
            <SupervisorDashboard />
          </ProtectedRoute>
        }
      />

      {/* ✅ New My Site Tools route */}
      <Route
        path="/my-site-tools"
        element={
          <ProtectedRoute allowedRoles={['supervisor']}>
            <MySiteTools />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    // ✅ Use HashRouter for GitHub Pages routing
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App