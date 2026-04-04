import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_STYLES = {
  student: { color: '#1D4ED8', bg: '#DBEAFE', label: 'Student' },
  chef:    { color: '#B45309', bg: '#FEF3C7', label: 'Chef'    },
  admin:   { color: '#7C3AED', bg: '#EDE9FE', label: 'Admin'   },
};

const ROLES = ['student', 'chef', 'admin'];

function RolePill({ role }) {
  const { color, bg, label } = ROLE_STYLES[role] ?? { color: '#374151', bg: '#F3F4F6', label: role };
  return (
    <span style={{
      background: bg, color, borderRadius: 20,
      padding: '3px 10px', fontSize: 12, fontWeight: 700,
    }}>{label}</span>
  );
}

// ─── NavBar ────────────────────────────────────────────────────────────────────

function NavBar() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 58,
      background: '#fff', borderBottom: '1px solid #E5E7EB',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <span style={{ fontWeight: 800, fontSize: 17, color: '#7C3AED' }}>👥 User Management</span>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <NavBtn label="← Dashboard" onClick={() => navigate('/admin/dashboard')} color="#1D9E75" />
        <NavBtn label="Menu Mgmt"   onClick={() => navigate('/admin/menu')}      color="#374151" />
        <NavBtn label="Logout"      onClick={logout}                              color="#EF4444" />
      </div>
    </div>
  );
}

function NavBtn({ label, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', color,
      fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0,
    }}>{label}</button>
  );
}

// ─── Stats Pill Row ───────────────────────────────────────────────────────────

function StatsPills({ users }) {
  const counts = users.reduce((acc, u) => {
    const r = u.role ?? 'student';
    acc[r] = (acc[r] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
      {ROLES.map(role => {
        const { color, bg, label } = ROLE_STYLES[role];
        const count = counts[role] ?? 0;
        return (
          <div key={role} style={{
            background: bg, border: `1px solid ${color}33`,
            borderRadius: 20, padding: '6px 16px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontWeight: 800, fontSize: 18, color }}>{count}</span>
            <span style={{ fontWeight: 600, fontSize: 13, color }}>{label}{count !== 1 ? 's' : ''}</span>
          </div>
        );
      })}
      <div style={{
        background: '#F3F4F6', borderRadius: 20, padding: '6px 16px',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: '#374151' }}>{users.length}</span>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>Total</span>
      </div>
    </div>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({ user: u, onRefresh }) {
  const [selected, setSelected] = useState(u.role ?? 'student');
  const [saving,   setSaving]   = useState(false);
  const [applied,  setApplied]  = useState(false);

  function formatDate(val) {
    if (!val) return '—';
    const d = val?.toDate ? val.toDate() : new Date(val);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString();
  }

  async function applyRole() {
    if (selected === u.role) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', u.id), { role: selected });
      setApplied(true);
      setTimeout(() => { setApplied(false); onRefresh(); }, 1500);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  const tdStyle = {
    padding: '11px 12px', fontSize: 13, color: '#374151',
    borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle',
  };

  return (
    <tr
      onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      <td style={{ ...tdStyle, fontWeight: 600, color: '#111827' }}>{u.name ?? '—'}</td>
      <td style={{ ...tdStyle, color: '#6B7280' }}>{u.email ?? '—'}</td>
      <td style={tdStyle}><RolePill role={u.role ?? 'student'} /></td>
      <td style={{ ...tdStyle, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{formatDate(u.createdAt)}</td>
      <td style={tdStyle}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            style={{
              border: '1px solid #D1D5DB', borderRadius: 7, padding: '5px 8px',
              fontSize: 12, color: '#111827', background: '#fff', outline: 'none',
            }}
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            onClick={applyRole}
            disabled={saving || selected === u.role}
            style={{
              background: applied ? '#E1F5EE' : '#7C3AED',
              color: applied ? '#1D9E75' : '#fff',
              border: 'none', borderRadius: 6, padding: '5px 12px',
              fontSize: 12, fontWeight: 600,
              cursor: (saving || selected === u.role) ? 'not-allowed' : 'pointer',
              opacity: (saving || selected === u.role) ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {applied ? '✓ Applied' : 'Apply'}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function UserList() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  async function fetchUsers() {
    setLoading(true);
    try {
      // Firestore doesn't allow orderBy createdAt without an index if no filter —
      // so fetch all and sort client-side to avoid index requirement.
      const snap = await getDocs(collection(db, 'users'));
      const all  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      all.sort((a, b) => {
        const at = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt ?? 0);
        const bt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt ?? 0);
        return bt - at; // descending
      });
      setUsers(all);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name  ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q)
    );
  });

  const thStyle = {
    padding: '10px 12px', background: '#F9FAFB', fontWeight: 700,
    fontSize: 12, color: '#6B7280', textAlign: 'left',
    borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: "'Inter', sans-serif" }}>
      <NavBar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '82px 20px 48px' }}>

        {/* Stats pills */}
        <StatsPills users={users} />

        {/* Main card */}
        <div style={{
          background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
          padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
              All Users
              <span style={{
                marginLeft: 8, fontSize: 12, fontWeight: 600,
                background: '#EDE9FE', color: '#7C3AED',
                borderRadius: 20, padding: '2px 8px',
              }}>{filtered.length}</span>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: '1px solid #D1D5DB', borderRadius: 7, padding: '7px 12px',
                fontSize: 13, outline: 'none', color: '#111827',
                minWidth: 220, background: '#fff',
              }}
            />
          </div>

          {/* Role change note */}
          <div style={{
            fontSize: 12, color: '#9CA3AF', marginBottom: 12,
            padding: '6px 10px', background: '#FFFBEB',
            borderRadius: 6, border: '1px solid #FDE68A',
          }}>
            ℹ️ Changing role takes effect on the user's next login.
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>Loading users…</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr>
                    {['Name', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#9CA3AF', fontSize: 13 }}>
                        No users match your search
                      </td>
                    </tr>
                  ) : (
                    filtered.map(u => (
                      <UserRow key={u.id} user={u} onRefresh={fetchUsers} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
