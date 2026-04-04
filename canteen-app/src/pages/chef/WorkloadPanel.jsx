import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function WorkloadPanel() {
  const navigate = useNavigate();

  const [activeOrders, setActiveOrders] = useState([]);
  const [chefUsers, setChefUsers] = useState([]);
  const [canteenSettings, setCanteenSettings] = useState({ isOpen: true, maxConcurrentOrders: 6 });

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', 'in', ['queued', 'preparing']));
    const unsub = onSnapshot(q, snap => {
      setActiveOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const qc = query(collection(db, 'users'), where('role', '==', 'chef'));
    const unsubC = onSnapshot(qc, snap => {
      setChefUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubC();
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

  async function toggleCanteenOpen() {
    const ref = doc(db, 'settings', 'canteen');
    await updateDoc(ref, { isOpen: !canteenSettings.isOpen });
  }

  async function setMaxOrders(val) {
    if (val < 1 || val > 50) return;
    const ref = doc(db, 'settings', 'canteen');
    await updateDoc(ref, { maxConcurrentOrders: val });
  }

  const loadPercentage = Math.min(100, Math.round((activeOrders.length / (canteenSettings.maxConcurrentOrders || 6)) * 100));
  const loadColor = loadPercentage >= 100 ? '#A32D2D' : loadPercentage > 75 ? '#BA7517' : '#1D9E75';

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F6', paddingBottom: '80px' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, height: '52px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#1D9E75' }}>🍽 CaféSync</span>
        <button onClick={() => navigate('/chef/queue')} style={{ background: 'none', border: 'none', color: '#374151', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'opacity 0.15s' }}>
          Back to Queue
        </button>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>Kitchen Operations</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.02em', fontWeight: 600, marginBottom: '4px' }}>Active Chefs Online</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>{chefUsers.length}</div>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.02em', fontWeight: 600, marginBottom: '4px' }}>Wait Queue</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
              {activeOrders.filter(o => o.status === 'queued').length} orders
            </div>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Capacity Utilization</h2>
            <span style={{ fontSize: '13px', fontWeight: 600, color: loadColor }}>{loadPercentage}%</span>
          </div>

          <div style={{ width: '100%', height: '8px', background: '#F5F7F6', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${loadPercentage}%`, height: '100%', background: loadColor, transition: 'width 0.5s ease-out, background 0.3s' }} />
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
            <span>{activeOrders.length} active</span>
            <span>{canteenSettings.maxConcurrentOrders} max capacity</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
           <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>Canteen Controls</h2>
           
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #E5E7EB' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>Accept New Orders</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Toggle canteen open/close status</div>
              </div>
              <button
                onClick={toggleCanteenOpen}
                style={{
                  background: canteenSettings.isOpen ? '#FCEBEB' : '#E1F5EE',
                  color: canteenSettings.isOpen ? '#A32D2D' : '#1D9E75',
                  border: canteenSettings.isOpen ? '1px solid #FECACA' : '1px solid #5DCAA5',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'transform 0.1s'
                }}
              >
                {canteenSettings.isOpen ? 'Close Canteen' : 'Open Canteen'}
              </button>
           </div>

           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>Max Order Capacity</div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>Limit parallel orders to trigger AI priority adjustments</div>
              </div>
              <input
                type="number"
                min="1"
                max="50"
                value={canteenSettings.maxConcurrentOrders}
                onChange={e => setMaxOrders(Number(e.target.value))}
                style={{
                  width: '60px',
                  padding: '8px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: "'Courier New', monospace",
                  outline: 'none'
                }}
              />
           </div>
        </div>
      </main>
    </div>
  );
}
