import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { History as HistoryIcon, Sparkles, Utensils, RefreshCw, ShoppingBag } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function History() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      if (!user?.uid) return;
      try {
        const q = query(collection(db, 'orders'), where('studentId', '==', user.uid));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.status === 'done')
        .sort((a,b) => {
          const at = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const bt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return bt - at;
        });
        setOrders(docs);
        
        // Calculate favorites
        const itemCounts = {};
        docs.forEach(o => {
          (o.items || []).forEach(i => {
            itemCounts[i.name] = (itemCounts[i.name] || 0) + i.qty;
          });
        });
        const favs = Object.entries(itemCounts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(arr => arr[0]);
        setFavorites(favs);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [user]);

  async function generateAIRecommendation() {
    if (orders.length === 0) return;
    setLoadingAi(true);
    try {
      const functions = getFunctions();
      const getAIInsights = httpsCallable(functions, 'getAIInsights');
      
      const payload = {
        orderItems: [], // passing empty to trigger a different prompt or we can pass past items
        activeOrders: 0,
        pickupTimeDisplay: 'N/A',
        startDisplay: 'N/A',
        prepEstimate: 0,
        historyMode: true,
        pastItems: favorites.join(', ')
      };

      const result = await getAIInsights(payload);
      setAiSuggestion(result.data.tip || "Try pairing your favorites with a fresh cold beverage!");
    } catch (e) {
      console.error(e);
      setAiSuggestion("Based on your history, a Cold Coffee and Sandwich combo matches your taste profile perfectly!");
    } finally {
      setLoadingAi(false);
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{ background: '#EDE9FE', padding: '10px', borderRadius: '12px' }}>
          <HistoryIcon color="#7C3AED" size={24} strokeWidth={2.5} />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>Order History</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
        
        {/* Main Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Loading past orders...</div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', background: '#FFFFFF', border: '1px dashed #D1D5DB', borderRadius: '16px', padding: '48px 24px' }}>
              <ShoppingBag size={48} color="#E5E7EB" style={{ marginBottom: '16px' }} />
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>No past orders found</div>
              <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>Your completed meals will show up here.</div>
            </div>
          ) : (
            <AnimatePresence>
              {orders.map((o, i) => {
                const date = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
                return (
                  <motion.div key={o.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>{date.toLocaleDateString()} at {date.toLocaleTimeString([], {timeStyle: 'short'})}</span>
                      <span style={{ fontSize: '12px', background: '#E1F5EE', color: '#1D9E75', padding: '4px 10px', borderRadius: '20px', fontWeight: 800 }}>COMPLETED</span>
                    </div>
                    <div style={{ fontSize: '15px', color: '#111827', fontWeight: 600, marginBottom: '12px', lineHeight: 1.6 }}>
                      {(o.items || []).map(x => `${x.qty}x ${x.name}`).join(', ')}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px dashed #E5E7EB' }}>
                      <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>Total Paid:</span>
                      <span style={{ fontSize: '16px', color: '#111827', fontWeight: 800, fontFamily: "'Courier New', monospace" }}>₹{o.totalPrice}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Action / AI Panel */}
        {orders.length > 0 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ position: 'sticky', top: '24px' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
              
              <div style={{ padding: '24px', background: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Sparkles size={20} />
                  <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>AI Taste Engine</h2>
                </div>
                <p style={{ fontSize: '13px', lineHeight: 1.6, margin: '0 0 20px 0', opacity: 0.9 }}>
                  Based on your `{favorites.join(', ')}` addiction, CaféSync's AI can recommend your next meal.
                </p>
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={generateAIRecommendation} disabled={loadingAi}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#FFFFFF', color: '#7C3AED', fontWeight: 800, fontSize: '13px', cursor: loadingAi ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {loadingAi ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}><RefreshCw size={16} /></motion.div> : <><Utensils size={16} /> Generate Suggestion</>}
                </motion.button>
              </div>

              <AnimatePresence>
                {aiSuggestion && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ padding: '24px', borderTop: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '12px', color: '#7C3AED', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>🤖 AI Says...</div>
                    <div style={{ fontSize: '14px', color: '#111827', fontWeight: 500, lineHeight: 1.6, fontStyle: 'italic' }}>"{aiSuggestion}"</div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}

      </div>

    </div>
  );
}
