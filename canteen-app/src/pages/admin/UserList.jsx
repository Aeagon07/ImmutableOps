import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, LayoutDashboard, Utensils, LogOut, CheckCircle2, Trash2, Edit3, Shield, ChefHat, User } from 'lucide-react';

export default function UserList() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  async function handleRoleChange(id, newRole) {
    if (!window.confirm(`Change this user's role to ${newRole}?`)) return;
    try { await updateDoc(doc(db, 'users', id), { role: newRole }); } catch (e) { console.error(e); }
  }

  async function handleDelete(id) {
    if (!window.confirm('WARNING: Deleting this user record does not delete their Firebase Auth account. Proceed?')) return;
    try { await deleteDoc(doc(db, 'users', id)); } catch (e) { console.error(e); }
  }

  const roleStats = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    acc.total++;
    return acc;
  }, { admin: 0, chef: 0, student: 0, total: 0 });

  const filteredUsers = users.filter(u => roleFilter === 'all' || u.role === roleFilter);

  const getRoleIcon = (role) => {
    if (role === 'admin') return <Shield size={16} color="#7C3AED" />;
    if (role === 'chef') return <ChefHat size={16} color="#BA7517" />;
    return <User size={16} color="#FC8019" />;
  };

  const getRoleBadgeColor = (role) => {
    if (role === 'admin') return { bg: '#EDE9FE', color: '#7C3AED' };
    if (role === 'chef') return { bg: '#FAEEDA', color: '#854F0B' };
    return { bg: '#FFF0E5', color: '#111827' };
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ ...statCardStyle, borderTop: '4px solid #374151' }}>
            <div style={statTitleStyle}>Total Registered</div>
            <div style={statValStyle}>{roleStats.total}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ ...statCardStyle, borderTop: '4px solid #FC8019' }}>
            <div style={{ ...statTitleStyle, color: '#FC8019' }}>Students</div>
            <div style={statValStyle}>{roleStats.student}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ ...statCardStyle, borderTop: '4px solid #BA7517' }}>
            <div style={{ ...statTitleStyle, color: '#BA7517' }}>Chefs & Kitchen</div>
            <div style={statValStyle}>{roleStats.chef}</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ ...statCardStyle, borderTop: '4px solid #7C3AED' }}>
            <div style={{ ...statTitleStyle, color: '#7C3AED' }}>Administrators</div>
            <div style={statValStyle}>{roleStats.admin}</div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#111827' }}>Access Control List</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F9FAFB', padding: '4px 12px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ padding: '8px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600, color: '#374151', outline: 'none', cursor: 'pointer' }}>
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="chef">Chefs</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#6B7280' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}>Name / Email</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}>Role</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}>Member Since</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px', textAlign: 'center' }}>Manage Role</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: '40px 0', textAlign: 'center', color: '#9CA3AF', fontWeight: 500 }}>No users found for this role.</td></tr>
                ) : filteredUsers.map(u => {
                  const date = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt || 0);
                  const colors = getRoleBadgeColor(u.role);
                  return (
                    <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key={u.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: '15px' }}>{u.name || 'Unnamed User'}</div>
                        <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: colors.bg, color: colors.color, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                          {getRoleIcon(u.role)} {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#4B5563', fontSize: '13px', fontFamily: "'Courier New', monospace" }}>
                        {date.toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB', padding: '2px' }}>
                          <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} style={{ padding: '8px 12px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600, color: '#374151', outline: 'none', cursor: 'pointer' }}>
                            <option value="student">Student</option>
                            <option value="chef">Chef</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(u.id)} style={{ background: '#FCEBEB', border: 'none', color: '#A32D2D', width: '38px', height: '38px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={16} strokeWidth={2.5} />
                        </motion.button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>

      </main>
    </div>
  );
}

const navLinkStyle = { background: '#F3F4F6', color: '#374151', border: 'none', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const statCardStyle = { background: '#FFFFFF', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #E5E7EB' };
const statTitleStyle = { fontSize: '13px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '8px' };
const statValStyle = { fontSize: '32px', fontWeight: 800, color: '#111827' };
