import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, getDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [canteenSettings, setCanteenSettings] = useState({ isOpen: true, maxConcurrentOrders: 6 });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const ref = doc(db, 'settings', 'canteen');
    getDoc(ref).then(snap => {
      if (snap.exists()) setCanteenSettings(snap.data());
    });
    const unsubS = onSnapshot(ref, snap => {
      if (snap.exists()) setCanteenSettings(snap.data());
    });
    return () => unsubS();
  }, []);

  async function handleStatusUpdate(id, newStatus) {
    try {
      await updateDoc(doc(db, 'orders', id), { status: newStatus });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this order permanently?')) return;
    try {
      await deleteDoc(doc(db, 'orders', id));
    } catch (e) {
      console.error(e);
    }
  }

  const today = new Date();
  today.setHours(0,0,0,0);
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
    for (let i = 8; i <= 20; i++) {
        chart.push({ hour: i, count: hours[i], pct: (hours[i] / max) * 100 });
    }
    return chart;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F6', paddingBottom: '80px' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, height: '52px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#1D9E75' }}>🍽 CaféSync <span style={{ color: '#7C3AED', marginLeft: '6px' }}>Admin</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/admin/menu')} style={navLinkStyle}>Menu</button>
          <button onClick={() => navigate('/admin/users')} style={navLinkStyle}>Users</button>
          <button onClick={logout} style={{ ...navLinkStyle, color: '#A32D2D' }}>Logout</button>
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px 16px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Today's Orders</div>
            <div style={statValueStyle}>{todayOrders.length}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Today's Revenue</div>
            <div style={{ ...statValueStyle, color: '#1D9E75' }}>₹{totalRevenue}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Active in Kitchen</div>
            <div style={{ ...statValueStyle, color: '#BA7517' }}>{activeCount}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Completed Today</div>
            <div style={statValueStyle}>{doneCount}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '20px', alignItems: 'start' }}>
          
          {/* Main Table */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>Order Management</h2>
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                style={{ padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', color: '#374151', outline: 'none' }}
              >
                <option value="all">All Orders</option>
                <option value="active">Active (Queued/Prep)</option>
                <option value="ready">Ready to Pickup</option>
                <option value="done">Completed</option>
              </select>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Student</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Items</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Total</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '8px 4px', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '24px 0', textAlign: 'center', color: '#6B7280' }}>No orders found.</td></tr>
                ) : filteredOrders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 4px', fontFamily: "'Courier New', monospace", color: '#6B7280' }}>
                      {o.id.slice(0, 5).toUpperCase()}
                    </td>
                    <td style={{ padding: '10px 4px', fontWeight: 500, color: '#111827' }}>{o.studentName || 'Student'}</td>
                    <td style={{ padding: '10px 4px', color: '#374151' }}>
                      {(o.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}
                    </td>
                    <td style={{ padding: '10px 4px', fontFamily: "'Courier New', monospace", color: '#1D9E75', fontWeight: 600 }}>₹{o.totalPrice}</td>
                    <td style={{ padding: '10px 4px' }}><StatusBadge status={o.status} /></td>
                    <td style={{ padding: '10px 4px' }}>
                      {o.status !== 'done' && (
                        <button onClick={() => handleStatusUpdate(o.id, 'done')} style={{ ...actionBtnStyle, color: '#1D9E75' }}>Done</button>
                      )}
                      <button onClick={() => handleDelete(o.id)} style={{ ...actionBtnStyle, color: '#A32D2D', marginLeft: '8px' }}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             
             {/* System Status */}
             <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
               <h2 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 600, color: '#111827' }}>System Status</h2>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                 <span style={{ color: '#6B7280' }}>Canteen Status:</span>
                 <span style={{ fontWeight: 600, color: canteenSettings.isOpen ? '#1D9E75' : '#A32D2D' }}>
                   {canteenSettings.isOpen ? 'Open' : 'Closed'}
                 </span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                 <span style={{ color: '#6B7280' }}>Kitchen Capacity:</span>
                 <span style={{ fontWeight: 600, color: '#111827' }}>{canteenSettings.maxConcurrentOrders} active max</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                 <span style={{ color: '#6B7280' }}>AI Integration:</span>
                 <span style={{ fontWeight: 600, color: '#7C3AED' }}>Active</span>
               </div>
             </div>

             {/* Peak Hours Sparkline */}
             <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
               <h2 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 600, color: '#111827' }}>Today's Peak Hours</h2>
               <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px', borderBottom: '1px solid #E5E7EB', paddingBottom: '4px', marginBottom: '6px' }}>
                 {getPeakHourData().map(d => (
                   <div key={d.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                     <div style={{ width: '100%', background: '#7C3AED', height: `${d.pct}%`, borderRadius: '2px 2px 0 0', opacity: d.pct > 75 ? 1 : 0.4 }} />
                   </div>
                 ))}
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280' }}>
                 <span>8am</span>
                 <span>2pm</span>
                 <span>8pm</span>
               </div>
             </div>

          </div>
        </div>
      </main>
    </div>
  );
}

const navLinkStyle = { background: 'none', border: 'none', color: '#374151', fontWeight: 500, fontSize: '13px', cursor: 'pointer', padding: 0 };
const statCardStyle = { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
const statLabelStyle = { fontSize: '11px', color: '#6B7280', letterSpacing: '0.02em', fontWeight: 600, marginBottom: '4px' };
const statValueStyle = { fontSize: '20px', fontWeight: 600, color: '#111827' };
const actionBtnStyle = { background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' };
