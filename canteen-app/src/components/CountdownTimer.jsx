import { useState, useEffect } from 'react';

/**
 * Renders a countdown logic given a timezone-agnostic ISO string pickup Time.
 */
export default function CountdownTimer({ pickupTimeISO, status }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isLate, setIsLate] = useState(false);

  useEffect(() => {
    if (!pickupTimeISO || status !== 'preparing') {
      setTimeLeft('');
      setIsLate(false);
      return;
    }

    const intervalId = setInterval(() => {
      const now = new Date();
      const pickup = new Date(pickupTimeISO);
      const diffMs = pickup - now;
      
      if (diffMs <= 0) {
        setTimeLeft('Should be ready!');
        setIsLate(true);
        return;
      }
      
      setIsLate(false);
      const totalSec = Math.floor(diffMs / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      setTimeLeft(`${m}m ${s.toString().padStart(2, '0')}s remaining`);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [pickupTimeISO, status]);

  if (status !== 'preparing' || !timeLeft) return null;

  return (
    <div style={{
      background: isLate ? '#FCEBEB' : '#FFFFFF',
      color: isLate ? '#A32D2D' : '#1D9E75',
      border: `1px solid ${isLate ? '#FCA5A5' : '#E5E7EB'}`,
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '13px',
      fontWeight: 600,
      display: 'inline-block',
      fontFamily: "'Courier New', monospace"
    }}>
      ⏳ {timeLeft} 
    </div>
  );
}
