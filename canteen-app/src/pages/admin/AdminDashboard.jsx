import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, getDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, LogOut, Utensils, Users, TrendingUp, Filter, Trash2, Check, ShieldCheck, ServerCrash, ListOrdered } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [canteenSettings, setCanteenSettings] = useState({ isOpen: true, maxConcurrentOrders: 6 });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const ref = doc(db, 'settings', 'canteen');
    getDoc(ref).then(snap => { if (snap.exists()) setCanteenSettings(snap.data()); });
    const unsubS = onSnapshot(ref, snap => { if (snap.exists()) setCanteenSettings(snap.data()); });
    return () => unsubS();
  }, []);

  async function handleStatusUpdate(id, newStatus) {
    try { await updateDoc(doc(db, 'orders', id), { status: newStatus }); } catch (e) { console.error(e); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this order permanently?')) return;
    try { await deleteDoc(doc(db, 'orders', id)); } catch (e) { console.error(e); }
  }

  const today = new Date(); today.setHours(0,0,0,0);
  const todayOrders = orders.filter(o => {
    const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
    return d >= today;
  });

  const totalRevenue = todayOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const activeCount  = orders.filter(o => ['queued', 'preparing'].includes(o.status)).length;
  const doneCount    = todayOrders.filter(o => o.status === 'done').length;

  const filteredOrders = orders.filter(o => {
    if (filter === 'active') return ['queued', 'preparing'].includes(o.status);
    if (filter === 'ready') return o.status === 'ready';
    if (filter === 'done') return o.status === 'done';
    return true;
  });

  function getPeakHourData() {
    const hours = new Array(24).fill(0);
    todayOrders.forEach(o => {
      const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
      hours[d.getHours()]++;
    });
    const max = Math.max(...hours, 1);
    const chart = [];
    for (let i = 8; i <= 20; i++) chart.push({ hour: i, count: hours[i], pct: (hours[i] / max) * 100 });
    return chart;
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ background: '#EDE9FE', padding: '10px', borderRadius: '12px' }}><LayoutDashboard color="#7C3AED" size={24} strokeWidth={2.5} /></div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Command Center</h1>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: "Today's Orders", val: todayOrders.length, color: '#374151', icon: <ListOrdered color="#6B7280" /> },
            { label: "Today's Revenue", val: `₹${totalRevenue}`, color: '#FC8019', icon: <TrendingUp color="#FC8019" /> },
            { label: "Active in Kitchen", val: activeCount, color: '#BA7517', icon: <Utensils color="#BA7517" /> },
            { label: "Completed Today", val: doneCount, color: '#7C3AED', icon: <Check color="#7C3AED" /> }
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{s.label}</div>
                <div style={{ padding: '8px', background: '#F9FAFB', borderRadius: '8px' }}>{s.icon}</div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: s.color, fontFamily: s.label.includes('Revenue') ? "'Courier New', monospace" : 'inherit' }}>{s.val}</div>
            </motion.div>
          ))}
        </div>

        <style>{`
          .responsive-grid { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
          @media (max-width: 1000px) { .responsive-grid { grid-template-columns: minmax(0, 1fr); } }
        `}</style>
        
        <div className="responsive-grid" style={{ display: 'grid', gap: '24px', alignItems: 'start' }}>
          
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LayoutDashboard size={20} color="#111827" />
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#111827' }}>Order Stream</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F9FAFB', padding: '4px 12px', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                <Filter size={16} color="#6B7280" />
                <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '8px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600, color: '#374151', outline: 'none', cursor: 'pointer' }}>
                  <option value="all">All Orders</option>
                  <option value="active">Active (Queued/Prep)</option>
                  <option value="ready">Ready to Pickup</option>
                  <option value="done">Completed</option>
                </select>
              </div>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E7EB', color: '#6B7280' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}>ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}>Student</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}>Items</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}>Total</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '40px 0', textAlign: 'center', color: '#9CA3AF', fontWeight: 500 }}>No orders match this filter.</td></tr>
                  ) : filteredOrders.map(o => (
                    <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key={o.id} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px 16px', fontFamily: "'Courier New', monospace", color: '#6B7280', fontWeight: 600 }}>{o.id.slice(0, 5).toUpperCase()}</td>
                      <td style={{ padding: '16px 16px', fontWeight: 600, color: '#111827' }}>{o.studentName || 'Student'}</td>
                      <td style={{ padding: '16px 16px', color: '#4B5563', fontWeight: 500 }}>{(o.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}</td>
                      <td style={{ padding: '16px 16px', fontFamily: "'Courier New', monospace", color: '#FC8019', fontWeight: 800 }}>₹{o.totalPrice}</td>
                      <td style={{ padding: '16px 16px' }}><StatusBadge status={o.status} /></td>
                      <td style={{ padding: '16px 16px', display: 'flex', gap: '8px' }}>
                        {o.status !== 'done' && (
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleStatusUpdate(o.id, 'done')} style={{ background: '#FFF0E5', border: 'none', color: '#FC8019', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={16} strokeWidth={3} /></motion.button>
                        )}
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(o.id)} style={{ background: '#FCEBEB', border: 'none', color: '#A32D2D', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} strokeWidth={2.5} /></motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
             
             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
               <h2 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}><ServerCrash size={18} /> System Config</h2>
               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                 <span style={{ color: '#4B5563', fontWeight: 600, fontSize: '14px' }}>Canteen Portals</span>
                 <span style={{ fontWeight: 800, fontSize: '14px', color: canteenSettings.isOpen ? '#FC8019' : '#A32D2D', background: canteenSettings.isOpen ? '#FFF0E5' : '#FCEBEB', padding: '4px 12px', borderRadius: '20px' }}>
                   {canteenSettings.isOpen ? 'ONLINE' : 'OFFLINE'}
                 </span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                 <span style={{ color: '#4B5563', fontWeight: 600, fontSize: '14px' }}>Traffic Limit</span>
                 <span style={{ fontWeight: 800, fontSize: '14px', color: '#111827' }}>{canteenSettings.maxConcurrentOrders} max capacity</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                 <span style={{ color: '#4B5563', fontWeight: 600, fontSize: '14px' }}>AI Optimizer</span>
                 <span style={{ fontWeight: 800, fontSize: '14px', color: '#7C3AED', background: '#EDE9FE', padding: '4px 12px', borderRadius: '20px' }}>ACTIVE</span>
               </div>
             </motion.div>

             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
               <h2 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={18} /> Daily Distribution</h2>
               <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px', borderBottom: '2px solid #E5E7EB', paddingBottom: '4px', marginBottom: '8px' }}>
                 {getPeakHourData().map(d => (
                   <motion.div key={d.hour} initial={{ height: 0 }} animate={{ height: '100%' }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                     <div style={{ width: '100%', background: 'linear-gradient(to top, #7C3AED, #A78BFA)', height: `${d.pct}%`, borderRadius: '4px 4px 0 0', opacity: d.pct > 75 ? 1 : 0.4, transition: 'height 0.5s ease' }} />
                   </motion.div>
                 ))}
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#9CA3AF' }}>
                 <span>8am</span>
                 <span>2pm</span>
                 <span>8pm</span>
               </div>
             </motion.div>

          </div>
        </div>
      </main>
    </div>
  );
}
