import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { calculateSchedule } from '../../utils/scheduler';
import { getAIInsights } from '../../utils/aiCall';
import { formatTime, timeInputToISO } from '../../utils/timeHelpers';

export default function Cart() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const cartItems = state?.cartItems || [];
  
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      navigate('/student/menu', { replace: true });
    }
  }, [cartItems, navigate]);

  const [pickupOption, setPickupOption] = useState('A'); 
  const [minutes, setMinutes] = useState(30);
  
  const initialDate = new Date(Date.now() + 60 * 60000);
  const initialTime = `${initialDate.getHours().toString().padStart(2, '0')}:${initialDate.getMinutes().toString().padStart(2, '0')}`;
  const [timeValue, setTimeValue] = useState(initialTime);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!cartItems || cartItems.length === 0) return null;

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  async function placeOrder() {
    try {
      setLoading(true);
      
      let pickupTimeISO;
      if (pickupOption === 'A') {
        pickupTimeISO = new Date(Date.now() + Number(minutes) * 60000).toISOString();
      } else {
        pickupTimeISO = timeInputToISO(timeValue);
      }

      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('status', 'in', ['queued', 'preparing']));
      const snap = await getDocs(q);
      const activeCount = snap.docs.length;

      const schedule = calculateSchedule(cartItems, pickupTimeISO, activeCount);

      const orderData = {
        studentId: user?.uid || 'guest',
        studentName: user?.name || 'Guest',
        items: cartItems,
        totalPrice,
        pickupTime: pickupTimeISO,
        pickupTimeDisplay: formatTime(new Date(pickupTimeISO)),
        status: 'queued',
        scheduledStart: schedule.scheduledStart,
        startDisplay: schedule.startDisplay,
        prepEstimate: schedule.prepEstimate,
        aiReason: schedule.breakdown,
        priority: 'normal',
        delayFlag: false,
        manualPriorityOverride: false,
        overrideNote: '',
        createdAt: serverTimestamp()
      };

      const ref = await addDoc(collection(db, 'orders'), orderData);
      
      setSuccessMsg(`✓ Order placed! Chef will start at ${schedule.startDisplay}`);
      
      getAIInsights({ ...orderData, startDisplay: schedule.startDisplay }, { activeOrders: activeCount })
        .then(ai => updateDoc(ref, { aiReason: ai.tip, priority: ai.priority }))
        .catch(() => {});

      setTimeout(() => navigate('/student/track'), 1500);

    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F6', paddingBottom: '80px' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: '52px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate(-1)} 
            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: 0 }}
          >
            ←
          </button>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#1D9E75' }}>
            🍽 CaféSync
          </span>
        </div>
        <span style={{ fontSize: '13px', color: '#111827', fontWeight: 500 }}>{user?.name || 'Student'}</span>
      </header>

      <main style={{ padding: '20px 16px', maxWidth: '600px', margin: '0 auto' }}>
        
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>Review Cart</h1>

        {successMsg && (
          <div style={{ padding: '14px 16px', background: '#E1F5EE', border: '1px solid #5DCAA5', color: '#085041', borderRadius: '12px', marginBottom: '20px', fontWeight: 600, fontSize: '13px' }}>
            {successMsg}
          </div>
        )}

        <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#111827' }}>Order Summary</h2>
          {cartItems.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #E5E7EB', paddingBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', lineHeight: 1.6 }}>{item.name}</div>
                <div style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.02em' }}>Qty: {item.qty} × ₹{item.price}</div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', fontFamily: "'Courier New', monospace" }}>
                ₹{item.qty * item.price}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Total</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1D9E75', fontFamily: "'Courier New', monospace" }}>₹{totalPrice}</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#111827' }}>Pickup Time</h2>
          
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
            <input type="radio" value="A" checked={pickupOption === 'A'} onChange={() => setPickupOption('A')} style={{ marginRight: '8px' }} />
            I'll arrive in
            <input 
              type="number" 
              min="1" max="120" 
              value={minutes} 
              onChange={e => setMinutes(Number(e.target.value) || 1)} 
              disabled={pickupOption !== 'A'}
              style={{ width: '60px', margin: '0 8px', padding: '6px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', fontFamily: "'Courier New', monospace" }}
            />
            min
          </label>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
            <input type="radio" value="B" checked={pickupOption === 'B'} onChange={() => setPickupOption('B')} style={{ marginRight: '8px' }} />
            Pick specific time
            <input 
              type="time" 
              value={timeValue} 
              onChange={e => setTimeValue(e.target.value)} 
              disabled={pickupOption !== 'B'}
              style={{ marginLeft: '8px', padding: '6px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', fontFamily: "'Courier New', monospace" }}
            />
          </label>
        </div>

        <button 
          onClick={placeOrder} 
          disabled={loading || !!successMsg}
          style={{
            width: '100%',
            padding: '10px 20px',
            background: '#1D9E75',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: loading || successMsg ? 'not-allowed' : 'pointer',
            opacity: (loading || successMsg) ? 0.5 : 1,
            transition: 'opacity 0.15s, transform 0.1s'
          }}
          onMouseEnter={e => { if(!loading && !successMsg) e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={e => { if(!loading && !successMsg) e.currentTarget.style.opacity = '1' }}
        >
          {loading ? 'Placing order...' : 'Place Order'}
        </button>
      </main>
    </div>
  );
}
