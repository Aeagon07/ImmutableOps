import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import CountdownTimer from '../../components/CountdownTimer';
import StatusBadge from '../../components/StatusBadge';

// ─── Keyframes (injected once) ────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes readyPulse {
    0%   { box-shadow: 0 0 0 0   rgba(29,158,117,0.55); }
    70%  { box-shadow: 0 0 0 12px rgba(29,158,117,0);    }
    100% { box-shadow: 0 0 0 0   rgba(29,158,117,0);     }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
`;

// ─── Progress stepper ─────────────────────────────────────────────────────────
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
          <div
            key={step}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: isLast ? '0 0 auto' : 1,
              position: 'relative',
            }}
          >
            {idx > 0 && (
              <div style={{ position: 'absolute', top: '13px', right: '50%', left: '-50%', height: '2px', background: lineColor, transition: 'background 0.4s ease', zIndex: 0 }} />
            )}
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: circleBg, border: isCurrent ? '2px solid #1D9E75' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, transition: 'background 0.4s ease', boxShadow: isCurrent ? '0 0 0 4px rgba(29,158,117,0.15)' : 'none', flexShrink: 0 }}>
              {isDone ? (
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>✓</span>
              ) : isCurrent ? (
                <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>●</span>
              ) : null}
            </div>
            <span style={{ fontSize: '11px', padding: '6px 0', fontWeight: isCurrent ? 600 : 500, color: isCurrent ? '#111827' : isUpcoming ? '#6B7280' : '#374151', textAlign: 'center', whiteSpace: 'nowrap' }}>
              {STEP_LABELS[idx]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Single Order Card ────────────────────────────────────────────────────────
function OrderCard({ order }) {
  const itemsSummary = (order.items || []).map(i => `${i.qty}x ${i.name}`).join(', ');

  return (
    <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', animation: 'fadeIn 0.3s ease', marginBottom: '10px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', fontFamily: "'Courier New', monospace" }}>
          Order #{order.id.slice(0, 6).toUpperCase()}
        </span>
        <StatusBadge status={order.priority} />
      </div>

      <div style={{ fontSize: '13px', color: '#374151', marginBottom: '10px', lineHeight: 1.6 }}>
        {itemsSummary || '—'}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '13px', color: '#6B7280' }}>
          Pickup: <strong style={{ color: '#111827', fontFamily: "'Courier New', monospace" }}>{order.pickupTimeDisplay || '—'}</strong>
        </span>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#1D9E75', fontFamily: "'Courier New', monospace" }}>
          ₹{order.totalPrice}
        </span>
      </div>

      {order.status === 'preparing' && order.pickupTime && (
        <div style={{ marginTop: '10px', marginBottom: '10px' }}>
          <CountdownTimer pickupTimeISO={order.pickupTime} status={order.status} />
        </div>
      )}

      <StatusStepper status={order.status} />

      {order.startDisplay && (
        <div style={{ background: '#E1F5EE', border: '1px solid #5DCAA5', borderRadius: '8px', padding: '10px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#085041' }}>
            🤖 Prep starts at: <span style={{ fontFamily: "'Courier New', monospace" }}>{order.startDisplay}</span>
            {order.prepEstimate && <span style={{ color: '#6B7280', fontWeight: 400, marginLeft: '6px', fontSize: '11px' }}>(~{order.prepEstimate} min)</span>}
          </div>
          {order.aiReason && <div style={{ fontSize: '11px', color: '#085041', fontStyle: 'italic', letterSpacing: '0.02em', marginTop: '2px' }}>{order.aiReason}</div>}
        </div>
      )}

      {order.delayFlag === true && (
        <div style={{ background: '#FAEEDA', border: '1px solid #BA7517', borderRadius: '8px', padding: '10px', marginTop: '10px', fontSize: '13px', fontWeight: 500, color: '#854F0B' }}>
          ⚠ Your order is running slightly late.
        </div>
      )}

      {order.status === 'ready' && (
        <div style={{ background: '#E1F5EE', border: '1.5px solid #1D9E75', borderRadius: '8px', padding: '12px', marginTop: '14px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#085041', animation: 'readyPulse 1.5s ease-out infinite' }}>
          🎉 Ready for pickup! Go to counter.
        </div>
      )}
    </div>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────
function NavBar({ user, onLogout }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100, height: '52px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <span style={{ fontSize: '16px', fontWeight: 700, color: '#1D9E75' }}>🍽 CaféSync</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: '#111827', fontWeight: 500 }}>{user?.name || 'Student'}</span>
        <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A32D2D', fontSize: '13px', fontWeight: 500, padding: '4px 8px', transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.88'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          Logout
        </button>
      </div>
    </header>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderTrack() {
  const { user, logout } = useAuth();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const styleId = 'cafesync-track-kf';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'orders'),
      where('studentId', '==', user.uid),
      where('status', 'in', ['queued', 'preparing', 'ready'])
    );

    const unsubscribe = onSnapshot(
      q,
      snap => {
        const docs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const at = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt ?? 0);
            const bt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt ?? 0);
            return bt - at;
          });
        setOrders(docs);
        setLoading(false);
      },
      err => {
        console.error('OrderTrack snapshot error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const NoOrders = () => (
    <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '40px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🍽</div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>No active orders</div>
      <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px', lineHeight: 1.6 }}>Place an order from the menu and track it here in real time.</div>
      <Link to="/student/menu" style={{ display: 'inline-block', background: '#1D9E75', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontWeight: 500, fontSize: '13px', textDecoration: 'none' }}>
        Browse Menu →
      </Link>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F6', paddingBottom: '80px' }}>
      <NavBar user={user} onLogout={() => logout().catch(e=>console.error(e))} />
      
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>Track My Orders</h1>
        <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>Live updates · refreshes automatically 🔄</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7280', fontSize: '13px' }}>Loading orders...</div>
        ) : orders.length === 0 ? (
          <NoOrders />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {orders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </main>
    </div>
  );
}
