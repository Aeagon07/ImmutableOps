import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

export default function UserList() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  
  const [editRoleMap, setEditRoleMap] = useState({});

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  async function applyRoleUpdate(uid) {
    const newRole = editRoleMap[uid];
    if (!newRole) return;
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setEditRoleMap(prev => { 
        const n = {...prev}; 
        delete n[uid]; 
        return n; 
      });
    } catch (e) {
      console.error(e);
    }
  }

  const filtered = users.filter(u => 
    (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    student: users.filter(u => u.role === 'student').length,
    chef: users.filter(u => u.role === 'chef').length,
    admin: users.filter(u => u.role === 'admin').length,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F6', paddingBottom: '80px' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, height: '52px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#1D9E75' }}>🍽 CaféSync <span style={{ color: '#7C3AED', marginLeft: '6px' }}>Admin</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/admin/dashboard')} style={navLinkStyle}>Dashboard</button>
          <button onClick={() => navigate('/admin/menu')} style={navLinkStyle}>Menu</button>
          <button onClick={logout} style={{ ...navLinkStyle, color: '#A32D2D' }}>Logout</button>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px' }}>
        
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>User Management</h1>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ ...statCardStyle, borderTop: '3px solid #6B7280' }}>Total<br/><span style={statValueStyle}>{stats.total}</span></div>
          <div style={{ ...statCardStyle, borderTop: '3px solid #1D9E75' }}>Students<br/><span style={statValueStyle}>{stats.student}</span></div>
          <div style={{ ...statCardStyle, borderTop: '3px solid #BA7517' }}>Chefs<br/><span style={statValueStyle}>{stats.chef}</span></div>
          <div style={{ ...statCardStyle, borderTop: '3px solid #7C3AED' }}>Admins<br/><span style={statValueStyle}>{stats.admin}</span></div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: '16px' }}>
            <input 
              type="text" 
              placeholder="Search users by name or email..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Current Role</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Update Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 4px', fontWeight: 500, color: '#111827' }}>{u.name || '—'}</td>
                    <td style={{ padding: '10px 4px', color: '#374151' }}>{u.email}</td>
                    <td style={{ padding: '10px 4px' }}>
                      <span style={{ 
                        background: u.role === 'admin' ? '#EDE9FE' : u.role === 'chef' ? '#FAEEDA' : '#E1F5EE',
                        color: u.role === 'admin' ? '#5B21B6' : u.role === 'chef' ? '#854F0B' : '#085041',
                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600
                      }}>
                        {u.role?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                          value={editRoleMap[u.id] || u.role}
                          onChange={e => setEditRoleMap({...editRoleMap, [u.id]: e.target.value})}
                          style={{ padding: '4px 8px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                        >
                          <option value="student">Student</option>
                          <option value="chef">Chef</option>
                          <option value="admin">Admin</option>
                        </select>
                        {(editRoleMap[u.id] && editRoleMap[u.id] !== u.role) && (
                           <button 
                             onClick={() => applyRoleUpdate(u.id)}
                             style={{ background: '#7C3AED', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                           >
                             Update
                           </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan="4" style={{ padding: '24px 0', textAlign: 'center', color: '#6B7280' }}>No users match your criteria.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}

const navLinkStyle = { background: 'none', border: 'none', color: '#374151', fontWeight: 500, fontSize: '13px', cursor: 'pointer', padding: 0 };
const statCardStyle = { flex: 1, minWidth: '120px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', fontSize: '11px', color: '#6B7280', letterSpacing: '0.02em', fontWeight: 600 };
const statValueStyle = { fontSize: '20px', fontWeight: 600, color: '#111827', display: 'block', marginTop: '4px', letterSpacing: '0' };
