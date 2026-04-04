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

  const [pickupOption, setPickupOption] = useState('A'); // 'A' or 'B'
  const [minutes, setMinutes] = useState(30); // always kept as Number
  
  // default 1 hour from now for timeValue
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
      
      // Fire and forget
      getAIInsights({ ...orderData, startDisplay: schedule.startDisplay }, { activeOrders: activeCount })
        .then(ai => updateDoc(ref, { aiReason: ai.tip, priority: ai.priority }))
        .catch(() => {});

      setTimeout(() => {
        navigate('/student/track');
      }, 1500);

    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#fff', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>←</button>
          <h1 style={{ margin: 0, fontSize: '18px', color: '#1D9E75' }}>Your Cart</h1>
        </div>
        <span style={{ fontSize: '14px', color: '#666' }}>{user?.name || 'Student'}</span>
      </header>

      <main style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
        {successMsg && (
          <div style={{ padding: '16px', background: '#e6f4ea', color: '#1D9E75', borderRadius: '12px', marginBottom: '16px', fontWeight: 'bold' }}>
            {successMsg}
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Order Summary</h2>
          {cartItems.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>Qty: {item.qty} × ₹{item.price}</div>
              </div>
              <div style={{ fontWeight: 'bold' }}>₹{item.qty * item.price}</div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontWeight: 'bold', fontSize: '18px' }}>
            <span>Total</span>
            <span style={{ color: '#1D9E75' }}>₹{totalPrice}</span>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Pickup Time</h2>
          
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', cursor: 'pointer' }}>
            <input type="radio" value="A" checked={pickupOption === 'A'} onChange={() => setPickupOption('A')} style={{ marginRight: '8px' }} />
            I'll arrive in
            <input 
              type="number" 
              min="1" 
              max="120" 
              value={minutes} 
              onChange={e => setMinutes(Number(e.target.value) || 1)} 
              disabled={pickupOption !== 'A'}
              style={{ width: '60px', margin: '0 8px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            minutes
          </label>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="radio" value="B" checked={pickupOption === 'B'} onChange={() => setPickupOption('B')} style={{ marginRight: '8px' }} />
            Pick a specific time
            <input 
              type="time" 
              value={timeValue} 
              onChange={e => setTimeValue(e.target.value)} 
              disabled={pickupOption !== 'B'}
              style={{ marginLeft: '8px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </label>
        </div>

        <button 
          onClick={placeOrder} 
          disabled={loading || !!successMsg}
          style={{
            width: '100%',
            padding: '16px',
            background: loading || successMsg ? '#a0d4c2' : '#1D9E75',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading || successMsg ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Placing order...' : 'Place Order'}
        </button>
      </main>
    </div>
  );
}
