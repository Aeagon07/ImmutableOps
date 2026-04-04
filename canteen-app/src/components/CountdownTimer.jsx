import { useState, useEffect } from 'react';

/**
 * CountdownTimer
 * Props:
 *   pickupTimeISO {string}  — ISO timestamp for when the student picks up
 *   status        {string}  — current order status
 *
 * Only renders when status === 'preparing'.
 * Color: green if > 5 min, orange if 2–5 min, red if < 2 min.
 */
function CountdownTimer({ pickupTimeISO, status }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const ms = new Date(pickupTimeISO) - Date.now();
      setRemaining(ms);
    }, 1000);

    // Fire immediately so there's no 1-second delay on first render
    const ms = new Date(pickupTimeISO) - Date.now();
    setRemaining(ms);

    return () => clearInterval(interval);
  }, [pickupTimeISO]);

  // Only show during preparation
  if (status !== 'preparing') return null;

  // Already past pickup time
  if (remaining !== null && remaining <= 0) {
    return (
      <span
        style={{
          fontFamily:  'monospace',
          fontSize:    16,
          fontWeight:  600,
          color:       '#1D9E75',
        }}
      >
        Should be ready now! 🎉
      </span>
    );
  }

  if (remaining === null) return null;

  const mins    = Math.floor(remaining / 60000);
  const secs    = Math.floor((remaining % 60000) / 1000);
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Color urgency
  const color = mins > 5 ? '#1D9E75' : mins >= 2 ? '#D97706' : '#DC2626';

  return (
    <span
      style={{
        fontFamily: 'monospace',
        fontSize:   16,
        fontWeight: 600,
        color,
        transition: 'color 0.5s ease',
      }}
    >
      ⏱ Ready in: {display}
    </span>
  );
}

export default CountdownTimer;
