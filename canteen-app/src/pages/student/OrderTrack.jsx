import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import CountdownTimer from '../../components/CountdownTimer';
import StatusBadge from '../../components/StatusBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, LogOut, Utensils, AlertCircle, ShoppingBag, ArrowRight, Activity } from 'lucide-react';

const STATUS_STEPS = ['queued', 'preparing', 'ready', 'done'];
const STEP_LABELS  = ['Queued', 'Preparing', 'Ready', 'Done'];

function StatusStepper({ status }) {
  const currentIdx = STATUS_STEPS.indexOf(status);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', margin: '20px 0 10px' }}>
      {STATUS_STEPS.map((step, idx) => {
        const isDone    = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isUpcoming = idx > currentIdx;
        const isLast    = idx === STATUS_STEPS.length - 1;

        const circleBg = (isDone || isCurrent) ? '#1D9E75' : '#E5E7EB';
        const lineColor = isDone ? '#1D9E75' : '#E5E7EB';

        return (
          <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: isLast ? '0 0 auto' : 1, position: 'relative' }}>
            {idx > 0 && (
              <motion.div 
                layout 
                style={{ position: 'absolute', top: '13px', right: '50%', left: '-50%', height: '3px', borderRadius: '3px', background: lineColor, zIndex: 0 }} 
              />
            )}
            <motion.div 
              layout
              style={{ width: '28px', height: '28px', borderRadius: '50%', background: circleBg, border: isCurrent ? '3px solid #E1F5EE' : '3px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, boxShadow: isCurrent ? '0 0 0 2px #1D9E75' : 'none', flexShrink: 0 }}
            >
              <AnimatePresence mode="wait">
                {isDone ? (
                  <motion.div key="done" initial={{ scale: 0 }} animate={{ scale: 1 }}><Utensils size={14} color="#fff" strokeWidth={3} /></motion.div>
                ) : isCurrent ? (
                  <motion.div key="current" initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />
                ) : null}
              </AnimatePresence>
            </motion.div>
            <span style={{ fontSize: '11px', padding: '8px 0 0 0', fontWeight: isCurrent ? 700 : 600, color: isCurrent ? '#1D9E75' : isUpcoming ? '#9CA3AF' : '#111827', textAlign: 'center', whiteSpace: 'nowrap' }}>
              {STEP_LABELS[idx]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order }) {
  const itemsSummary = (order.items || []).map(i => `${i.qty}x ${i.name}`).join(', ');

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '16px', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827', fontFamily: "'Courier New', monospace" }}>
          ORDER #{order.id.slice(0, 6).toUpperCase()}
        </span>
        <StatusBadge status={order.priority} />
      </div>

      <div style={{ fontSize: '14px', color: '#374151', marginBottom: '12px', lineHeight: 1.6, fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <ShoppingBag size={16} color="#6B7280" style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>{itemsSummary || '—'}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '12px', background: '#F9FAFB', borderRadius: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Pickup Time</span>
          <strong style={{ color: '#111827', fontFamily: "'Courier New', monospace", fontSize: '14px' }}>{order.pickupTimeDisplay || '—'}</strong>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Total</span>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#1D9E75', fontFamily: "'Courier New', monospace" }}>₹{order.totalPrice}</span>
        </div>
      </div>

      <AnimatePresence>
        {order.status === 'preparing' && order.pickupTime && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginBottom: '16px' }}>
            <CountdownTimer pickupTimeISO={order.pickupTime} status={order.status} />
          </motion.div>
        )}
      </AnimatePresence>

      <StatusStepper status={order.status} />

      <AnimatePresence>
        {order.startDisplay && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ background: '#E1F5EE', border: '1px solid #5DCAA5', borderRadius: '12px', padding: '12px 16px', marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Coffee size={14} strokeWidth={3} /> Prep starts at: <span style={{ fontFamily: "'Courier New', monospace" }}>{order.startDisplay}</span>
              {order.prepEstimate && <span style={{ color: '#1D9E75', fontWeight: 600, marginLeft: '4px', fontSize: '11px' }}>(~{order.prepEstimate}m)</span>}
            </div>
            {order.aiReason && <div style={{ fontSize: '11px', color: '#111827', fontWeight: 500, width: '100%', opacity: 0.8 }}>{order.aiReason}</div>}
          </motion.div>
        )}

        {order.delayFlag === true && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ background: '#FAEEDA', border: '1px solid #FCD38A', borderRadius: '12px', padding: '12px 16px', marginTop: '12px', fontSize: '13px', fontWeight: 600, color: '#854F0B', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> ⚠ Kitchen is running slightly behind.
          </motion.div>
        )}

        {order.status === 'ready' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: [1, 1.02, 1], opacity: 1 }} transition={{ repeat: Infinity, duration: 2 }} style={{ background: '#1D9E75', borderRadius: '12px', padding: '14px', marginTop: '20px', textAlign: 'center', fontSize: '15px', fontWeight: 700, color: '#fff', boxShadow: '0 4px 12px rgba(29,158,117,0.3)' }}>
            🎉 Ready for pickup! Head to the counter.
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function OrderTrack() {
  const { user } = useAuth();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'orders'), where('studentId', '==', user.uid));
    const unsubscribe = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(o => ['queued', 'preparing', 'ready'].includes(o.status))
        .sort((a, b) => {
          const at = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt ?? 0);
          const bt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt ?? 0);
          return bt - at;
        });
      setOrders(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const NoOrders = () => (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px dashed #D1D5DB', padding: '64px 24px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
      <ShoppingBag size={56} color="#D1D5DB" style={{ marginBottom: '20px' }} />
      <div style={{ fontSize: '20px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>No active orders</div>
      <div style={{ fontSize: '15px', color: '#6B7280', marginBottom: '32px', fontWeight: 500 }}>Hungry? Place an order and track its journey here.</div>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Link to="/student/menu" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: '#1D9E75', color: '#fff', borderRadius: '12px', padding: '16px 32px', fontWeight: 700, fontSize: '15px', textDecoration: 'none', boxShadow: '0 8px 24px rgba(29,158,117,0.3)' }}>
          Browse Full Catalog <ArrowRight size={18} />
        </Link>
      </motion.div>
    </motion.div>
  );

  return (
    <div style={{ paddingBottom: '80px' }}>
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginBottom: '8px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity color="#1D9E75" size={28} /> Live Order Tracking
          </h1>
          <p style={{ fontSize: '15px', color: '#6B7280', marginBottom: '32px', fontWeight: 500 }}>Watch your food's journey from kitchen to counter 🔄</p>
        </motion.div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#6B7280', fontWeight: 600, fontSize: '18px' }}>Syncing kitchen status...</div>
        ) : orders.length === 0 ? (
          <NoOrders />
        ) : (
          <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
            <AnimatePresence mode="popLayout">
              {orders.map(order => <OrderCard key={order.id} order={order} />)}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}
