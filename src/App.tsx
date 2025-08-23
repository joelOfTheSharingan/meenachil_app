import React from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import SignUpPage from './pages/SignUpPage.tsx'
import HomePage from './pages/HomePage.tsx'
import AdminDashboard from './pages/AdminDashboard.tsx'
import SupervisorDashboard from './pages/SupervisorDashboard.tsx'
import MySiteTools from './pages/MySiteTools.tsx'
import AllInventoryPage from './pages/AllInventory.tsx'

// ✅ Loader component
const Loader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
  </div>
)

// ✅ Error fallback if auth fails
const ErrorFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center text-red-600 font-semibold">
    Something went wrong. Please refresh.
  </div>
)

const AppRoutes: React.FC = () => {
  const { user, loading, error } = useAuth()

  if (loading) return <Loader />
  if (error) return <ErrorFallback />

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
      <Route
        path="/my-site-tools"
        element={
          <ProtectedRoute allowedRoles={['supervisor']}>
            <MySiteTools />
          </ProtectedRoute>
        }
      />

      {/* ✅ All Inventory Page – accessible by both admins & supervisors */}
      <Route
        path="/inventory"
        element={
          <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
            <AllInventoryPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all (404) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App
