import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
];

function getSlotIndex(dateObj) {
  const h = dateObj.getHours();
  const m = dateObj.getMinutes();
  if (h < 8 || h >= 20) return -1; 
  return (h - 8) * 2 + (m >= 30 ? 1 : 0);
}

export default function LoadChart() {
  const navigate = useNavigate();
  const [slotCounts, setSlotCounts] = useState(new Array(TIME_SLOTS.length).fill(0));
  const [totalToday, setTotalToday] = useState(0);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'orders'),
      where('createdAt', '>=', today)
    );

    const unsubscribe = onSnapshot(q, snap => {
      const counts = new Array(TIME_SLOTS.length).fill(0);
      let countToday = 0;

      snap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'done') return; 
        
        countToday++;
        const pickupDate = data.pickupTime ? new Date(data.pickupTime) : 
                           (data.scheduledStart?.toDate ? data.scheduledStart.toDate() : new Date());

        const idx = getSlotIndex(pickupDate);
        if (idx !== -1) {
          counts[idx]++;
        }
      });
      setSlotCounts(counts);
      setTotalToday(countToday);
    });

    return () => unsubscribe();
  }, []);

  const data = {
    labels: TIME_SLOTS,
    datasets: [
      {
        label: 'Active Orders per 30m Slot',
        data: slotCounts,
        backgroundColor: slotCounts.map(c => c > 5 ? '#A32D2D' : '#1D9E75'),
        borderRadius: 4,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        titleFont: { size: 13, family: "'Inter', sans-serif" },
        bodyFont: { size: 13, family: "'Inter', sans-serif" },
        callbacks: {
          label: (ctx) => `Orders: ${ctx.raw}`
        }
      }
    },
    scales: {
      y: { beginAtZero: true, suggestedMax: 10, ticks: { precision: 0 } },
      x: { ticks: { maxRotation: 45, minRotation: 45, color: '#6B7280', font: { size: 11 } } }
    }
  };

  const currentIdx = getSlotIndex(new Date());
  const currentLoad = currentIdx >= 0 ? slotCounts[currentIdx] : 0;
  const isOverload = currentLoad > 5;

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F6', paddingBottom: '80px' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, height: '52px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#1D9E75' }}>🍽 CaféSync</span>
        <button onClick={() => navigate('/chef/queue')} style={{ background: 'none', border: 'none', color: '#374151', fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'opacity 0.15s' }}>
          Back to Queue
        </button>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '20px' }}>Kitchen Load Forecast</h1>

        {isOverload && (
          <div style={{ background: '#FCEBEB', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', color: '#A32D2D', fontWeight: 600, fontSize: '13px' }}>
            ⚠ Current 30-min slot is overloaded (&gt;5 orders).
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.02em', fontWeight: 600, marginBottom: '4px' }}>Active Orders Today</span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>{totalToday}</span>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <span style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.02em', fontWeight: 600, marginBottom: '4px' }}>Current Slot Load</span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: isOverload ? '#A32D2D' : '#1D9E75' }}>{currentLoad}</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '14px 16px', height: '400px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <Bar data={data} options={options} />
        </div>
      </main>
    </div>
  );
}
