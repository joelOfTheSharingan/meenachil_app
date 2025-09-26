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
import NewRequestsPage from './pages/NewRequests.tsx'   
import UserManagement from './pages/Users.tsx'
import AssignSites from './pages/AssignSites.tsx'
import TransactionLogs from './pages/TransactionLogs.tsx'

// ✅ Loader component
const Loader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
  </div>
)

// ✅ Error fallback - automatically logout
const ErrorFallback: React.FC = () => {
  const { signOut } = useAuth()
  
  React.useEffect(() => {
    // Automatically logout when there's an error
    signOut()
  }, [signOut])
  
  return (
    <div className="min-h-screen flex items-center justify-center text-red-600 font-semibold">
      Authentication error. Logging out...
    </div>
  )
}

const AppRoutes: React.FC = () => {
  const { user, loading, error } = useAuth()

  if (loading) return <Loader />
  if (error) return <ErrorFallback />

  return (
    <Routes>
      {/* Default route */}
      <Route
        path="/"
        element={
          user
            ? <Navigate to="/home" replace />
            : <Navigate to="/login" replace />
        }
      />

      {/* Auth routes */}
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/home" replace />} />
      <Route path="/signup" element={!user ? <SignUpPage /> : <Navigate to="/home" replace />} />

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
      <Route
        path="/inventory"
        element={
          <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
            <AllInventoryPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ New Requests page for supervisors */}
      <Route
        path="/newRequests"
        element={
          <ProtectedRoute allowedRoles={['supervisor']}>
            <NewRequestsPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ User Management page (admin only) */}
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      {/* ✅ Assign Sites page (admin only) */}
      <Route
        path="/assign-sites"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AssignSites />
          </ProtectedRoute>
        }
      />

      {/* ✅ Transaction Logs page (admin only) */}
      <Route
        path="/transactions"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <TransactionLogs />
          </ProtectedRoute>
        }
      />

      {/* 404 → go home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App
