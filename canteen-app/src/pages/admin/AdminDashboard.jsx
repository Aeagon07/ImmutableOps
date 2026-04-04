import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDate(val) {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  const d = new Date(val);
  return isNaN(d) ? null : d;
}

function formatTime(val) {
  const d = toDate(val);
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(val) {
  const d = toDate(val);
  if (!d) return '—';
  return d.toLocaleDateString();
}

function isSameDay(date, ref) {
  return (
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth()    === ref.getMonth()    &&
    date.getDate()     === ref.getDate()
  );
}

function buildItemsStr(items) {
  if (!items?.length) return '—';
  return items.map(i => `${i.qty ?? i.quantity ?? 1}x ${i.name}`).join(', ');
}

function shortId(id) {
  return (id ?? '').slice(0, 6).toUpperCase();
}

// ─── Pill Badge ───────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  queued:    { color: '#1D9E75', bg: '#E1F5EE' },
  preparing: { color: '#BA7517', bg: '#FAEEDA' },
  ready:     { color: '#7C3AED', bg: '#EDE9FE' },
  done:      { color: '#374151', bg: '#F3F4F6' },
};

function StatusPill({ status }) {
  const { color, bg } = STATUS_STYLES[status] ?? { color: '#374151', bg: '#F3F4F6' };
  return (
    <span style={{
      background: bg, color, borderRadius: 20,
      padding: '3px 10px', fontSize: 12, fontWeight: 700,
    }}>
      {status}
    </span>
  );
}

// ─── NavBar ────────────────────────────────────────────────────────────────────

function NavBar() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 58,
      background: '#fff', borderBottom: '1px solid #E5E7EB',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <span style={{ fontWeight: 800, fontSize: 17, color: '#7C3AED' }}>
        🛠 Admin Panel
      </span>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        {[
          { label: 'Menu Mgmt', path: '/admin/menu' },
          { label: 'Users',     path: '/admin/users' },
        ].map(({ label, path }) => (
          <button key={path} onClick={() => navigate(path)} style={{
            background: 'none', border: 'none', color: '#374151',
            fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0,
          }}>
            {label}
          </button>
        ))}
        <button onClick={logout} style={{
          background: 'none', border: 'none', color: '#EF4444',
          fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0,
        }}>
          Logout
        </button>
      </div>
    </div>
  );
}

// ─── Analytics Card ───────────────────────────────────────────────────────────

function AnalyticsCard({ label, value, accent }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
      padding: '18px 20px', textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontSize: 30, fontWeight: 800, color: accent ?? '#111827', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

// ─── Peak Hours Mini-Chart ────────────────────────────────────────────────────

function PeakHoursChart({ orders }) {
  const hourCounts = {};
  for (const o of orders) {
    const d = toDate(o.pickupTime ?? o.scheduledStart);
    if (!d) continue;
    const h = d.getHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  }

  const sorted = Object.entries(hourCounts)
    .map(([h, c]) => ({ hour: Number(h), count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxCount = sorted.length ? sorted[0].count : 1;

  function hourLabel(h) {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
      padding: '18px 20px', marginBottom: 18,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 14 }}>
        🕐 Peak Hours
      </div>
      {sorted.length === 0 ? (
        <div style={{ color: '#9CA3AF', fontSize: 13 }}>Not enough data</div>
      ) : (
        sorted.map(({ hour, count }) => {
          const pct = (count / maxCount) * 100;
          return (
            <div key={hour} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 600, minWidth: 80 }}>
                  {hourLabel(hour)}
                </span>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{count} order{count !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ background: '#F3F4F6', borderRadius: 99, height: 10, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: '#1D9E75', borderRadius: 99,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Orders Table ─────────────────────────────────────────────────────────────

function OrdersTable({ orders }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter,   setDateFilter]   = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [search,       setSearch]       = useState('');
  const [deleting,     setDeleting]     = useState(null);
  const [updating,     setUpdating]     = useState(null);

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (dateFilter) {
      const d = toDate(o.createdAt);
      if (!d) return false;
      if (d.toISOString().slice(0, 10) !== dateFilter) return false;
    }
    if (search.trim()) {
      const name = (o.studentName ?? o.userName ?? '').toLowerCase();
      if (!name.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });

  async function markDone(id) {
    setUpdating(id);
    try { await updateDoc(doc(db, 'orders', id), { status: 'done' }); }
    catch (e) { console.error(e); }
    setUpdating(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this order permanently?')) return;
    setDeleting(id);
    try { await deleteDoc(doc(db, 'orders', id)); }
    catch (e) { console.error(e); }
    setDeleting(null);
  }

  const inputStyle = {
    border: '1px solid #D1D5DB', borderRadius: 7,
    padding: '7px 10px', fontSize: 13, outline: 'none', color: '#111827',
    background: '#fff',
  };

  const thStyle = {
    padding: '10px 12px', background: '#F9FAFB', fontWeight: 700,
    fontSize: 12, color: '#6B7280', textAlign: 'left',
    borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap',
  };

  const tdStyle = {
    padding: '10px 12px', fontSize: 13, color: '#374151',
    borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle',
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
      padding: '18px 20px', marginBottom: 18,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 14 }}>
        📋 All Orders
      </div>

      {/* Filter controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={inputStyle}
        >
          {['all','queued','preparing','ready','done'].map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Search student name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, minWidth: 180 }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              {['Order ID','Student','Items','Total','Status','Pickup','Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#9CA3AF', padding: 24 }}>
                  No orders match the current filters
                </td>
              </tr>
            ) : (
              filtered.map(o => (
                <tr key={o.id} style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background=''}
                >
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600, color: '#7C3AED' }}>
                    #{shortId(o.id)}
                  </td>
                  <td style={tdStyle}>{o.studentName ?? o.userName ?? '—'}</td>
                  <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {buildItemsStr(o.items)}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {o.totalPrice != null ? `₹${o.totalPrice}` : '—'}
                  </td>
                  <td style={tdStyle}><StatusPill status={o.status} /></td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#6B7280' }}>
                    {formatTime(o.pickupTime ?? o.scheduledStart)}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {o.status !== 'done' && (
                        <button
                          onClick={() => markDone(o.id)}
                          disabled={updating === o.id}
                          style={{
                            background: '#E1F5EE', color: '#1D9E75',
                            border: '1px solid #1D9E75', borderRadius: 6,
                            padding: '4px 10px', fontSize: 12, fontWeight: 600,
                            cursor: updating === o.id ? 'not-allowed' : 'pointer',
                            opacity: updating === o.id ? 0.6 : 1,
                          }}
                        >
                          Mark Done
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(o.id)}
                        disabled={deleting === o.id}
                        style={{
                          background: '#FCEBEB', color: '#A32D2D',
                          border: '1px solid #A32D2D', borderRadius: 6,
                          padding: '4px 10px', fontSize: 12, fontWeight: 600,
                          cursor: deleting === o.id ? 'not-allowed' : 'pointer',
                          opacity: deleting === o.id ? 0.6 : 1,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: '#9CA3AF' }}>
        Showing {filtered.length} of {orders.length} orders
      </div>
    </div>
  );
}

// ─── System Status Card ───────────────────────────────────────────────────────

function SystemStatusCard({ settings, userCounts }) {
  const isOpen = settings?.isOpen ?? null;
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
      padding: '18px 20px', marginBottom: 18,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 14 }}>
        🖥 System Status
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        <StatusRow label="Canteen Status">
          {isOpen === null ? (
            <span style={{ color: '#9CA3AF', fontSize: 13 }}>Loading…</span>
          ) : isOpen ? (
            <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: 13 }}>🟢 Open</span>
          ) : (
            <span style={{ color: '#A32D2D', fontWeight: 700, fontSize: 13 }}>🔴 Closed</span>
          )}
        </StatusRow>
        <StatusRow label="Firebase">
          <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: 13 }}>✓ Connected</span>
        </StatusRow>
        {userCounts !== null && (
          <>
            <StatusRow label="Total Students">
              <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{userCounts.student ?? 0}</span>
            </StatusRow>
            <StatusRow label="Total Chefs">
              <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{userCounts.chef ?? 0}</span>
            </StatusRow>
            <StatusRow label="Total Admins">
              <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{userCounts.admin ?? 0}</span>
            </StatusRow>
            <StatusRow label="Total Registered Users">
              <span style={{ fontWeight: 700, fontSize: 13, color: '#7C3AED' }}>
                {Object.values(userCounts).reduce((a, b) => a + b, 0)}
              </span>
            </StatusRow>
          </>
        )}
        {settings?.openTime && (
          <StatusRow label="Operating Hours">
            <span style={{ fontSize: 13, color: '#374151' }}>
              {settings.openTime} – {settings.closeTime ?? '—'}
            </span>
          </StatusRow>
        )}
      </div>
    </div>
  );
}

function StatusRow({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [orders,      setOrders]      = useState([]);
  const [settings,    setSettings]    = useState(null);
  const [userCounts,  setUserCounts]  = useState(null);

  useEffect(() => {
    // Live orders listener (all orders)
    const unsubOrders = onSnapshot(collection(db, 'orders'), snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Live settings listener
    const unsubSettings = onSnapshot(doc(db, 'settings', 'canteen'), snap => {
      if (snap.exists()) setSettings(snap.data());
    });

    // One-time user counts
    getDocs(collection(db, 'users'))
      .then(snap => {
        const counts = {};
        snap.forEach(d => {
          const role = d.data().role ?? 'student';
          counts[role] = (counts[role] ?? 0) + 1;
        });
        setUserCounts(counts);
      })
      .catch(e => console.error('Failed to fetch users', e));

    return () => {
      unsubOrders();
      unsubSettings();
    };
  }, []);

  // ── Derived metrics ───────────────────────────────────────────────────────

  const midnight = todayMidnight();

  const todayOrders = orders.filter(o => {
    const d = toDate(o.createdAt);
    return d && isSameDay(d, midnight);
  });

  const totalRevenueToday = todayOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
  const activeNow         = orders.filter(o => ['queued','preparing'].includes(o.status)).length;
  const completedToday    = todayOrders.filter(o => o.status === 'done').length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: "'Inter', sans-serif" }}>
      <NavBar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '82px 20px 48px' }}>

        {/* Analytics cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 18,
        }}>
          <AnalyticsCard label="Total Orders Today"  value={todayOrders.length}         accent="#7C3AED" />
          <AnalyticsCard label="Total Revenue Today" value={`₹${totalRevenueToday}`}    accent="#1D9E75" />
          <AnalyticsCard label="Active Right Now"    value={activeNow}                  accent="#BA7517" />
          <AnalyticsCard label="Completed Today"     value={completedToday}             accent="#1D9E75" />
        </div>

        {/* 2-column layout for Peak Hours + System Status */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 18,
          marginBottom: 18,
          alignItems: 'start',
        }}>
          <PeakHoursChart orders={orders} />
          <SystemStatusCard settings={settings} userCounts={userCounts} />
        </div>

        {/* Orders Table */}
        <OrdersTable orders={orders} />

      </div>
    </div>
  );
}
