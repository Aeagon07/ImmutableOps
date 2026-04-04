import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hourglass } from 'lucide-react';

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
      setTimeLeft(`${m}m ${s.toString().padStart(2, '0')}s`);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [pickupTimeISO, status]);

  if (status !== 'preparing' || !timeLeft) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: isLate ? '#FCEBEB' : '#FFFFFF',
          color: isLate ? '#A32D2D' : '#1D9E75',
          border: `1px solid ${isLate ? '#FCA5A5' : '#E5E7EB'}`,
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '13px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: "'Courier New', monospace",
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
      >
        <motion.div
           animate={{ rotate: [0, 180, 180], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }}
        >
          <Hourglass size={14} />
        </motion.div>
        {timeLeft} {isLate ? '' : 'left'}
      </motion.div>
    </AnimatePresence>
  );
}
