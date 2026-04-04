import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Firebase error code → human message ──────────────────────────────────────
const FIREBASE_ERRORS = {
  'auth/wrong-password':       'Incorrect password. Try again.',
  'auth/invalid-credential':   'Incorrect email or password. Try again.',
  'auth/user-not-found':       'No account found with this email.',
  'auth/email-already-in-use': 'Email already registered. Please login.',
  'auth/weak-password':        'Password must be at least 6 characters.',
  'auth/invalid-email':        'Please enter a valid email address.',
  'auth/too-many-requests':    'Too many attempts. Please try again later.',
};

function humanError(err) {
  // Firebase error codes are in err.code
  return FIREBASE_ERRORS[err?.code] ?? err?.message ?? 'Something went wrong. Please try again.';
}

// ── Role home map ─────────────────────────────────────────────────────────────
const ROLE_HOME = {
  student: '/student/menu',
  chef:    '/chef/queue',
  admin:   '/admin/dashboard',
};

// ─── Styles (all inline / in-module — no Tailwind, no external CSS) ───────────
const s = {
  page: {
    minHeight:       '100vh',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    background:      'linear-gradient(135deg, #e8f8f2 0%, #f0faf6 50%, #e4f4ee 100%)',
    fontFamily:      "'Segoe UI', system-ui, sans-serif",
    padding:         '24px',
  },
  card: {
    background:   '#ffffff',
    borderRadius: '16px',
    padding:      '40px 36px',
    maxWidth:     '420px',
    width:        '100%',
    boxShadow:    '0 8px 32px rgba(29,158,117,0.10), 0 2px 8px rgba(0,0,0,0.06)',
  },
  logo: {
    display:        'flex',
    alignItems:     'center',
    gap:            '10px',
    justifyContent: 'center',
    marginBottom:   '28px',
  },
  logoEmoji: {
    fontSize: '30px',
    lineHeight: 1,
  },
  logoText: {
    fontSize:   '22px',
    fontWeight: '700',
    color:      '#1D9E75',
    letterSpacing: '-0.3px',
  },
  title: {
    fontSize:     '20px',
    fontWeight:   '700',
    color:        '#1a1a1a',
    marginBottom: '6px',
    textAlign:    'center',
  },
  subtitle: {
    fontSize:     '13.5px',
    color:        '#6b7280',
    textAlign:    'center',
    marginBottom: '28px',
  },
  label: {
    display:      'block',
    fontSize:     '13px',
    fontWeight:   '600',
    color:        '#374151',
    marginBottom: '6px',
  },
  input: {
    width:        '100%',
    padding:      '11px 14px',
    fontSize:     '14px',
    border:       '1.5px solid #d1d5db',
    borderRadius: '10px',
    outline:      'none',
    transition:   'border-color 0.2s',
    marginBottom: '16px',
    boxSizing:    'border-box',
    color:        '#111827',
    background:   '#fafafa',
  },
  inputFocus: {
    borderColor: '#1D9E75',
    background:  '#fff',
  },
  fieldGroup: {
    marginBottom: '16px',
  },
  roleRow: {
    display:     'flex',
    gap:         '16px',
    marginBottom: '16px',
  },
  roleOption: {
    display:     'flex',
    alignItems:  'center',
    gap:         '7px',
    cursor:      'pointer',
    fontSize:    '14px',
    color:       '#374151',
    fontWeight:  '500',
  },
  radioInput: {
    accentColor: '#1D9E75',
    width:       '16px',
    height:      '16px',
    cursor:      'pointer',
  },
  adminNote: {
    fontSize:    '12px',
    color:       '#9ca3af',
    marginBottom: '20px',
    fontStyle:   'italic',
  },
  btn: {
    width:        '100%',
    padding:      '13px',
    background:   '#1D9E75',
    color:        '#ffffff',
    fontSize:     '15px',
    fontWeight:   '600',
    border:       'none',
    borderRadius: '10px',
    cursor:       'pointer',
    transition:   'background 0.2s, transform 0.1s',
    marginTop:    '4px',
    letterSpacing: '0.2px',
  },
  btnDisabled: {
    background: '#7ecfb3',
    cursor:     'not-allowed',
    transform:  'none',
  },
  errorBox: {
    background:   '#fff1f1',
    border:       '1.5px solid #fca5a5',
    borderRadius: '8px',
    padding:      '10px 14px',
    fontSize:     '13.5px',
    color:        '#dc2626',
    marginBottom: '16px',
    lineHeight:   '1.5',
  },
  switchRow: {
    textAlign:  'center',
    marginTop:  '22px',
    fontSize:   '13.5px',
    color:      '#6b7280',
  },
  switchLink: {
    color:          '#1D9E75',
    fontWeight:     '600',
    cursor:         'pointer',
    background:     'none',
    border:         'none',
    padding:        '0',
    fontSize:       '13.5px',
    textDecoration: 'underline',
  },
  divider: {
    height:       '1px',
    background:   '#f0f0f0',
    margin:       '20px 0',
  },
};

// ─── Login component ──────────────────────────────────────────────────────────
function Login() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();

  const [mode,    setMode]    = useState('login');
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState('');

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [role,     setRole]     = useState('student');
  const [focused,  setFocused]  = useState('');

  // ── Redirect when user context is populated by onAuthStateChanged ────────
  useEffect(() => {
    if (!loading && user) {
      navigate(ROLE_HOME[user.role] ?? '/', { replace: true });
    }
  }, [user, loading, navigate]);

  function inputStyle(field) {
    return focused === field
      ? { ...s.input, ...s.inputFocus }
      : s.input;
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError('');
    setEmail('');
    setPassword('');
    setName('');
    setRole('student');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        // Redirect is handled by the useEffect above — once
        // onAuthStateChanged fires and updates the user context.
      } else {
        await register(email, password, name, role);
        // Same — useEffect will redirect after context updates.
      }
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === 'login';

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* ── Logo ── */}
        <div style={s.logo}>
          <span style={s.logoEmoji}>🍽️</span>
          <span style={s.logoText}>CaféSync</span>
        </div>

        {/* ── Heading ── */}
        <div style={s.title}>{isLogin ? 'Welcome back' : 'Create account'}</div>
        <div style={s.subtitle}>
          {isLogin ? 'Sign in to your canteen account' : 'Register to order from the canteen'}
        </div>

        <div style={s.divider} />

        {/* ── Error ── */}
        {error && <div style={s.errorBox}>⚠ {error}</div>}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} noValidate>

          {/* Register: Full Name */}
          {!isLogin && (
            <div>
              <label style={s.label} htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                placeholder="e.g. Rohit Sharma"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused('')}
                style={inputStyle('name')}
                required
                disabled={busy}
                autoComplete="name"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label style={s.label} htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused('')}
              style={inputStyle('email')}
              required
              disabled={busy}
              autoComplete={isLogin ? 'email' : 'new-email'}
            />
          </div>

          {/* Password */}
          <div>
            <label style={s.label} htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder={isLogin ? '••••••••' : 'Min. 6 characters'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused('')}
              style={{ ...inputStyle('password'), marginBottom: isLogin ? '20px' : '16px' }}
              required
              disabled={busy}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {/* Register: Role picker */}
          {!isLogin && (
            <div>
              <label style={s.label}>I am a…</label>
              <div style={s.roleRow}>
                <label style={s.roleOption}>
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    checked={role === 'student'}
                    onChange={() => setRole('student')}
                    style={s.radioInput}
                    disabled={busy}
                  />
                  🎓 Student
                </label>
                <label style={s.roleOption}>
                  <input
                    type="radio"
                    name="role"
                    value="chef"
                    checked={role === 'chef'}
                    onChange={() => setRole('chef')}
                    style={s.radioInput}
                    disabled={busy}
                  />
                  👨‍🍳 Chef / Staff
                </label>
              </div>
              <p style={s.adminNote}>
                🔒 Admin accounts are created by the system administrator.
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={busy}
            style={busy ? { ...s.btn, ...s.btnDisabled } : s.btn}
            onMouseEnter={e => { if (!busy) e.currentTarget.style.background = '#178a65'; }}
            onMouseLeave={e => { if (!busy) e.currentTarget.style.background = '#1D9E75'; }}
            onMouseDown={e => { if (!busy) e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {busy
              ? (isLogin ? 'Logging in…' : 'Registering…')
              : (isLogin ? 'Sign In'     : 'Create Account')
            }
          </button>
        </form>

        {/* ── Mode switcher ── */}
        <div style={s.switchRow}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button style={s.switchLink} onClick={switchMode} type="button">
            {isLogin ? 'Register here' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
