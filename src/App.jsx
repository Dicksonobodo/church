import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./hooks/useAuth"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Attendance from "./pages/Attendance"
import Members from "./pages/Members"
import Report from "./pages/Report"
import NewConverts from "./pages/NewConverts"
import Checkin from "./pages/Checkin"

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm text-gray-400">Loading...</div>
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/checkin/:qrCode" element={<CheckIn />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/attendance/:serviceId" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
        <Route path="/new-converts" element={<ProtectedRoute><NewConverts /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}