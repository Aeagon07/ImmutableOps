import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { calculateSchedule } from '../../utils/scheduler';
import { getAIInsights } from '../../utils/aiCall';
import { formatTime, timeInputToISO } from '../../utils/timeHelpers';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle2, Clock, Calendar, CreditCard, ShoppingBag, AlertTriangle } from 'lucide-react';

export default function Cart() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const cartItems = state?.cartItems || [];
  
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) navigate('/student/menu', { replace: true });
  }, [cartItems, navigate]);

  const [pickupOption, setPickupOption] = useState('A'); 
  const [minutes, setMinutes] = useState(30);
  
  const initialDate = new Date(Date.now() + 60 * 60000);
  const initialTime = `${initialDate.getHours().toString().padStart(2, '0')}:${initialDate.getMinutes().toString().padStart(2, '0')}`;
  const [timeValue, setTimeValue] = useState(initialTime);

  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [canteenSettings, setCanteenSettings] = useState({ isOpen: true });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'canteen'), snap => {
      if (snap.exists()) setCanteenSettings(snap.data());
    });
    return () => unsub();
  }, []);

  if (!cartItems || cartItems.length === 0) return null;

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalQty = cartItems.reduce((sum, item) => sum + item.qty, 0);

  async function placeOrder() {
    if (!canteenSettings.isOpen) {
      alert("The canteen is currently offline.");
      return;
    }
    try {
      setLoading(true);
      let pickupTimeISO = pickupOption === 'A' 
        ? new Date(Date.now() + Number(minutes) * 60000).toISOString()
        : timeInputToISO(timeValue);

      const ordersRef = collection(db, 'orders');
      const snap = await getDocs(query(ordersRef, where('status', 'in', ['queued', 'preparing'])));
      const activeCount = snap.docs.length;

      const schedule = calculateSchedule(cartItems, pickupTimeISO, activeCount);

      const orderData = {
        studentId: user?.uid || 'guest', studentName: user?.name || 'Guest',
        items: cartItems, totalPrice, pickupTime: pickupTimeISO, pickupTimeDisplay: formatTime(new Date(pickupTimeISO)),
        status: 'queued', scheduledStart: schedule.scheduledStart, startDisplay: schedule.startDisplay,
        prepEstimate: schedule.prepEstimate, aiReason: schedule.breakdown, priority: 'normal',
        delayFlag: false, manualPriorityOverride: false, overrideNote: '', 
        note: note.trim(), createdAt: serverTimestamp()
      };

      const ref = await addDoc(collection(db, 'orders'), orderData);
      setSuccessMsg(`Order placed! Prep starts at ${schedule.startDisplay}`);
      
      getAIInsights({ ...orderData, startDisplay: schedule.startDisplay }, { activeOrders: activeCount })
        .then(ai => updateDoc(ref, { aiReason: ai.tip, priority: ai.priority })).catch(() => {});

      setTimeout(() => navigate('/student/track'), 2000);
    } catch (error) {
      console.error(error); alert('Failed to place order.'); setLoading(false);
    }
  }

  return (
    <div style={{ paddingBottom: '90px' }}>
      <main style={{ padding: '32px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: '0 0 24px 0', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={24} color="#FC8019" /> Checkout
        </h1>

        <AnimatePresence>
          {!canteenSettings.isOpen && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '16px', background: '#FCEBEB', border: '1px solid #FCA5A5', color: '#111827', borderRadius: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#A32D2D', color: '#fff', borderRadius: '50%', padding: '4px' }}><AlertTriangle size={24} /></div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#991B1B' }}>The Canteen Kitchen is currently closed. Operations are completely paused right now.</div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} style={{ padding: '16px', background: '#FFF0E5', border: '1px solid #FDBA74', color: '#111827', borderRadius: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(252,128,25,0.1)' }}>
              <div style={{ background: '#FC8019', color: '#fff', borderRadius: '50%', padding: '4px' }}><CheckCircle2 size={24} /></div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{successMsg}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
          
          {/* Items Section */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', opacity: !canteenSettings.isOpen ? 0.6 : 1, pointerEvents: !canteenSettings.isOpen ? 'none' : 'auto' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 800, color: '#111827' }}>Order Summary</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cartItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: idx !== cartItems.length-1 ? '1px solid #F3F4F6' : 'none', paddingBottom: idx !== cartItems.length-1 ? '16px' : '0' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{item.name}</div>
                    <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>Qty: {item.qty} × ₹{item.price}</div>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827', fontFamily: "'Courier New', monospace" }}>₹{item.qty * item.price}</div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Add a Note for the Chef</label>
              <textarea 
                placeholder="Any special instructions?" 
                value={note} 
                onChange={e => setNote(e.target.value)} 
                maxLength={100}
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '12px', fontSize: '13px', outline: 'none', resize: 'none', minHeight: '60px', fontFamily: 'inherit', fontWeight: 500 }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '2px dashed #E5E7EB' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>Total to pay</span>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#FC8019', fontFamily: "'Courier New', monospace" }}>₹{totalPrice}</span>
            </div>
          </motion.div>

          {/* Time & Pay Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', opacity: !canteenSettings.isOpen ? 0.6 : 1, pointerEvents: !canteenSettings.isOpen ? 'none' : 'auto' }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Clock size={20} color="#BA7517" />
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#111827' }}>Pickup Timing</h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', padding: '16px', borderRadius: '12px', border: `2px solid ${pickupOption === 'A' ? '#FC8019' : '#E5E7EB'}`, background: pickupOption === 'A' ? '#FFF0E5' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input type="radio" value="A" checked={pickupOption === 'A'} onChange={() => setPickupOption('A')} style={{ marginRight: '12px', accentColor: '#FC8019' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', flex: 1 }}>Arriving in</span>
                  <input type="number" min="1" max="120" value={minutes} onChange={e => setMinutes(Number(e.target.value) || 1)} disabled={pickupOption !== 'A'} style={{ width: '60px', padding: '8px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '15px', fontWeight: 700, fontFamily: "'Courier New', monospace", textAlign: 'center', background: '#fff' }} onClick={e => e.stopPropagation()} />
                  <span style={{ fontSize: '14px', marginLeft: '8px', color: '#6B7280', fontWeight: 600 }}>min</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', padding: '16px', borderRadius: '12px', border: `2px solid ${pickupOption === 'B' ? '#BA7517' : '#E5E7EB'}`, background: pickupOption === 'B' ? '#FAEEDA' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input type="radio" value="B" checked={pickupOption === 'B'} onChange={() => setPickupOption('B')} style={{ marginRight: '12px', accentColor: '#BA7517' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827', flex: 1 }}>Specific time</span>
                  <input type="time" value={timeValue} onChange={e => setTimeValue(e.target.value)} disabled={pickupOption !== 'B'} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '15px', fontWeight: 700, fontFamily: "'Courier New', monospace", background: '#fff' }} onClick={e => e.stopPropagation()} />
                </label>
              </div>
            </motion.div>

            <motion.button 
              whileHover={{ scale: (loading || successMsg || !canteenSettings.isOpen) ? 1 : 1.02 }}
              whileTap={{ scale: (loading || successMsg || !canteenSettings.isOpen) ? 1 : 0.98 }}
              onClick={placeOrder} 
              disabled={loading || !!successMsg || !canteenSettings.isOpen}
              style={{ width: '100%', padding: '18px', background: !canteenSettings.isOpen ? '#9CA3AF' : '#FC8019', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 800, cursor: loading || successMsg || !canteenSettings.isOpen ? 'not-allowed' : 'pointer', opacity: (loading || successMsg || !canteenSettings.isOpen) ? 0.7 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: !canteenSettings.isOpen ? 'none' : '0 8px 20px rgba(252,128,25,0.25)' }}
            >
              <CreditCard size={20} />
              {loading ? 'Confirming...' : successMsg ? 'Placed Successfully!' : !canteenSettings.isOpen ? 'Canteen Offline' : `Pay ₹${totalPrice} at Counter`}
            </motion.button>
          </div>
        </div>
      </main>
    </div>
  );
}
