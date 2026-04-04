import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion } from 'framer-motion';
import { ChevronLeft, Users, ListOrdered, Activity, Settings2, Power, PowerOff } from 'lucide-react';

export default function WorkloadPanel() {
  const navigate = useNavigate();

  const [activeOrders, setActiveOrders] = useState([]);
  const [chefUsers, setChefUsers] = useState([]);
  const [canteenSettings, setCanteenSettings] = useState({ isOpen: true, maxConcurrentOrders: 6 });

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', 'in', ['queued', 'preparing']));
    const unsub = onSnapshot(q, snap => setActiveOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const qc = query(collection(db, 'users'), where('role', '==', 'chef'));
    const unsubC = onSnapshot(qc, snap => setChefUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsubC();
  }, []);

  useEffect(() => {
    const ref = doc(db, 'settings', 'canteen');
    getDoc(ref).then(snap => { if (snap.exists()) setCanteenSettings(snap.data()); });
    const unsubS = onSnapshot(ref, snap => { if (snap.exists()) setCanteenSettings(snap.data()); });
    return () => unsubS();
  }, []);

  async function toggleCanteenOpen() {
    await updateDoc(doc(db, 'settings', 'canteen'), { isOpen: !canteenSettings.isOpen });
  }

  async function setMaxOrders(val) {
    if (val < 1 || val > 50) return;
    await updateDoc(doc(db, 'settings', 'canteen'), { maxConcurrentOrders: val });
  }

  const loadPercentage = Math.min(100, Math.round((activeOrders.length / (canteenSettings.maxConcurrentOrders || 6)) * 100));
  const loadColor = loadPercentage >= 100 ? '#A32D2D' : loadPercentage > 75 ? '#BA7517' : '#FC8019';

  return (
    <div style={{ paddingBottom: '80px' }}>
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#7C3AED1A', padding: '12px', borderRadius: '12px' }}><Users size={24} color="#7C3AED" /></div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Active Chefs</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827' }}>{chefUsers.length}</div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#BA75171A', padding: '12px', borderRadius: '12px' }}><ListOrdered size={24} color="#BA7517" /></div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Wait Queue</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827' }}>{activeOrders.filter(o => o.status === 'queued').length}</div>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="#111827" />
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>Capacity Utilization</h2>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800, color: loadColor }}>{loadPercentage}%</span>
          </div>

          <div style={{ width: '100%', height: '12px', background: '#F5F7F6', borderRadius: '6px', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${loadPercentage}%`, backgroundColor: loadColor }} transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 }} style={{ height: '100%', borderRadius: '6px' }} />
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#6B7280', display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
            <span style={{ color: '#111827', fontWeight: 700 }}>{activeOrders.length} active</span>
            <span>{canteenSettings.maxConcurrentOrders} max capacity</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
             <Settings2 size={20} color="#111827" />
             <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>Canteen Controls</h2>
           </div>
           
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #E5E7EB' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Accept New Orders</div>
                <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Toggle canteen open/close status</div>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleCanteenOpen} style={{ background: canteenSettings.isOpen ? '#FCEBEB' : '#FFF0E5', color: canteenSettings.isOpen ? '#A32D2D' : '#FC8019', border: canteenSettings.isOpen ? '2px solid #FCA5A5' : '2px solid #FDBA74', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {canteenSettings.isOpen ? <><PowerOff size={16} /> Close Canteen</> : <><Power size={16} /> Open Canteen</>}
              </motion.button>
           </div>

           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Max Order Capacity</div>
                <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>Limit parallel orders for AI priority routing</div>
              </div>
              <input type="number" min="1" max="50" value={canteenSettings.maxConcurrentOrders} onChange={e => setMaxOrders(Number(e.target.value))} style={{ width: '70px', padding: '10px', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '15px', fontWeight: 700, fontFamily: "'Courier New', monospace", outline: 'none', textAlign: 'center', background: '#F9FAFB' }} />
           </div>
        </motion.div>
      </main>
    </div>
  );
}
