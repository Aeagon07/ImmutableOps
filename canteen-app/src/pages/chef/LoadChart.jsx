import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { ChevronLeft, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
];

function getSlotIndex(dateObj) {
  const h = dateObj.getHours(), m = dateObj.getMinutes();
  if (h < 8 || h >= 20) return -1; 
  return (h - 8) * 2 + (m >= 30 ? 1 : 0);
}

export default function LoadChart() {
  const navigate = useNavigate();
  const [slotCounts, setSlotCounts] = useState(new Array(TIME_SLOTS.length).fill(0));
  const [totalToday, setTotalToday] = useState(0);

  useEffect(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const q = query(collection(db, 'orders'), where('createdAt', '>=', today));
    const unsubscribe = onSnapshot(q, snap => {
      const counts = new Array(TIME_SLOTS.length).fill(0);
      let countToday = 0;
      snap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'done') return; 
        countToday++;
        const pickupDate = data.pickupTime ? new Date(data.pickupTime) : (data.scheduledStart?.toDate ? data.scheduledStart.toDate() : new Date());
        const idx = getSlotIndex(pickupDate);
        if (idx !== -1) counts[idx]++;
      });
      setSlotCounts(counts);
      setTotalToday(countToday);
    });
    return () => unsubscribe();
  }, []);

  const data = {
    labels: TIME_SLOTS,
    datasets: [{
      label: 'Active Orders per 30m Slot',
      data: slotCounts,
      backgroundColor: slotCounts.map(c => c > 5 ? '#A32D2D' : '#FC8019'),
      borderRadius: 4,
    }]
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#111827', titleFont: { size: 14, family: "'Inter', sans-serif" }, bodyFont: { size: 14, family: "'Inter', sans-serif", weight: 'bold' }, padding: 12, cornerRadius: 8, callbacks: { label: (ctx) => `${ctx.raw} Orders` } }
    },
    scales: {
      y: { beginAtZero: true, suggestedMax: 10, ticks: { precision: 0, font: { family: "'Inter', sans-serif" } }, grid: { color: '#E5E7EB' }, border: { display: false } },
      x: { ticks: { maxRotation: 45, minRotation: 45, color: '#6B7280', font: { size: 11, family: "'Courier New', monospace", weight: 'bold' } }, grid: { display: false }, border: { display: false } }
    }
  };

  const currentIdx = getSlotIndex(new Date());
  const currentLoad = currentIdx >= 0 ? slotCounts[currentIdx] : 0;
  const isOverload = currentLoad > 5;

  return (
    <div style={{ paddingBottom: '80px' }}>
      <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
        
        {isOverload && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#FCEBEB', border: '2px solid #FCA5A5', borderRadius: '16px', padding: '16px', marginBottom: '24px', color: '#A32D2D', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(163,45,45,0.1)' }}>
            <AlertTriangle size={24} /> Current 30-min slot is overloaded (&gt;5 orders). Prioritize immediately.
          </motion.div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ background: '#FFF0E5', padding: '12px', borderRadius: '12px' }}><TrendingUp size={24} color="#FC8019" /></div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Total Active Today</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{totalToday}</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ background: isOverload ? '#FCEBEB' : '#FFF0E5', padding: '12px', borderRadius: '12px' }}><BarChart3 size={24} color={isOverload ? '#A32D2D' : '#FC8019'} /></div>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Load This Slot</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: isOverload ? '#A32D2D' : '#FC8019', lineHeight: 1 }}>{currentLoad} <span style={{ fontSize: '14px', color: '#6B7280' }}>/ 5</span></div>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '24px', height: '450px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 20px 0' }}>Forecast Timeline</h2>
          <div style={{ height: 'calc(100% - 40px)' }}>
            <Bar data={data} options={options} />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
