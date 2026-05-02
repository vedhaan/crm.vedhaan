import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/admin/Dashboard'
import Clients from './pages/admin/Clients'
import Invoices from './pages/admin/Invoices'
import Leads from './pages/admin/Leads'
import Tasks from './pages/admin/Tasks'
import MemberDashboard from './pages/member/MemberDashboard'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/login' element={<Login />} />

          {/* Admin routes */}
          <Route path='/dashboard' element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
          <Route path='/clients' element={<ProtectedRoute adminOnly><Clients /></ProtectedRoute>} />
          <Route path='/invoices' element={<ProtectedRoute adminOnly><Invoices /></ProtectedRoute>} />
          <Route path='/leads' element={<ProtectedRoute adminOnly><Leads /></ProtectedRoute>} />
          <Route path='/tasks' element={<ProtectedRoute adminOnly><Tasks /></ProtectedRoute>} />

          {/* Member route */}
          <Route path='/member' element={<ProtectedRoute><MemberDashboard /></ProtectedRoute>} />

          <Route path='*' element={<Navigate to='/login' />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App