import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Role → default home page mapping
const ROLE_HOME = {
  student: '/student/menu',
  chef:    '/chef/queue',
  admin:   '/admin/dashboard',
};

// ── Spinner styles (injected once via a <style> tag) ─────────────────────────
const SPINNER_STYLE = `
  @keyframes cafesync-spin {
    to { transform: rotate(360deg); }
  }
  .cafesync-spinner {
    width: 44px;
    height: 44px;
    border: 4px solid #e0f2ec;
    border-top-color: #1D9E75;
    border-radius: 50%;
    animation: cafesync-spin 0.75s linear infinite;
  }
`;

function Spinner() {
  return (
    <>
      <style>{SPINNER_STYLE}</style>
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          minHeight:      '100vh',
          background:     '#F5F7F6',
        }}
      >
        <div className="cafesync-spinner" />
      </div>
    </>
  );
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
// Props:
//   allowedRoles {string[]}  – roles that may access this route
//   redirectTo   {string}    – fallback redirect (default: "/")
//   children     {ReactNode} – the page to render when authorized
function ProtectedRoute({ allowedRoles = [], redirectTo = '/', children }) {
  const { user, loading } = useAuth();

  // 1. Still resolving Firebase auth state
  if (loading) return <Spinner />;

  // 2. Not signed in at all
  if (!user) return <Navigate to={redirectTo} replace />;

  // 3. Signed in but wrong role — send to their own home
  if (!allowedRoles.includes(user.role)) {
    const home = ROLE_HOME[user.role] ?? redirectTo;
    return <Navigate to={home} replace />;
  }

  // 4. Authorized — render the requested page
  return children;
}

export default ProtectedRoute;
