import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

function avgPrepTime(orders) {
  if (!orders.length) return 0;
  const vals = orders
    .map(o => Number(o.prepEstimate ?? o.estimatedPrepTime ?? 0))
    .filter(v => v > 0);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function buildItemsSummary(items) {
  if (!items || !items.length) return '(no items)';
  return items.map(i => `${i.qty ?? i.quantity ?? 1}x ${i.name}`).join(', ');
}

function formatTimestamp(val) {
  if (!val) return '';
  const d = val?.toDate ? val.toDate() : new Date(val);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── NavBar ────────────────────────────────────────────────────────────────────

function NavBar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div style={{
      position:       'fixed',
      top:            0, left: 0, right: 0,
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
      <span style={{ fontWeight: 800, fontSize: 17, color: '#1D9E75' }}>
        ⚡ Workload Panel
      </span>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <NavBtn label="← Queue"      onClick={() => navigate('/chef/queue')}  color="#1D9E75" />
        <NavBtn label="Load Chart"   onClick={() => navigate('/chef/chart')}  color="#374151" />
        <NavBtn label="Logout"       onClick={logout}                          color="#EF4444" />
      </div>
    </div>
  );
}

function NavBtn({ label, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none',
      color, fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0,
    }}>
      {label}
    </button>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, valueColor }) {
  return (
    <div style={{
      background:   '#fff',
      borderRadius: 12,
      border:       '1px solid #E5E7EB',
      padding:      16,
      textAlign:    'center',
      boxShadow:    '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: valueColor ?? '#111827', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

// ─── Utilization Bar ──────────────────────────────────────────────────────────

function UtilizationBar({ active, max }) {
  const pct    = max > 0 ? Math.min(100, Math.round((active / max) * 100)) : 0;
  const color  = pct >= 90 ? '#A32D2D' : pct >= 60 ? '#BA7517' : '#1D9E75';
  const bgFill = pct >= 90 ? '#FCEBEB' : pct >= 60 ? '#FAEEDA' : '#E1F5EE';

  return (
    <div style={{
      background:   '#fff',
      borderRadius: 12,
      border:       '1px solid #E5E7EB',
      padding:      '16px 20px',
      marginBottom: 18,
      boxShadow:    '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#374151' }}>Kitchen Utilization</span>
        <span style={{ fontWeight: 700, fontSize: 14, color }}>{pct}%</span>
      </div>
      <div style={{ background: '#F3F4F6', borderRadius: 99, height: 14, overflow: 'hidden' }}>
        <div style={{
          width:        `${pct}%`,
          height:       '100%',
          background:   color,
          borderRadius: 99,
          transition:   'width 0.4s ease',
        }} />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#9CA3AF' }}>
        {active} of {max > 0 ? max : '—'} concurrent order slots used
      </div>
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <label style={{ cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div
        onClick={disabled ? undefined : onChange}
        style={{
          width:        44,
          height:       24,
          borderRadius: 99,
          background:   checked ? '#1D9E75' : '#D1D5DB',
          position:     'relative',
          transition:   'background 0.2s',
          flexShrink:   0,
          cursor:       disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <div style={{
          position:   'absolute',
          top:        3,
          left:       checked ? 23 : 3,
          width:      18,
          height:     18,
          borderRadius: '50%',
          background: '#fff',
          boxShadow:  '0 1px 3px rgba(0,0,0,0.25)',
          transition: 'left 0.2s',
        }} />
      </div>
      <span style={{ fontWeight: 600, fontSize: 14, color: checked ? '#1D9E75' : '#6B7280' }}>
        {checked ? 'Open' : 'Closed'}
      </span>
    </label>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel({ settings }) {
  const [maxInput, setMaxInput]   = useState('');
  const [saving,   setSaving]     = useState(false);

  // sync local input when settings load
  useEffect(() => {
    if (settings?.maxConcurrentOrders != null) {
      setMaxInput(String(settings.maxConcurrentOrders));
    }
  }, [settings?.maxConcurrentOrders]);

  async function handleToggleOpen() {
    try {
      await updateDoc(doc(db, 'settings', 'canteen'), {
        isOpen: !settings.isOpen,
      });
    } catch (e) { console.error(e); }
  }

  async function handleSaveMax() {
    const val = parseInt(maxInput, 10);
    if (isNaN(val) || val < 1 || val > 20) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'settings', 'canteen'), { maxConcurrentOrders: val });
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  return (
    <div style={{
      background:   '#fff',
      borderRadius: 12,
      border:       '1px solid #E5E7EB',
      padding:      '18px 20px',
      marginBottom: 18,
      boxShadow:    '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 16 }}>
        ⚙ Canteen Controls
      </div>

      {/* A. Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>Canteen Status</span>
        <ToggleSwitch
          checked={settings?.isOpen ?? false}
          onChange={handleToggleOpen}
          disabled={settings == null}
        />
      </div>

      {/* B. Max concurrent */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, color: '#6B7280', fontWeight: 600, marginBottom: 6 }}>
          Max Concurrent Orders
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            min={1}
            max={20}
            value={maxInput}
            onChange={e => setMaxInput(e.target.value)}
            style={{
              width:        72,
              border:       '1px solid #D1D5DB',
              borderRadius: 7,
              padding:      '7px 10px',
              fontSize:     14,
              outline:      'none',
              color:        '#111827',
            }}
          />
          <button
            onClick={handleSaveMax}
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
              opacity:      saving ? 0.7 : 1,
            }}
          >
            Save
          </button>
        </div>
      </div>

      {/* C. Hours display */}
      {(settings?.openTime || settings?.closeTime) && (
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          Hours:&nbsp;
          <strong style={{ color: '#374151' }}>
            {settings.openTime ?? '—'} – {settings.closeTime ?? '—'}
          </strong>
        </div>
      )}
    </div>
  );
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

function ActivityLog({ orders }) {
  return (
    <div style={{
      background:   '#fff',
      borderRadius: 12,
      border:       '1px solid #E5E7EB',
      padding:      '18px 20px',
      boxShadow:    '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 12 }}>
        ✅ Recent Activity
      </div>
      {orders.length === 0 ? (
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>No completed orders today yet.</div>
      ) : (
        orders.map(o => (
          <div key={o.id} style={{
            display:       'flex',
            justifyContent:'space-between',
            alignItems:    'center',
            padding:       '8px 0',
            borderBottom:  '1px solid #F3F4F6',
            fontSize:      13,
            color:         '#1D9E75',
          }}>
            <span>
              <strong>{o.studentName ?? o.userName ?? 'Student'}</strong>
              {' — '}
              {buildItemsSummary(o.items)}
              {' — '}
              <span style={{ fontWeight: 700 }}>Done ✓</span>
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 12, whiteSpace: 'nowrap' }}>
              {formatTimestamp(o.updatedAt ?? o.createdAt)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function WorkloadPanel() {
  const [activeOrders,    setActiveOrders]    = useState([]);
  const [completedToday,  setCompletedToday]  = useState([]);
  const [canteenSettings, setCanteenSettings] = useState(null);
  const [recentDone,      setRecentDone]      = useState([]);

  useEffect(() => {
    // A. Active orders
    const qActive = query(
      collection(db, 'orders'),
      where('status', 'in', ['queued', 'preparing'])
    );
    const unsubActive = onSnapshot(qActive, snap => {
      setActiveOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // B. Completed today
    const qDone = query(
      collection(db, 'orders'),
      where('status', '==', 'done'),
      where('createdAt', '>=', todayMidnight())
    );
    const unsubDone = onSnapshot(qDone, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCompletedToday(all);
      // Keep last 5 by updatedAt desc for activity log
      const sorted = [...all].sort((a, b) => {
        const at = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt ?? 0);
        const bt = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt ?? 0);
        return bt - at;
      });
      setRecentDone(sorted.slice(0, 5));
    });

    // C. Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'canteen'), snap => {
      if (snap.exists()) setCanteenSettings(snap.data());
    });

    return () => {
      unsubActive();
      unsubDone();
      unsubSettings();
    };
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const maxCap   = canteenSettings?.maxConcurrentOrders ?? 10;
  const queuedCount = activeOrders.filter(o => o.status === 'queued').length;

  const activeColor =
    activeOrders.length > maxCap ? '#A32D2D' :
    activeOrders.length === maxCap ? '#BA7517' : '#1D9E75';

  const isOpen = canteenSettings?.isOpen ?? true;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: "'Inter', sans-serif" }}>
      <NavBar />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '82px 20px 48px' }}>

        {/* Closed Banner */}
        {!isOpen && (
          <div style={{
            background:   '#FCEBEB',
            border:       '1px solid #A32D2D',
            borderRadius: 10,
            padding:      '14px 18px',
            marginBottom: 20,
            textAlign:    'center',
            fontWeight:   700,
            fontSize:     15,
            color:        '#A32D2D',
          }}>
            ⚫ CANTEEN IS CLOSED — Students cannot place new orders
          </div>
        )}

        {/* Metrics 2×2 */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:                 14,
          marginBottom:        18,
        }}>
          <MetricCard
            label="Active Orders"
            value={activeOrders.length}
            valueColor={activeColor}
          />
          <MetricCard
            label="Completed Today"
            value={completedToday.length}
            valueColor="#1D9E75"
          />
          <MetricCard
            label="Avg Prep Time"
            value={`${avgPrepTime(activeOrders)} min`}
            valueColor="#374151"
          />
          <MetricCard
            label="Queue Backlog"
            value={queuedCount}
            valueColor={queuedCount > 0 ? '#BA7517' : '#1D9E75'}
          />
        </div>

        {/* Utilization Bar */}
        <UtilizationBar active={activeOrders.length} max={maxCap} />

        {/* Settings Panel */}
        <SettingsPanel settings={canteenSettings} />

        {/* Activity Log */}
        <ActivityLog orders={recentDone} />

      </div>
    </div>
  );
}
