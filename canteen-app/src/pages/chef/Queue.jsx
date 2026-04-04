import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, BarChart3, Settings, LogOut, Check, Play, Edit3, X, User } from 'lucide-react';

function formatTime(val) {
  if (!val) return '—';
  const date = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(date)) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function sortOrders(orders) {
  return [...orders].sort((a, b) => {
    const aOver = a.manualPriorityOverride === true ? 0 : 1;
    const bOver = b.manualPriorityOverride === true ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    const aTime = a.scheduledStart?.toDate ? a.scheduledStart.toDate() : new Date(a.scheduledStart ?? 0);
    const bTime = b.scheduledStart?.toDate ? b.scheduledStart.toDate() : new Date(b.scheduledStart ?? 0);
    return aTime - bTime;
  });
}

function ActionButton({ label, type = 'primary', icon: Icon, onClick, disabled }) {
  let baseStyle = { borderRadius: '10px', padding: '10px 20px', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', width: '100%', justifyContent: 'center' };
  if (type === 'primary') Object.assign(baseStyle, { background: '#1D9E75', color: '#fff' });
  else if (type === 'secondary') Object.assign(baseStyle, { background: 'transparent', color: '#1D9E75', border: '2px solid #1D9E75' });
  else if (type === 'danger') Object.assign(baseStyle, { background: '#FCEBEB', color: '#A32D2D' });

  return (
    <motion.button whileHover={{ scale: disabled ? 1 : 1.02 }} whileTap={{ scale: disabled ? 1 : 0.98 }} onClick={onClick} disabled={disabled} style={{ ...baseStyle, opacity: disabled ? 0.5 : 1 }}>
      {Icon && <Icon size={16} strokeWidth={3} />} {label}
    </motion.button>
  );
}

function OverridePanel({ orderId, currentPriority }) {
  const [selected, setSelected] = useState(currentPriority ?? 'normal');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const priorities = ['normal', 'high', 'urgent'];

  async function applyOverride() {
    setSaving(true);
    try { await updateDoc(doc(db, 'orders', orderId), { priority: selected, manualPriorityOverride: true, overrideNote: note }); } 
    catch (e) { console.error(e); }
    setSaving(false);
  }
  async function clearOverride() {
    setSaving(true);
    try { await updateDoc(doc(db, 'orders', orderId), { manualPriorityOverride: false, overrideNote: '' }); } 
    catch (e) { console.error(e); }
    setSaving(false);
  }

  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ marginTop: '16px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {priorities.map(p => {
          const active = selected === p;
          return (
            <motion.label whileTap={{ scale: 0.95 }} key={p} style={{ cursor: 'pointer', flex: 1 }}>
              <input type="radio" value={p} checked={selected === p} onChange={() => setSelected(p)} style={{ display: 'none' }} />
              <div style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, border: active ? 'none' : '1px solid #E5E7EB', background: active ? '#1D9E75' : '#FFFFFF', color: active ? '#fff' : '#374151', transition: 'all 0.2s' }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </div>
            </motion.label>
          );
        })}
      </div>
      <input type="text" placeholder="Note for chef team" maxLength={100} value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', outline: 'none', marginBottom: '16px', fontWeight: 500 }} />
      <div style={{ display: 'flex', gap: '10px' }}>
        <ActionButton label="Apply Override" type="primary" icon={Check} onClick={applyOverride} disabled={saving} />
        <ActionButton label="Clear" type="danger" icon={X} onClick={clearOverride} disabled={saving} />
      </div>
    </motion.div>
  );
}

function OrderCard({ order, overrideOpenIds, setOverrideOpenIds }) {
  const [updating, setUpdating] = useState(false);
  const isOpen = overrideOpenIds.has(order.id);

  function toggleOverride() {
    setOverrideOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(order.id)) next.delete(order.id); else next.add(order.id);
      return next;
    });
  }

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '20px', marginBottom: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
      <motion.div layout="position" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 800, fontSize: '15px', color: '#111827', fontFamily: "'Courier New', monospace" }}>#{order.id.slice(0, 6).toUpperCase()}</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14}/> {order.studentName || 'Student'}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {order.manualPriorityOverride && <StatusBadge status="high" labelOverride="OVERRIDE" />}
          <StatusBadge status={order.priority || 'normal'} />
        </div>
      </motion.div>

      <motion.div layout="position" style={{ fontSize: '15px', color: '#111827', marginBottom: '16px', lineHeight: 1.6, fontWeight: 500, padding: '12px', background: '#F9FAFB', borderRadius: '8px', border: '1px dashed #D1D5DB' }}>
        {order.items?.map(i => `${i.qty}x ${i.name}`).join(', ') || 'No items'}
      </motion.div>

      <motion.div layout="position" style={{ display: 'flex', justifyContent: 'space-between', background: '#E1F5EE', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#085041', textTransform: 'uppercase' }}>Expected Pickup</span>
          <span style={{ fontSize: '14px', fontFamily: "'Courier New', monospace", fontWeight: 700, color: '#1D9E75' }}>{formatTime(order.pickupTime ?? order.scheduledStart)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#085041', textTransform: 'uppercase' }}>Start Prep</span>
          <span style={{ fontSize: '14px', fontFamily: "'Courier New', monospace", fontWeight: 700, color: '#1D9E75' }}>{formatTime(order.startPrepAt ?? order.scheduledStart)}</span>
        </div>
      </motion.div>

      <motion.div layout="position" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          {order.status === 'queued' && <ActionButton label="Start Preparing" type="primary" icon={Play} disabled={updating} onClick={() => { setUpdating(true); updateDoc(doc(db, 'orders', order.id), { status: 'preparing' }).finally(() => setUpdating(false)); }} />}
          {order.status === 'preparing' && <ActionButton label="Mark Ready" type="secondary" icon={Check} disabled={updating} onClick={() => { setUpdating(true); updateDoc(doc(db, 'orders', order.id), { status: 'ready' }).finally(() => setUpdating(false)); }} />}
        </div>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleOverride} style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #E5E7EB', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}>
          <Edit3 size={18} />
        </motion.button>
      </motion.div>

      <AnimatePresence>{isOpen && <OverridePanel orderId={order.id} currentPriority={order.priority} />}</AnimatePresence>
    </motion.div>
  );
}

export default function Queue() {
  const [orders, setOrders] = useState([]);
  const [overrideOpenIds, setOverrideOpenIds] = useState(new Set());
  const [pulseActive, setPulseActive] = useState(false);
  const prevCountRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', 'in', ['queued', 'preparing']));
    const unsubscribe = onSnapshot(q, snapshot => {
      const sorted = sortOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setOrders(sorted);
      if (prevCountRef.current !== null && sorted.length > prevCountRef.current) {
        setPulseActive(true); setTimeout(() => setPulseActive(false), 1000);
      }
      prevCountRef.current = sorted.length;
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ paddingBottom: '80px' }}>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ChefHat color="#1D9E75" size={32} /> Active Queue
            <motion.div animate={{ scale: pulseActive ? [1, 1.5, 1] : 1, backgroundColor: pulseActive ? ['#A32D2D', '#1D9E75'] : '#1D9E75' }} transition={{ duration: 0.5 }} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1D9E75', marginLeft: '4px' }} />
          </h1>
          <div style={{ background: '#111827', color: '#fff', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 700 }}>
            {orders.length} Active Orders
          </div>
        </div>

        <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          <AnimatePresence mode="popLayout">
            {orders.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#6B7280', padding: '64px', background: '#FFFFFF', borderRadius: '16px', border: '2px dashed #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <Check size={56} color="#D1D5DB" style={{ marginBottom: '16px' }} />
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827' }}>Kitchen is clear</div>
                <div style={{ fontSize: '15px', fontWeight: 500, marginTop: '8px' }}>Waiting for new orders...</div>
              </motion.div>
            ) : (
              orders.map(order => <OrderCard key={order.id} order={order} overrideOpenIds={overrideOpenIds} setOverrideOpenIds={setOverrideOpenIds} />)
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}
