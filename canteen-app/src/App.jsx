import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute  from './components/ProtectedRoute';
import Layout from './components/Layout';

// ── Pages ─────────────────────────────────────────────────────────────────────
import Login from './pages/auth/Login';

// Shared
import Profile from './pages/Profile';

// Student
import Menu       from './pages/student/Menu';
import Cart       from './pages/student/Cart';
import OrderTrack from './pages/student/OrderTrack';
import History    from './pages/student/History';

// Chef
import Queue         from './pages/chef/Queue';
import LoadChart     from './pages/chef/LoadChart';
import WorkloadPanel from './pages/chef/WorkloadPanel';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import MenuManager    from './pages/admin/MenuManager';
import UserList       from './pages/admin/UserList';

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ── Public ────────────────────────────────────────────────────── */}
          <Route path="/" element={<Login />} />

          {/* ── Authenticated ─────────────────────────────────────────────── */}
          <Route element={<Layout />}>
            
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['student', 'chef', 'admin']}>
                <Profile />
              </ProtectedRoute>
            } />

            {/* ── Student ───────────────────────────────────────────────────── */}
            <Route path="/student/menu" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Menu />
              </ProtectedRoute>
            } />
            <Route path="/student/cart" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Cart />
              </ProtectedRoute>
            } />
            <Route path="/student/track" element={
              <ProtectedRoute allowedRoles={['student']}>
                <OrderTrack />
              </ProtectedRoute>
            } />
            <Route path="/student/history" element={
              <ProtectedRoute allowedRoles={['student']}>
                <History />
              </ProtectedRoute>
            } />

            {/* ── Chef ──────────────────────────────────────────────────────── */}
            <Route path="/chef/queue" element={
              <ProtectedRoute allowedRoles={['chef']}>
                <Queue />
              </ProtectedRoute>
            } />
            <Route path="/chef/chart" element={
              <ProtectedRoute allowedRoles={['chef']}>
                <LoadChart />
              </ProtectedRoute>
            } />
            <Route path="/chef/workload" element={
              <ProtectedRoute allowedRoles={['chef']}>
                <WorkloadPanel />
              </ProtectedRoute>
            } />

            {/* ── Admin ─────────────────────────────────────────────────────── */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/menu" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MenuManager />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserList />
              </ProtectedRoute>
            } />

          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
