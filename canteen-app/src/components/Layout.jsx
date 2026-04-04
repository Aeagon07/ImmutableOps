import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  MenuSquare, ShoppingCart, Activity, History, 
  ChefHat, BarChart3, Settings, 
  LayoutDashboard, Users, User,
  Utensils, 
  LogOut, 
  Menu as MenuIcon, X
} from 'lucide-react';

const ROLE_LINKS = {
  student: [
    { label: 'Menu', path: '/student/menu', icon: MenuSquare },
    { label: 'Cart', path: '/student/cart', icon: ShoppingCart },
    { label: 'Track Order', path: '/student/track', icon: Activity },
    { label: 'History', path: '/student/history', icon: History }
  ],
  chef: [
    { label: 'Queue', path: '/chef/queue', icon: MenuSquare },
    { label: 'Load Chart', path: '/chef/chart', icon: BarChart3 },
    { label: 'Workload', path: '/chef/workload', icon: Settings }
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Menu Manager', path: '/admin/menu', icon: Utensils },
    { label: 'Users', path: '/admin/users', icon: Users }
  ]
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // If no user, just render children (login page etc)
  // Actually, Layout is only wrapping ProtectedRoutes, so user should exist.
  // We'll fallback to student if role missing temporarily
  const role = user?.role || 'student'; 
  const links = ROLE_LINKS[role] || ROLE_LINKS.student;

  function NavContent() {
    return (
      <>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#FFF0E5', padding: '10px', borderRadius: '12px' }}>
            <Utensils color="#FC8019" size={24} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
            CaféSync
          </span>
        </div>

        <nav style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {links.map(link => {
            const isActive = location.pathname.startsWith(link.path);
            const Icon = link.icon;
            return (
              <motion.button
                key={link.path}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { navigate(link.path); setMobileOpen(false); }}
                style={{
                  background: isActive ? '#FFF0E5' : 'transparent',
                  color: isActive ? '#FC8019' : '#4B5563',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: '15px',
                  textAlign: 'left',
                  transition: 'background 0.2s, color 0.2s',
                  position: 'relative'
                }}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeNavTab" 
                    style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '4px', background: '#FC8019', borderRadius: '0 4px 4px 0' }} 
                  />
                )}
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {link.label}
              </motion.button>
            );
          })}
        </nav>

        <div style={{ padding: '24px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <motion.div 
            whileHover={{ backgroundColor: '#F3F4F6' }}
            onClick={() => { navigate('/profile'); setMobileOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', cursor: 'pointer', marginBottom: '8px' }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FCEBEB', color: '#A32D2D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : <User />}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{user?.name || 'My Profile'}</div>
              <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'capitalize', fontWeight: 600 }}>{role}</div>
            </div>
          </motion.div>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={logout}
            style={{ width: '100%', background: '#FCEBEB', color: '#A32D2D', border: 'none', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <LogOut size={16} /> Sign Out
          </motion.button>
        </div>
      </>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F5F7F6', overflow: 'hidden' }}>
      
      {/* Desktop Sidebar */}
      <aside style={{ width: '280px', background: '#FFFFFF', borderRight: '1px solid #E5E7EB', display: 'none', flexDirection: 'column' }} className="desktop-sidebar">
        <NavContent />
      </aside>

      {/* Mobile Topbar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '60px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 50 }} className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Utensils color="#FC8019" size={20} strokeWidth={2.5} />
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>CaféSync</span>
        </div>
        <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}>
          <MenuIcon size={24} color="#111827" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} className="mobile-nav" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} style={{ position: 'fixed', top: 0, bottom: 0, left: 0, width: '280px', background: '#FFFFFF', zIndex: 101, display: 'flex', flexDirection: 'column' }} className="mobile-nav">
              <button onClick={() => setMobileOpen(false)} style={{ position: 'absolute', top: '24px', right: '16px', background: '#F3F4F6', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}>
                <X size={20} color="#111827" />
              </button>
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @media(min-width: 768px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-topbar, .mobile-nav { display: none !important; }
          .main-content { padding-top: 0 !important; }
        }
      `}</style>

      {/* Main Content Area */}
      <main className="main-content" style={{ flex: 1, overflowY: 'auto', paddingTop: '60px' }}>
        <Outlet />
      </main>

    </div>
  );
}
