import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase'; // Adjust path setup if required
import { getAuth, signOut } from 'firebase/auth'; // Adjust auth import as required
import { useNavigate, Link } from 'react-router-dom';
import CountdownTimer from '../../components/CountdownTimer';

function OrderTrack() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const auth = getAuth();
  
  // Replace fallback logic with correct robust context depending on your app shape
  const user = auth.currentUser || { uid: 'guest-123' };

  useEffect(() => {
    // 1. onSnapshot on /orders
    const q = query(
      collection(db, 'orders'),
      where('studentId', '==', user.uid),
      where('status', 'in', ['queued', 'preparing', 'ready']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleLogout = () => {
    signOut(auth).then(() => {
      navigate('/login');
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#FEE2E2'; 
      case 'high': return '#FEF3C7'; 
      case 'normal': 
      default: return '#D1FAE5'; 
    }
  };

  const getPriorityTextColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#DC2626';
      case 'high': return '#D97706';
      case 'normal': 
      default: return '#059669';
    }
  };

  const steps = ['queued', 'preparing', 'ready', 'done'];

  if (loading) {
    return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Loading orders...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      {/* Top Navbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>My Orders</h2>
        <button 
          onClick={handleLogout}
          style={{ background: 'none', border: '1px solid #ccc', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      {orders.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '32px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>No active orders</h3>
          <Link to="/student/menu" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 'bold' }}>
            Browse Menu &rarr;
          </Link>
        </div>
      ) : (
        orders.map(order => {
          const itemsString = (order.items || []).map(i => `${i.qty}x ${i.name}`).join(', ');
          const currentStepIndex = steps.indexOf(order.status) !== -1 ? steps.indexOf(order.status) : 0;
          
          return (
            <div key={order.docId} style={{ background: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
              
              {/* Ready Pulse Banner */}
              {order.status === 'ready' && (
                <div style={{
                  background: '#1D9E75',
                  color: '#fff',
                  padding: '16px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  marginBottom: '16px',
                  animation: 'pulse 1.5s infinite'
                }}>
                  🎉 Your order is ready! Go to counter now.
                </div>
              )}

              {/* Delay Flag Banner */}
              {order.delayFlag === true && (
                <div style={{
                  background: '#FAEEDA',
                  border: '1px solid #BA7517',
                  borderRadius: '8px',
                  padding: '10px',
                  marginBottom: '16px',
                  color: '#BA7517',
                  fontWeight: '500'
                }}>
                  ⚠ Your order is running slightly late. Updated time will reflect soon.
                </div>
              )}

              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Order #{order.docId.slice(0,6).toUpperCase()}</h3>
                <span style={{ 
                  background: getPriorityColor(order.priority), 
                  color: getPriorityTextColor(order.priority), 
                  padding: '4px 10px', 
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'capitalize'
                }}>
                  {order.priority || 'normal'}
                </span>
              </div>

              {/* Items List */}
              <div style={{ color: '#555', marginBottom: '8px', fontSize: '15px' }}>
                {itemsString}
              </div>

              {/* Price and Pickup */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px' }}>
                <div style={{ fontWeight: 'bold' }}>Total: ₹{order.totalPrice}</div>
                <div>🕐 Pickup: {order.pickupTimeDisplay}</div>
              </div>

              {/* AI info box */}
              <div style={{ background: '#E1F5EE', border: '1px solid #5DCAA5', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
                <div style={{ fontWeight: 'bold', color: '#1B7354', marginBottom: '4px' }}>
                  🤖 Prep starts at: {order.startDisplay}
                </div>
                {order.aiReason && (
                  <div style={{ fontStyle: 'italic', color: '#666', fontSize: '13px', marginBottom: '8px' }}>
                    {order.aiReason}
                  </div>
                )}
                <CountdownTimer pickupTimeISO={order.pickupTime} status={order.status} />
              </div>

              {/* Progress Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginTop: '10px', paddingBottom: '8px' }}>
                {/* Connecting lines */}
                <div style={{ 
                  position: 'absolute', 
                  top: '14px', 
                  left: '14px', 
                  right: '14px', 
                  height: '2px', 
                  background: '#E5E7EB', 
                  zIndex: 0 
                }} />
                
                {steps.map((step, idx) => {
                  const isCompleted = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const isActive = isCompleted || isCurrent;
                  
                  return (
                    <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, width: '25%' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isActive ? '#1D9E75' : '#E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        border: isCurrent ? '2px solid #fff' : 'none',
                        boxShadow: isCurrent ? '0 0 0 2px #1D9E75' : 'none'
                      }}>
                        {isActive && <span>✓</span>}
                      </div>
                      <div style={{ 
                        marginTop: '8px', 
                        fontSize: '11px', 
                        textTransform: 'capitalize',
                        color: isActive ? '#1D9E75' : '#9CA3AF',
                        fontWeight: isActive ? '600' : '400'
                      }}>
                        {step}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })
      )}
      <style>
        {`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(29, 158, 117, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(29, 158, 117, 0); }
            100% { box-shadow: 0 0 0 0 rgba(29, 158, 117, 0); }
          }
        `}
      </style>
    </div>
  );
}

export default OrderTrack;
