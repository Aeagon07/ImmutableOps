import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import CountdownTimer from '../../components/CountdownTimer';

// ─── Constants ────────────────────────────────────────────────────────────────
const GREEN    = '#1D9E75';
const BORDER   = '#E5E7EB';
const GRAY     = '#6B7280';
const DARK_RED = '#A32D2D';

const STATUS_STEPS = ['queued', 'preparing', 'ready', 'done'];
const STEP_LABELS  = ['Queued', 'Preparing', 'Ready', 'Done'];

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

// ─── Priority badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const cfg = {
    urgent: { bg: '#FEE2E2', color: '#991B1B', label: '🔴 Urgent' },
    high:   { bg: '#FEF3C7', color: '#92400E', label: '🟠 High'   },
    normal: { bg: '#D1FAE5', color: '#065F46', label: '🟢 Normal' },
  };
  const { bg, color, label } = cfg[priority] ?? cfg.normal;
  return (
    <span
      style={{
        background:   bg,
        color,
        fontSize:     11,
        fontWeight:   700,
        padding:      '3px 10px',
        borderRadius: 20,
        whiteSpace:   'nowrap',
      }}
    >
      {label}
    </span>
  );
}

// ─── Progress stepper ─────────────────────────────────────────────────────────
function StatusStepper({ status }) {
  const currentIdx = STATUS_STEPS.indexOf(status);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', margin: '16px 0 4px' }}>
      {STATUS_STEPS.map((step, idx) => {
        const isDone    = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isUpcoming = idx > currentIdx;
        const isLast    = idx === STATUS_STEPS.length - 1;

        const circleBg = (isDone || isCurrent) ? GREEN : '#E5E7EB';
        const lineColor = isDone ? GREEN : '#E5E7EB';

        return (
          <div
            key={step}
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              flex:           isLast ? '0 0 auto' : 1,
              position:       'relative',
            }}
          >
            {/* Connecting line (before the circle, hidden for first node) */}
            {idx > 0 && (
              <div
                style={{
                  position:   'absolute',
                  top:        13,
                  right:      '50%',
                  left:       '-50%',
                  height:     3,
                  background: lineColor,
                  transition: 'background 0.4s ease',
                  zIndex:     0,
                }}
              />
            )}

            {/* Circle */}
            <div
              style={{
                width:          28,
                height:         28,
                borderRadius:   '50%',
                background:     circleBg,
                border:         isCurrent ? `2px solid ${GREEN}` : '2px solid transparent',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                position:       'relative',
                zIndex:         1,
                transition:     'background 0.4s ease',
                boxShadow:      isCurrent ? `0 0 0 4px rgba(29,158,117,0.15)` : 'none',
                flexShrink:     0,
              }}
            >
              {isDone ? (
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>
              ) : isCurrent ? (
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>●</span>
              ) : (
                <span style={{ color: '#9CA3AF', fontSize: 11 }}>○</span>
              )}
            </div>

            {/* Label */}
            <span
              style={{
                fontSize:   10,
                marginTop:  5,
                fontWeight: isCurrent ? 700 : 500,
                color:      isCurrent ? GREEN : isUpcoming ? '#9CA3AF' : '#374151',
                textAlign:  'center',
                whiteSpace: 'nowrap',
              }}
            >
              {STEP_LABELS[idx]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── AI Schedule Box ──────────────────────────────────────────────────────────
function AIScheduleBox({ startDisplay, aiReason, prepEstimate }) {
  return (
    <div
      style={{
        background:   '#E1F5EE',
        border:       '1px solid #5DCAA5',
        borderRadius: 10,
        padding:      '10px 12px',
        marginTop:    12,
        display:      'flex',
        flexDirection:'column',
        gap:          4,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: '#155e45' }}>
        🤖 Prep starts at: <span style={{ fontFamily: 'monospace' }}>{startDisplay}</span>
        {prepEstimate && (
          <span style={{ color: GRAY, fontWeight: 400, marginLeft: 6, fontSize: 12 }}>
            (~{prepEstimate} min)
          </span>
        )}
      </div>
      {aiReason && (
        <div style={{ fontSize: 12, color: GRAY, fontStyle: 'italic' }}>
          {aiReason}
        </div>
      )}
    </div>
  );
}

// ─── Delay Flag Banner ────────────────────────────────────────────────────────
function DelayBanner() {
  return (
    <div
      style={{
        background:   '#FAEEDA',
        border:       '1px solid #BA7517',
        borderRadius: 8,
        padding:      10,
        marginTop:    12,
        fontSize:     13,
        fontWeight:   500,
        color:        '#7C4A08',
        display:      'flex',
        alignItems:   'center',
        gap:          8,
      }}
    >
      ⚠ Your order is running slightly late. Updated time will reflect soon.
    </div>
  );
}

// ─── Ready Banner ─────────────────────────────────────────────────────────────
function ReadyBanner() {
  return (
    <div
      style={{
        background:   '#D1FAE5',
        border:       `2px solid ${GREEN}`,
        borderRadius: 12,
        padding:      '14px 16px',
        marginTop:    14,
        textAlign:    'center',
        fontSize:     15,
        fontWeight:   700,
        color:        '#065F46',
        animation:    'readyPulse 1.5s ease-out infinite',
        letterSpacing:'0.1px',
      }}
    >
      🎉 Your order is ready! Go to counter now.
    </div>
  );
}

// ─── Single Order Card ────────────────────────────────────────────────────────
function OrderCard({ order }) {
  const itemsSummary = (order.items || [])
    .map(i => `${i.qty}x ${i.name}`)
    .join(', ');

  return (
    <div
      style={{
        background:   '#fff',
        borderRadius: 12,
        border:       `1px solid ${BORDER}`,
        padding:      '14px 16px',
        boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
        animation:    'fadeIn 0.3s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   8,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111', letterSpacing: '0.3px' }}>
          Order #{order.id.slice(0, 6).toUpperCase()}
        </span>
        <PriorityBadge priority={order.priority} />
      </div>

      {/* Items */}
      <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>
        {itemsSummary || '—'}
      </div>

      {/* Price + Pickup row */}
      <div
        style={{
          display:      'flex',
          justifyContent: 'space-between',
          alignItems:   'center',
          marginBottom: 2,
        }}
      >
        <span style={{ fontSize: 13, color: GRAY }}>
          🕐 Pickup: <strong style={{ color: '#111' }}>{order.pickupTimeDisplay || '—'}</strong>
        </span>
        <span
          style={{
            fontSize:   14,
            fontWeight: 700,
            color:      GREEN,
            fontFamily: 'monospace',
          }}
        >
          ₹{order.totalPrice}
        </span>
      </div>

      {/* Countdown (only when preparing) */}
      {order.status === 'preparing' && order.pickupTime && (
        <div style={{ marginTop: 10, marginBottom: 2 }}>
          <CountdownTimer pickupTimeISO={order.pickupTime} status={order.status} />
        </div>
      )}

      {/* Progress stepper */}
      <StatusStepper status={order.status} />

      {/* AI Schedule box */}
      {order.startDisplay && (
        <AIScheduleBox
          startDisplay={order.startDisplay}
          aiReason={order.aiReason}
          prepEstimate={order.prepEstimate}
        />
      )}

      {/* Delay warning */}
      {order.delayFlag === true && <DelayBanner />}

      {/* Ready banner */}
      {order.status === 'ready' && <ReadyBanner />}
    </div>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────
function NavBar({ user, onLogout }) {
  return (
    <header
      style={{
        position:     'sticky',
        top:          0,
        zIndex:       100,
        height:       52,
        background:   '#fff',
        borderBottom: `1px solid ${BORDER}`,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        padding:      '0 16px',
        boxShadow:    '0 1px 6px rgba(0,0,0,0.04)',
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>
        📋 My Orders
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
          {user?.name || 'Student'}
        </span>
        <button
          id="btn-logout"
          onClick={onLogout}
          style={{
            background:   'none',
            border:       'none',
            cursor:       'pointer',
            color:        DARK_RED,
            fontSize:     13,
            fontWeight:   600,
            padding:      '4px 8px',
            borderRadius: 6,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function NoOrders() {
  return (
    <div
      style={{
        background:   '#fff',
        borderRadius: 16,
        border:       `1px solid ${BORDER}`,
        padding:      '40px 24px',
        textAlign:    'center',
        boxShadow:    '0 1px 4px rgba(0,0,0,0.06)',
        animation:    'fadeIn 0.3s ease',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>🍽</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 6 }}>
        No active orders
      </div>
      <div style={{ fontSize: 13, color: GRAY, marginBottom: 20 }}>
        Place an order from the menu and track it here in real time.
      </div>
      <Link
        to="/student/menu"
        style={{
          display:        'inline-block',
          background:     GREEN,
          color:          '#fff',
          borderRadius:   10,
          padding:        '10px 24px',
          fontWeight:     700,
          fontSize:       14,
          textDecoration: 'none',
          boxShadow:      '0 2px 8px rgba(29,158,117,0.3)',
        }}
      >
        Browse Menu →
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrderTrack() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Inject keyframes once ──────────────────────────────────────────────────
  useEffect(() => {
    const styleId = 'cafesync-track-kf';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []);

  // ── Real-time listener ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'orders'),
      where('studentId', '==', user.uid),
      where('status', 'in', ['queued', 'preparing', 'ready'])
      // NOTE: orderBy removed — Firestore 'in' queries with orderBy need
      // a composite index. We sort client-side instead to avoid index setup.
    );

    const unsubscribe = onSnapshot(
      q,
      snap => {
        const docs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            // Sort by createdAt descending (newest first)
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

  // ── Logout ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    try { await logout(); } catch (e) { console.error(e); }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight:  '100vh',
        background: '#F9FAFB',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <NavBar user={user} onLogout={handleLogout} />

      <main style={{ maxWidth: 520, margin: '0 auto', padding: '16px 14px 24px' }}>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 4 }}>
          Track My Orders
        </h1>
        <p style={{ fontSize: 13, color: GRAY, marginBottom: 18, marginTop: 0 }}>
          Live updates · refreshes automatically 🔄
        </p>

        {/* Loading spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: GRAY }}>
            <div
              style={{
                width:        36,
                height:       36,
                border:       `3px solid ${BORDER}`,
                borderTop:    `3px solid ${GREEN}`,
                borderRadius: '50%',
                margin:       '0 auto 12px',
                animation:    'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: 13 }}>Loading orders…</span>
          </div>
        )}

        {/* No orders */}
        {!loading && orders.length === 0 && <NoOrders />}

        {/* Order cards */}
        {!loading && orders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {orders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
