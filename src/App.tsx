import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AdminLayout } from './components/layout/AdminLayout'
import { Dashboard } from './pages/Dashboard'
import { Inventory } from './pages/Inventory'
import { CreateAdminAccount } from './pages/CreateAdminAccount'
import { Login } from './pages/Login'
import { Notifications } from './pages/Notifications'
import { Payments } from './pages/Payments'
import { Products } from './pages/Products'
import { Profile } from './pages/Profile'
import { Users as Employees } from './pages/Users'
import { AccessDenied } from './pages/AccessDenied'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/create-account" element={<CreateAdminAccount />} />
      <Route path="/access-denied" element={<AccessDenied />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="inventory" element={<Inventory />} />
          <Route element={<ProtectedRoute requireSuperAdmin />}>
            <Route path="payments" element={<Payments />} />
            <Route path="employees" element={<Employees />} />
          </Route>
          <Route path="users" element={<Navigate to="/employees" replace />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
