import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import Landing      from './pages/Landing'
import Login        from './pages/Login'
import Register     from './pages/Register'
import Dashboard    from './pages/Dashboard'
import LiveDetection from './pages/LiveDetection'
import VideoUpload  from './pages/VideoUpload'
import Analytics    from './pages/Analytics'
import History      from './pages/History'
import Reports      from './pages/Reports'
import Profile      from './pages/Profile'
import Settings     from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '12px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            {/* Public */}
            <Route path="/"         element={<Landing />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected */}
            <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/live"       element={<ProtectedRoute><LiveDetection /></ProtectedRoute>} />
            <Route path="/upload"     element={<ProtectedRoute><VideoUpload /></ProtectedRoute>} />
            <Route path="/analytics"  element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/history"    element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/reports"    element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings"   element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
