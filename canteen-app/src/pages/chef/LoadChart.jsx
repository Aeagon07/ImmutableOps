import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSlotLabel(date) {
  const roundedMins = Math.floor(date.getMinutes() / 30) * 30;
  const slotDate = new Date(date);
  slotDate.setMinutes(roundedMins, 0, 0);
  return slotDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getSlotKey(date) {
  // Numeric key for chrono-sorting: hours * 60 + rounded minutes
  const rounded = Math.floor(date.getMinutes() / 30) * 30;
  return date.getHours() * 60 + rounded;
}

function groupBySlot(orders) {
  const map = new Map(); // key -> { label, count, sortKey }

  for (const order of orders) {
    if (!order.pickupTime) continue;
    const raw = order.pickupTime?.toDate ? order.pickupTime.toDate() : new Date(order.pickupTime);
    if (isNaN(raw)) continue;

    const sortKey = getSlotKey(raw);
    const label   = getSlotLabel(raw);

    if (map.has(sortKey)) {
      map.get(sortKey).count += 1;
    } else {
      map.set(sortKey, { label, count: 1, sortKey });
    }
  }

  return [...map.values()].sort((a, b) => a.sortKey - b.sortKey);
}

// ─── NavBar ────────────────────────────────────────────────────────────────────

function NavBar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div style={{
      position:       'fixed',
      top:            0,
      left:           0,
      right:          0,
      height:         58,
      background:     '#fff',
      borderBottom:   '1px solid #E5E7EB',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '0 24px',
      zIndex:         100,
      boxShadow:      '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Left nav */}
      <button onClick={() => navigate('/chef/queue')} style={navBtn('#1D9E75')}>
        ← Queue
      </button>

      {/* Title */}
      <span style={{ fontWeight: 800, fontSize: 17, color: '#1D9E75' }}>
        📊 Load Chart
      </span>

      {/* Right nav */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <button onClick={() => navigate('/chef/workload')} style={navBtn('#374151')}>
          Workload →
        </button>
        <button onClick={logout} style={navBtn('#EF4444')}>
          Logout
        </button>
      </div>
    </div>
  );
}

function navBtn(color) {
  return {
    background:  'none',
    border:      'none',
    color,
    fontWeight:  600,
    fontSize:    13,
    cursor:      'pointer',
    padding:     0,
  };
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LoadChart() {
  const [orders,     setOrders]     = useState([]);
  const [maxCap,     setMaxCap]     = useState(null);
  const [capLoading, setCapLoading] = useState(true);

  // Real-time orders listener
  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('status', 'in', ['queued', 'preparing'])
    );

    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  // Fetch canteen settings once
  useEffect(() => {
    getDoc(doc(db, 'settings', 'canteen'))
      .then(snap => {
        if (snap.exists()) setMaxCap(snap.data().maxConcurrentOrders ?? null);
      })
      .catch(() => {})
      .finally(() => setCapLoading(false));
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const slots       = groupBySlot(orders);
  const labels      = slots.map(s => s.label);
  const counts      = slots.map(s => s.count);
  const barColors   = counts.map(c => c >= 5 ? '#BA7517' : '#1D9E75');
  const overloaded  = slots.filter(s => s.count >= 5);
  const busiest     = slots.length
    ? slots.reduce((a, b) => (a.count >= b.count ? a : b))
    : null;
  const maxY        = Math.max(8, ...(counts.length ? counts : [0]));
  const totalOrders = orders.length;

  // ── Chart config ─────────────────────────────────────────────────────────────

  const chartData = {
    labels,
    datasets: [
      {
        label:           'Orders',
        data:            counts,
        backgroundColor: barColors,
        borderRadius:    6,
        borderSkipped:   false,
      },
    ],
  };

  const chartOptions = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display:  true,
        text:     'Kitchen Load by 30-min Window',
        font:     { size: 15, weight: 'bold' },
        color:    '#111827',
        padding:  { bottom: 12 },
      },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.y} order${ctx.parsed.y !== 1 ? 's' : ''} in this slot`,
        },
      },
    },
    scales: {
      x: {
        grid:  { display: false },
        ticks: { color: '#6B7280', font: { size: 12 } },
      },
      y: {
        min:  0,
        max:  maxY,
        grid: { color: '#F3F4F6' },
        ticks: {
          color:     '#6B7280',
          font:      { size: 12 },
          stepSize:  1,
          precision: 0,
        },
      },
    },
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: "'Inter', sans-serif" }}>
      <NavBar />

      <div style={{
        maxWidth: 760,
        margin:   '0 auto',
        padding:  '82px 20px 48px',
      }}>

        {/* ── Overload Warning Banner ──────────────────────────────────────── */}
        {overloaded.length > 0 && (
          <div style={{
            background:   '#FAEEDA',
            border:       '1px solid #BA7517',
            borderRadius: 10,
            padding:      '12px 14px',
            marginBottom: 20,
            color:        '#7A4E0E',
            fontWeight:   600,
            fontSize:     14,
          }}>
            ⚠ Peak load detected:{' '}
            <strong>{overloaded[0].label}</strong> has{' '}
            <strong>{overloaded[0].count} orders</strong>.{' '}
            Consider pausing new orders.
          </div>
        )}

        {/* ── Chart Card ──────────────────────────────────────────────────── */}
        <div style={{
          background:   '#fff',
          borderRadius: 14,
          border:       '1px solid #E5E7EB',
          padding:      '20px 24px 24px',
          marginBottom: 20,
          boxShadow:    '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          {slots.length === 0 ? (
            <div style={{
              height:     280,
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color:      '#9CA3AF',
              fontSize:   15,
            }}>
              No active orders to chart
            </div>
          ) : (
            <div style={{ height: 280 }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
          )}
        </div>

        {/* ── Summary Row ─────────────────────────────────────────────────── */}
        <div style={{
          background:   '#fff',
          borderRadius: 14,
          border:       '1px solid #E5E7EB',
          padding:      '18px 24px',
          boxShadow:    '0 2px 8px rgba(0,0,0,0.05)',
          marginBottom: 16,
        }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <SummaryRow
              label="Total active orders"
              value={String(totalOrders)}
            />
            <SummaryRow
              label="Busiest slot"
              value={busiest ? `${busiest.label} (${busiest.count} order${busiest.count !== 1 ? 's' : ''})` : '—'}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
              <span style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Status</span>
              {overloaded.length > 0 ? (
                <span style={{ color: '#BA7517', fontWeight: 700, fontSize: 14 }}>⚠ Overloaded</span>
              ) : (
                <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: 14 }}>✓ Load balanced</span>
              )}
            </div>
            {!capLoading && maxCap !== null && (
              <SummaryRow
                label="Max concurrent capacity"
                value={`${maxCap} orders`}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Summary Row Helper ────────────────────────────────────────────────────────

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#6B7280', fontSize: 14 }}>{label}</span>
      <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{value}</span>
    </div>
  );
}
