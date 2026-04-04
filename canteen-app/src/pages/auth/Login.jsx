import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Wait a tick for AuthContext to update the user value and redirect properly
      setTimeout(() => navigate('/student/menu'), 500);
    } catch (err) {
      console.error(err);
      setError('Failed to log in. Check your credentials.');
      setLoading(false);
    }
  }

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7F6',
    fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  };

  const cardStyle = {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '32px 24px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    margin: '0 16px'
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    textAlign: 'center',
    marginBottom: '20px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    color: '#6B7280',
    letterSpacing: '0.02em',
    marginBottom: '4px',
    fontWeight: 600
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    marginBottom: '16px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#374151',
    outline: 'none',
    transition: 'border-color 0.2s'
  };

  const btnStyle = {
    background: '#1D9E75',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: loading ? 'not-allowed' : 'pointer',
    width: '100%',
    marginTop: '10px',
    opacity: loading ? 0.5 : 1,
    transition: 'opacity 0.15s, transform 0.1s'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '32px', fontWeight: 700, color: '#1D9E75' }}>
            🍽 CaféSync
          </span>
        </div>
        <h1 style={titleStyle}>Welcome Back</h1>
        
        {error && (
          <div style={{
            background: '#FCEBEB',
            color: '#A32D2D',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px',
            textAlign: 'center',
            border: '1px solid #FECACA'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          
          <button 
            type="submit" 
            style={btnStyle} 
            disabled={loading}
            onMouseEnter={e => { if(!loading) e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => { if(!loading) e.currentTarget.style.opacity = '1' }}
            onMouseDown={e => { if(!loading) e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={e => { if(!loading) e.currentTarget.style.transform = 'scale(1)' }}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
