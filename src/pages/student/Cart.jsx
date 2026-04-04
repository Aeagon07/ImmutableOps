import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase'; // Adjust path if necessary
import { getAuth } from 'firebase/auth'; // Ensure you have firebase Auth initialized
import { formatTime, timeInputToISO } from '../../utils/timeHelpers';
import { calculateSchedule } from '../../utils/scheduler';
import { getAIInsights } from '../../utils/aiCall';

function Cart() {
  const location = useLocation();
  const navigate = useNavigate();
  const cartItems = location.state?.cartItems || [];

  const [pickupMode, setPickupMode] = useState('minutes'); // 'minutes' or 'specific'
  const [minutesList, setMinutesList] = useState(30);
  const [specificTime, setSpecificTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return d.toTimeString().slice(0, 5);
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Authentication Mock/State (replace user fallback logic with actual auth context as required)
  const auth = getAuth();
  const user = auth.currentUser || { uid: 'guest-123', name: 'Student' }; 

  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      navigate('/student/menu', { replace: true });
    }
  }, [cartItems, navigate]);

  const totalPrice = cartItems.reduce((sum, item) => sum + (item.qty * item.price), 0);

  const placeOrder = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Create pickupTimeISO based on selection
      let pickupTimeISO = '';
      if (pickupMode === 'minutes') {
        const d = new Date();
        d.setMinutes(d.getMinutes() + minutesList);
        pickupTimeISO = d.toISOString();
      } else {
        pickupTimeISO = timeInputToISO(specificTime);
      }

      // Step 5a: get activeCount
      const q = query(
        collection(db, 'orders'),
        where('status', 'in', ['queued', 'preparing'])
      );
      const snapshot = await getDocs(q);
      const activeCount = snapshot.empty ? 0 : snapshot.docs.length;

      // Step 5b: calculate schedule
      const schedule = calculateSchedule(cartItems, pickupTimeISO, activeCount);

      // Step 5c: Build orderData
      const orderData = {
        studentId: user.uid,
        studentName: user.displayName || user.name,
        items: cartItems,
        totalPrice,
        pickupTime: pickupTimeISO,
        pickupTimeDisplay: formatTime(pickupTimeISO),
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

      // Step 5d: Add doc
      const ref = await addDoc(collection(db, 'orders'), orderData);

      // Step 5e: Show success msg
      setSuccessMsg(`✓ Order placed! Chef will start at ${schedule.startDisplay}`);

      // Step 5f: Fire and forget AI insights
      getAIInsights(
        { ...orderData, startDisplay: schedule.startDisplay },
        { activeOrders: activeCount }
      )
        .then(ai => updateDoc(ref, { aiReason: ai.tip, priority: ai.priority }))
        .catch(() => {}); // silent catch

      // Step 5g: Navigate after 1500ms
      setTimeout(() => {
        navigate('/student/track');
      }, 1500);

    } catch (e) {
      console.error("Error placing order:", e);
      alert("Failed to place order. Please try again.");
      setLoading(false);
    }
  };

  if (!cartItems || cartItems.length === 0) return null; // caught by useEffect too

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Top NavBar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', marginRight: '16px' }}
        >
          ←
        </button>
        <h2 style={{ flex: 1, margin: 0 }}>Your Cart</h2>
        <span style={{ fontSize: '14px', color: '#666' }}>{user.displayName || user.name}</span>
      </div>

      {/* Cart Items List */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        {cartItems.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: idx < cartItems.length - 1 ? '1px solid #eee' : 'none', paddingBottom: idx < cartItems.length - 1 ? '12px' : '0' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '16px' }}>{item.qty}x {item.name}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>₹{item.price} each</div>
            </div>
            <div style={{ fontWeight: 'bold' }}>₹{item.qty * item.price}</div>
          </div>
        ))}
        {/* Total Price Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #eee', fontSize: '18px', fontWeight: 'bold' }}>
          <div>Total</div>
          <div style={{ color: '#1D9E75' }}>₹{totalPrice}</div>
        </div>
      </div>

      {/* Pickup Time Options */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Pickup Time</h3>
        
        {/* Option A */}
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}>
          <input 
            type="radio" 
            name="pickupMode" 
            checked={pickupMode === 'minutes'} 
            onChange={() => setPickupMode('minutes')} 
            style={{ marginRight: '12px', accentColor: '#1D9E75' }} 
          />
          <div style={{ flex: 1 }}>
            <div>I'll arrive in</div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
              <input 
                type="number" 
                min="1" 
                max="120"
                value={minutesList}
                onChange={e => setMinutesList(Number(e.target.value))}
                disabled={pickupMode !== 'minutes'}
                style={{ width: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginRight: '8px' }}
              />
              <span>minutes</span>
            </div>
          </div>
        </label>

        {/* Option B */}
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input 
            type="radio" 
            name="pickupMode" 
            checked={pickupMode === 'specific'} 
            onChange={() => setPickupMode('specific')} 
            style={{ marginRight: '12px', accentColor: '#1D9E75' }} 
          />
          <div style={{ flex: 1 }}>
            <div>Pick a specific time</div>
            <input 
              type="time" 
              value={specificTime}
              onChange={e => setSpecificTime(e.target.value)}
              disabled={pickupMode !== 'specific'}
              style={{ marginTop: '8px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }}
            />
          </div>
        </label>
      </div>

      {/* Place Order Button */}
      {successMsg ? (
        <div style={{ background: '#e6f4ea', color: '#1D9E75', padding: '16px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
          {successMsg}
        </div>
      ) : (
        <button 
          onClick={placeOrder} 
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '16px', 
            background: loading ? '#ccc' : '#1D9E75', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '12px', 
            fontSize: '18px', 
            fontWeight: 'bold', 
            cursor: loading ? 'not-allowed' : 'pointer' 
          }}
        >
          {loading ? 'Placing order...' : 'Place Order'}
        </button>
      )}

    </div>
  );
}

export default Cart;
