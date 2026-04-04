import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ pickupTimeISO, status }) => {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (status !== 'preparing') return;
    
    const calculateRemaining = () => new Date(pickupTimeISO) - Date.now();
    setRemaining(calculateRemaining());
    
    const interval = setInterval(() => {
      setRemaining(calculateRemaining());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [pickupTimeISO, status]);

  if (status !== 'preparing') return null;
  if (remaining === null) return null;

  if (remaining <= 0) {
    return (
      <div style={{ color: '#1D9E75', fontWeight: 600, fontFamily: 'monospace', fontSize: '16px' }}>
        Should be ready now! 🎉
      </div>
    );
  }

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  let color = '#1D9E75'; // green if mins > 5
  if (mins < 2) {
    color = '#dc2626'; // red if < 2 min
  } else if (mins >= 2 && mins <= 5) {
    color = '#ea580c'; // orange if 2-5 min
  }

  return (
    <div style={{ color: color, fontFamily: 'monospace', fontSize: '16px', fontWeight: 600 }}>
      ⏱ Ready in: {display}
    </div>
  );
};

export default CountdownTimer;
