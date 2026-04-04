import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(val) {
  if (!val) return '—';
  // Handle Firestore Timestamp
  const date = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(date)) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function priorityOrder(p) {
  if (p === 'urgent') return 0;
  if (p === 'high')   return 1;
  return 2; // normal / undefined
}

function sortOrders(orders) {
  return [...orders].sort((a, b) => {
    // manualPriorityOverride=true first
    const aOver = a.manualPriorityOverride === true ? 0 : 1;
    const bOver = b.manualPriorityOverride === true ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;

    // Then scheduledStart ascending
    const aTime = a.scheduledStart?.toDate ? a.scheduledStart.toDate() : new Date(a.scheduledStart ?? 0);
    const bTime = b.scheduledStart?.toDate ? b.scheduledStart.toDate() : new Date(b.scheduledStart ?? 0);
    return aTime - bTime;
  });
}

function buildItemsString(items) {
  if (!items || items.length === 0) return 'No items';
  return items.map(i => `${i.qty ?? i.quantity ?? 1}x ${i.name}`).join(', ');
}

// ─── Priority Badge ────────────────────────────────────────────────────────────

function PriorityBadge({ priority, manualPriorityOverride }) {
  const cfg = {
    urgent: { color: '#A32D2D', bg: '#FCEBEB', label: 'URGENT' },
    high:   { color: '#BA7517', bg: '#FAEEDA', label: 'HIGH'   },
    normal: { color: '#1D9E75', bg: '#E1F5EE', label: 'NORMAL' },
  };
  const { color, bg, label } = cfg[priority] ?? cfg.normal;

  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           6,
      background:    bg,
      color,
      border:        `1px solid ${color}33`,
      borderRadius:  20,
      padding:       '3px 10px',
      fontSize:      12,
      fontWeight:    700,
      letterSpacing: 0.5,
    }}>
      {label}
      {manualPriorityOverride && (
        <span style={{ color: '#BA7517', fontWeight: 600, fontSize: 11 }}>✎ OVERRIDE</span>
      )}
    </span>
  );
}

// ─── Action Button ─────────────────────────────────────────────────────────────

function ActionButton({ label, color, bg, onClick, disabled }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:   hover ? color : bg,
        color:        hover ? '#fff' : color,
        border:       `2px solid ${color}`,
        borderRadius: 8,
        padding:      '9px 20px',
        fontWeight:   700,
        fontSize:     14,
        cursor:       disabled ? 'not-allowed' : 'pointer',
        transition:   'all 0.18s',
        opacity:      disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

// ─── Override Panel ────────────────────────────────────────────────────────────

function OverridePanel({ orderId, currentPriority }) {
  const [selected, setSelected] = useState(currentPriority ?? 'normal');
  const [note,     setNote]     = useState('');
  const [saving,   setSaving]   = useState(false);

  const priorities = ['normal', 'high', 'urgent'];

  const badgeColors = {
    normal: { color: '#1D9E75', bg: '#E1F5EE' },
    high:   { color: '#BA7517', bg: '#FAEEDA' },
    urgent: { color: '#A32D2D', bg: '#FCEBEB' },
  };

  async function applyOverride() {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        priority:               selected,
        manualPriorityOverride: true,
        overrideNote:           note,
      });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  async function clearOverride() {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        manualPriorityOverride: false,
        overrideNote:           '',
      });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  return (
    <div style={{
      marginTop:    12,
      background:   '#F9FAFB',
      border:       '1px solid #E5E7EB',
      borderRadius: 10,
      padding:      '12px 14px',
    }}>
      {/* Priority pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {priorities.map(p => {
          const { color, bg } = badgeColors[p];
          const active = selected === p;
          return (
            <label key={p} style={{ cursor: 'pointer' }}>
              <input
                type="radio"
                name={`priority-${orderId}`}
                value={p}
                checked={selected === p}
                onChange={() => setSelected(p)}
                style={{ display: 'none' }}
              />
              <span style={{
                display:      'inline-block',
                padding:      '5px 14px',
                borderRadius: 20,
                fontSize:     13,
                fontWeight:   600,
                border:       `2px solid ${color}`,
                background:   active ? color : '#fff',
                color:        active ? '#fff' : color,
                transition:   'all 0.15s',
              }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </span>
            </label>
          );
        })}
      </div>

      {/* Note input */}
      <input
        type="text"
        placeholder="Note for chef team"
        maxLength={100}
        value={note}
        onChange={e => setNote(e.target.value)}
        style={{
          width:        '100%',
          boxSizing:    'border-box',
          border:       '1px solid #D1D5DB',
          borderRadius: 7,
          padding:      '8px 10px',
          fontSize:     13,
          outline:      'none',
          marginBottom: 10,
        }}
      />

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={applyOverride}
          disabled={saving}
          style={{
            background:   '#1D9E75',
            color:        '#fff',
            border:       'none',
            borderRadius: 7,
            padding:      '7px 16px',
            fontSize:     13,
            fontWeight:   600,
            cursor:       saving ? 'not-allowed' : 'pointer',
          }}
        >
          Apply Override
        </button>
        <button
          onClick={clearOverride}
          disabled={saving}
          style={{
            background:   '#fff',
            color:        '#6B7280',
            border:       '1px solid #D1D5DB',
            borderRadius: 7,
            padding:      '7px 16px',
            fontSize:     13,
            fontWeight:   600,
            cursor:       saving ? 'not-allowed' : 'pointer',
          }}
        >
          Clear Override
        </button>
      </div>
    </div>
  );
}

// ─── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order, overrideOpenIds, setOverrideOpenIds }) {
  const [updating, setUpdating] = useState(false);
  const isOpen = overrideOpenIds.has(order.id);

  function toggleOverride() {
    setOverrideOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(order.id)) next.delete(order.id);
      else next.add(order.id);
      return next;
    });
  }

  async function handleStatusUpdate(newStatus) {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: newStatus });
    } catch (e) {
      console.error(e);
    }
    setUpdating(false);
  }

  const itemsStr    = buildItemsString(order.items);
  const totalStr    = order.totalPrice != null ? `₹${order.totalPrice}` : '';
  const pickupStr   = formatTime(order.pickupTime ?? order.scheduledStart);
  const prepMin     = order.prepEstimate ?? order.estimatedPrepTime ?? '?';
  const startStr    = formatTime(order.startPrepAt ?? order.scheduledStart);
  const aiReason    = order.aiReason ?? order.reason ?? '';

  return (
    <div style={{
      background:   '#fff',
      borderRadius: 12,
      border:       '1px solid #E5E7EB',
      padding:      14,
      marginBottom: 16,
      boxShadow:    '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      {/* Row 1 — header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
          {order.studentName ?? order.userName ?? 'Student'}
        </span>
        <PriorityBadge
          priority={order.priority ?? 'normal'}
          manualPriorityOverride={order.manualPriorityOverride === true}
        />
      </div>

      {/* Row 2 — items */}
      <div style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>
        {itemsStr}{totalStr ? ` — ${totalStr}` : ''}
      </div>

      {/* Row 3 — timing */}
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>
        Pickup: {pickupStr}&nbsp;&nbsp;|&nbsp;&nbsp;Est. {prepMin} min
      </div>

      {/* AI Badge */}
      <div style={{
        background:   '#E1F5EE',
        border:       '1px solid #5DCAA5',
        borderRadius: 8,
        padding:      10,
        margin:       '10px 0',
      }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#085041' }}>
          🤖 Start prep at: {startStr}
        </div>
        {aiReason && (
          <div style={{ fontStyle: 'italic', fontSize: 12, color: '#085041', marginTop: 4 }}>
            {aiReason}
          </div>
        )}
      </div>

      {/* Action Button */}
      <div style={{ marginBottom: 10 }}>
        {order.status === 'queued' && (
          <ActionButton
            label="▶ Start Preparing"
            color="#1D9E75"
            bg="#E1F5EE"
            disabled={updating}
            onClick={() => handleStatusUpdate('preparing')}
          />
        )}
        {order.status === 'preparing' && (
          <ActionButton
            label="✓ Mark Ready"
            color="#BA7517"
            bg="#FAEEDA"
            disabled={updating}
            onClick={() => handleStatusUpdate('ready')}
          />
        )}
      </div>

      {/* Priority Override Toggle */}
      <div>
        <button
          onClick={toggleOverride}
          style={{
            background: 'none',
            border:     'none',
            color:      '#9CA3AF',
            fontSize:   12,
            cursor:     'pointer',
            padding:    0,
            fontWeight: 500,
          }}
        >
          ⚙ Override Priority
        </button>

        {isOpen && (
          <OverridePanel orderId={order.id} currentPriority={order.priority ?? 'normal'} />
        )}
      </div>
    </div>
  );
}

// ─── Pulse Dot ────────────────────────────────────────────────────────────────

function PulseDot({ active }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 12, height: 12 }}>
      <span style={{
        position:     'absolute',
        inset:        0,
        borderRadius: '50%',
        background:   '#1D9E75',
        opacity:      active ? 1 : 0.3,
        animation:    active ? 'pulse-ring 1s ease-out infinite' : 'none',
      }} />
      <span style={{
        position:     'absolute',
        inset:        2,
        borderRadius: '50%',
        background:   '#1D9E75',
      }} />
      <style>{`
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(29,158,117,0.6); }
          70%  { box-shadow: 0 0 0 8px rgba(29,158,117,0);  }
          100% { box-shadow: 0 0 0 0 rgba(29,158,117,0);    }
        }
      `}</style>
    </span>
  );
}

// ─── NavBar ────────────────────────────────────────────────────────────────────

function NavBar({ activeCount, pulseActive }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div style={{
      position:        'fixed',
      top:             0,
      left:            0,
      right:           0,
      height:          58,
      background:      '#fff',
      borderBottom:    '1px solid #E5E7EB',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'space-between',
      padding:         '0 24px',
      zIndex:          100,
      boxShadow:       '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Left */}
      <span style={{ fontWeight: 800, fontSize: 17, color: '#1D9E75' }}>
        🍳 Kitchen Queue
      </span>

      {/* Center */}
      <span style={{ color: '#6B7280', fontSize: 14 }}>
        {activeCount} order{activeCount !== 1 ? 's' : ''} active
      </span>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => navigate('/chef/chart')}
          style={navLinkStyle}
        >
          Load Chart
        </button>
        <button
          onClick={() => navigate('/chef/workload')}
          style={navLinkStyle}
        >
          Workload
        </button>
        <button
          onClick={logout}
          style={{ ...navLinkStyle, color: '#EF4444' }}
        >
          Logout
        </button>
        <PulseDot active={pulseActive} />
      </div>
    </div>
  );
}

const navLinkStyle = {
  background:  'none',
  border:      'none',
  color:       '#374151',
  fontWeight:  600,
  fontSize:    13,
  cursor:      'pointer',
  padding:     0,
  textDecoration: 'none',
};

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Queue() {
  const [orders,          setOrders]          = useState([]);
  const [overrideOpenIds, setOverrideOpenIds] = useState(new Set());
  const [pulseActive,     setPulseActive]     = useState(false);
  const prevCountRef = useRef(null);

  // Real-time listener
  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('status', 'in', ['queued', 'preparing'])
    );

    const unsubscribe = onSnapshot(q, snapshot => {
      const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = sortOrders(raw);
      setOrders(sorted);

      // Pulse when count increases
      const prev = prevCountRef.current;
      if (prev !== null && sorted.length > prev) {
        setPulseActive(true);
        setTimeout(() => setPulseActive(false), 2500);
      }
      prevCountRef.current = sorted.length;
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: "'Inter', sans-serif" }}>
      <NavBar
        activeCount={orders.length}
        pulseActive={pulseActive}
      />

      {/* Content */}
      <div style={{
        maxWidth:   680,
        margin:     '0 auto',
        padding:    '82px 20px 40px',
      }}>
        {orders.length === 0 ? (
          <div style={{
            textAlign:  'center',
            color:      '#1D9E75',
            fontSize:   20,
            fontWeight: 600,
            marginTop:  80,
          }}>
            No active orders 🎉
          </div>
        ) : (
          orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              overrideOpenIds={overrideOpenIds}
              setOverrideOpenIds={setOverrideOpenIds}
            />
          ))
        )}
      </div>
    </div>
  );
}
