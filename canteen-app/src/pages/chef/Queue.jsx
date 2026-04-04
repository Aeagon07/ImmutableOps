import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

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

function buildItemsString(items) {
  if (!items || items.length === 0) return 'No items';
  return items.map(i => `${i.qty ?? i.quantity ?? 1}x ${i.name}`).join(', ');
}

function ActionButton({ label, type = 'primary', onClick, disabled }) {
  const [hover, setHover] = useState(false);
  
  let baseStyle = {
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: 500,
    fontSize: '13px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'opacity 0.15s, transform 0.1s',
    opacity: disabled ? 0.5 : 1,
  };

  if (type === 'primary') {
    Object.assign(baseStyle, { background: '#1D9E75', color: '#fff', border: 'none' });
  } else if (type === 'secondary') {
    Object.assign(baseStyle, { background: 'transparent', color: '#1D9E75', border: '1.5px solid #1D9E75' });
  } else if (type === 'danger') {
    Object.assign(baseStyle, { background: 'transparent', color: '#A32D2D', border: '1px solid #FECACA' });
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => { if(!disabled) setHover(true); }}
      onMouseLeave={() => { if(!disabled) setHover(false); }}
      onMouseDown={e => { if(!disabled) e.currentTarget.style.transform = 'scale(0.98)'; }}
      onMouseUp={e => { if(!disabled) e.currentTarget.style.transform = 'scale(1)'; }}
      style={{ ...baseStyle, opacity: disabled ? 0.5 : (hover ? 0.88 : 1) }}
    >
      {label}
    </button>
  );
}

function OverridePanel({ orderId, currentPriority }) {
  const [selected, setSelected] = useState(currentPriority ?? 'normal');
  const [note,     setNote]     = useState('');
  const [saving,   setSaving]   = useState(false);

  const priorities = ['normal', 'high', 'urgent'];

  async function applyOverride() {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        priority: selected,
        manualPriorityOverride: true,
        overrideNote: note,
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
        overrideNote: '',
      });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  return (
    <div style={{ marginTop: '12px', background: '#F5F7F6', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {priorities.map(p => {
          const active = selected === p;
          const pxColor = active ? '#fff' : '#374151';
          const pxBg = active ? '#1D9E75' : '#FFFFFF';
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
              <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, border: active ? 'none' : '1px solid #E5E7EB', background: pxBg, color: pxColor, transition: 'all 0.15s' }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </span>
            </label>
          );
        })}
      </div>

      <input
        type="text"
        placeholder="Note for chef team"
        maxLength={100}
        value={note}
        onChange={e => setNote(e.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', outline: 'none', marginBottom: '14px' }}
      />

      <div style={{ display: 'flex', gap: '8px' }}>
        <ActionButton label="Apply Override" type="primary" onClick={applyOverride} disabled={saving} />
        <ActionButton label="Clear Override" type="danger" onClick={clearOverride} disabled={saving} />
      </div>
    </div>
  );
}

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
    <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '14px 16px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
          #{order.id.slice(0, 6).toUpperCase()} - {order.studentName ?? order.userName ?? 'Student'}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {order.manualPriorityOverride && <StatusBadge status="high" labelOverride="✎ OVERRIDE" />}
          <StatusBadge status={order.priority ?? 'normal'} />
        </div>
      </div>

      <div style={{ fontSize: '13px', color: '#374151', marginBottom: '8px', lineHeight: 1.6 }}>
        {itemsStr} <span style={{ fontFamily: "'Courier New', monospace" }}>{totalStr ? ` — ${totalStr}` : ''}</span>
      </div>

      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '14px', letterSpacing: '0.02em' }}>
        Pickup: <span style={{ fontFamily: "'Courier New', monospace" }}>{pickupStr}</span>&nbsp;&nbsp;|&nbsp;&nbsp;Est. {prepMin} min
      </div>

      <div style={{ background: '#E1F5EE', border: '1px solid #5DCAA5', borderRadius: '8px', padding: '10px', margin: '14px 0' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#085041' }}>
          🤖 Start prep at: <span style={{ fontFamily: "'Courier New', monospace" }}>{startStr}</span>
        </div>
        {aiReason && (
          <div style={{ fontStyle: 'italic', fontSize: '11px', color: '#085041', marginTop: '4px', letterSpacing: '0.02em' }}>
            {aiReason}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '14px' }}>
        {order.status === 'queued' && <ActionButton label="▶ Start Preparing" type="primary" disabled={updating} onClick={() => handleStatusUpdate('preparing')} />}
        {order.status === 'preparing' && <ActionButton label="✓ Mark Ready" type="secondary" disabled={updating} onClick={() => handleStatusUpdate('ready')} />}
      </div>

      <div>
        <button onClick={toggleOverride} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '11px', cursor: 'pointer', padding: 0, fontWeight: 600, letterSpacing: '0.02em' }}>
          ⚙ OVERRIDE PRIORITY
        </button>
        {isOpen && <OverridePanel orderId={order.id} currentPriority={order.priority ?? 'normal'} />}
      </div>
    </div>
  );
}

function PulseDot({ active }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: '12px', height: '12px', marginLeft: '10px' }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#1D9E75', opacity: active ? 1 : 0.3, animation: active ? 'pulse-ring 1s ease-out infinite' : 'none' }} />
      <span style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: '#1D9E75' }} />
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

function NavBar({ activeCount, pulseActive }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '52px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: 700, fontSize: '16px', color: '#1D9E75' }}>🍽 CaféSync</span>
        <PulseDot active={pulseActive} />
      </div>

      <span style={{ color: '#374151', fontSize: '13px', fontWeight: 500 }}>
        {activeCount} order{activeCount !== 1 ? 's' : ''} active
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate('/chef/chart')} style={navLinkStyle}>Load Chart</button>
        <button onClick={() => navigate('/chef/workload')} style={navLinkStyle}>Workload</button>
        <button onClick={logout} style={{ ...navLinkStyle, color: '#A32D2D' }}>Logout</button>
      </div>
    </div>
  );
}

const navLinkStyle = {
  background: 'none', border: 'none', color: '#374151', fontWeight: 500, fontSize: '13px', cursor: 'pointer', padding: 0, textDecoration: 'none', transition: 'opacity 0.15s'
};

export default function Queue() {
  const [orders, setOrders] = useState([]);
  const [overrideOpenIds, setOverrideOpenIds] = useState(new Set());
  const [pulseActive, setPulseActive] = useState(false);
  const prevCountRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', 'in', ['queued', 'preparing']));
    const unsubscribe = onSnapshot(q, snapshot => {
      const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = sortOrders(raw);
      setOrders(sorted);

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
    <div style={{ minHeight: '100vh', background: '#F5F7F6', paddingBottom: '80px' }}>
      <NavBar activeCount={orders.length} pulseActive={pulseActive} />

      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '72px 16px 20px' }}>
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6B7280', fontSize: '14px', fontWeight: 600, marginTop: '80px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎉</div>
            No active orders
          </div>
        ) : (
          orders.map(order => (
            <OrderCard key={order.id} order={order} overrideOpenIds={overrideOpenIds} setOverrideOpenIds={setOverrideOpenIds} />
          ))
        )}
      </main>
    </div>
  );
}
