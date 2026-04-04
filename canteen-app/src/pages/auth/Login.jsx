import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Mail, Lock, LogIn, AlertCircle, User, Shield, UserPlus } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        await register(email, password, name, role);
        setTimeout(() => navigate(role === 'chef' ? '/chef/queue' : '/student/menu'), 500);
      } else {
        await login(email, password);
        setTimeout(() => navigate('/student/menu'), 500);
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to ${isRegistering ? 'register' : 'log in'}. Check your details.`);
      setLoading(false);
    }
  }

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7F6',
    position: 'relative',
    overflow: 'hidden'
  };

  const cardStyle = {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '16px',
    padding: '40px 32px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.02)',
    margin: '0 16px',
    position: 'relative',
    zIndex: 10
  };

  const titleStyle = {
    fontSize: '22px',
    fontWeight: 700,
    color: '#111827',
    textAlign: 'center',
    marginBottom: '8px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    color: '#6B7280',
    letterSpacing: '0.02em',
    marginBottom: '6px',
    fontWeight: 600,
    textTransform: 'uppercase'
  };

  return (
    <div style={containerStyle}>
      <motion.div 
        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 15, repeat: Infinity, repeatType: 'reverse' }}
        style={{ position: 'absolute', top: '-10%', left: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(252,128,25,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}
      />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
        transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', delay: 2 }}
        style={{ position: 'absolute', bottom: '-5%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}
      />

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={cardStyle}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
            style={{ background: '#FFF0E5', padding: '16px', borderRadius: '50%', marginBottom: '16px', color: '#FC8019' }}
          >
            <Coffee size={36} strokeWidth={2.5} />
          </motion.div>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#FC8019', letterSpacing: '-0.5px' }}>
            CaféSync
          </span>
        </div>
        
        <h1 style={titleStyle}>{isRegistering ? 'Create an Account' : 'Welcome Back'}</h1>
        <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '13px', marginBottom: '24px' }}>
          {isRegistering ? 'Join the community and enjoy our food.' : 'Select your portal to explore the features.'}
        </p>

        {!isRegistering && (
          <div style={{ marginBottom: '24px' }} />
        )}
        
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ background: '#FCEBEB', color: '#A32D2D', padding: '12px', borderRadius: '8px', fontSize: '13px', border: '1px solid #FECACA', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertCircle size={16} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: '2px' }}/>
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit}>
          
          <AnimatePresence>
            {isRegistering && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '12px', left: '12px', color: focused === 'name' ? '#FC8019' : '#9CA3AF', transition: 'color 0.2s' }}><User size={18} /></div>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} onFocus={() => setFocused('name')} onBlur={() => setFocused('')} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 40px', border: `1.5px solid ${focused === 'name' ? '#FC8019' : '#E5E7EB'}`, borderRadius: '10px', fontSize: '14px', color: '#111827', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxShadow: focused === 'name' ? '0 0 0 3px rgba(252,128,25,0.15)' : 'none' }} required={isRegistering} />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Select Role</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '12px', left: '12px', color: focused === 'role' ? '#FC8019' : '#9CA3AF', transition: 'color 0.2s' }}><Shield size={18} /></div>
                    <select value={role} onChange={e => setRole(e.target.value)} onFocus={() => setFocused('role')} onBlur={() => setFocused('')} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 40px', border: `1.5px solid ${focused === 'role' ? '#FC8019' : '#E5E7EB'}`, borderRadius: '10px', fontSize: '14px', color: '#111827', outline: 'none', background: '#fff', appearance: 'none', cursor: 'pointer' }}>
                      <option value="student">Student</option>
                      <option value="chef">Chef / Kitchen Staff</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '12px', left: '12px', color: focused === 'email' ? '#FC8019' : '#9CA3AF', transition: 'color 0.2s' }}><Mail size={18} /></div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocused('email')} onBlur={() => setFocused('')} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 40px', border: `1.5px solid ${focused === 'email' ? '#FC8019' : '#E5E7EB'}`, borderRadius: '10px', fontSize: '14px', color: '#111827', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxShadow: focused === 'email' ? '0 0 0 3px rgba(252,128,25,0.15)' : 'none' }} required />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '12px', left: '12px', color: focused === 'password' ? '#FC8019' : '#9CA3AF', transition: 'color 0.2s' }}><Lock size={18} /></div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocused('password')} onBlur={() => setFocused('')} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 40px', border: `1.5px solid ${focused === 'password' ? '#FC8019' : '#E5E7EB'}`, borderRadius: '10px', fontSize: '14px', color: '#111827', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxShadow: focused === 'password' ? '0 0 0 3px rgba(252,128,25,0.15)' : 'none' }} required minLength="6" />
            </div>
          </div>
          
          <motion.button 
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            type="submit" disabled={loading}
            style={{ background: '#FC8019', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px 20px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', width: '100%', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader size={18} /></motion.div> : (
              <>{isRegistering ? <UserPlus size={18} /> : <LogIn size={18} />} {isRegistering ? 'Create Account' : 'Sign In Securely'}</>
            )}
          </motion.button>

        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); setEmail(''); setPassword(''); setName(''); }} 
            style={{ background: 'transparent', border: 'none', color: '#6B7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
          >
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>

      </motion.div>
    </div>
  );
}

// Inline Loader component since lucide `Loader2` isn't imported
function Loader({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  );
}
