import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Sun, Sunrise, CloudSun, ShoppingCart, Plus, Minus } from 'lucide-react';

function getTimeSlot() {
  const hour = new Date().getHours();
  const minute = new Date().getMinutes();
  const totalMinutes = hour * 60 + minute;

  if (totalMinutes < 11 * 60) return { label: 'Good morning! Breakfast picks', icon: Sunrise, items: ['Chai', 'Sandwich', 'Samosa'] };
  else if (totalMinutes <= 14 * 60 + 30) return { label: 'Lunch rush! Popular now', icon: Sun, items: ['Veg Thali', 'Misal Pav', 'Juice'] };
  else return { label: 'Afternoon snacks', icon: CloudSun, items: ['Coffee', 'Vada Pav', 'Samosa'] };
}

function CategoryFilters({ categories, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '10px', padding: '16px', marginBottom: '32px', flexWrap: 'wrap', position: 'sticky', top: '10px', zIndex: 10, background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(16px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
      {categories.map(cat => {
        const isActive = cat === active;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            style={{ position: 'relative', padding: '10px 24px', borderRadius: '30px', border: 'none', background: 'transparent', color: isActive ? '#fff' : '#6B7280', fontWeight: 700, fontSize: '14px', cursor: 'pointer', outline: 'none', zIndex: 1 }}
          >
            {isActive && <motion.div layoutId="activeCat" style={{ position: 'absolute', inset: 0, background: '#1D9E75', borderRadius: '30px', zIndex: -1, boxShadow: '0 4px 12px rgba(29,158,117,0.3)' }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />}
            <span style={{ position: 'relative', zIndex: 1 }}>{cat}</span>
          </button>
        );
      })}
    </div>
  );
}

const listVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300 } }
};

function MenuItemCard({ item, cartEntry, onAdd, onInc, onDec }) {
  return (
    <motion.div variants={itemVariants} whileHover={{ y: -6, boxShadow: '0 12px 24px rgba(0,0,0,0.06)' }} style={{ background: '#FFFFFF', borderRadius: '20px', padding: '20px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
      <motion.div whileHover={{ scale: 1.1, rotate: 5 }} style={{ fontSize: '56px', textAlign: 'center', marginBottom: '16px', userSelect: 'none' }}>{item.emoji}</motion.div>
      <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '8px', textAlign: 'center' }}>{item.name}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#F9FAFB', padding: '8px 12px', borderRadius: '12px' }}>
        <span style={{ color: '#1D9E75', fontWeight: 800, fontFamily: "'Courier New', monospace", fontSize: '16px' }}>₹{item.price}</span>
        <span style={{ color: '#6B7280', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}><Clock size={14} strokeWidth={3} /> {item.prepTime}m</span>
      </div>

      {!cartEntry ? (
        <motion.button whileHover={{ scale: 1.02, backgroundColor: '#E1F5EE' }} whileTap={{ scale: 0.96 }} onClick={() => onAdd(item)} style={{ background: 'transparent', color: '#1D9E75', border: '2px solid #1D9E75', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: 800, width: '100%', cursor: 'pointer' }}>Add to Cart</motion.button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => onDec(item.id)} style={{ flex: 1, padding: '12px 0', background: '#FCEBEB', border: 'none', borderRadius: '12px', color: '#A32D2D', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}><Minus size={18} strokeWidth={3} /></motion.button>
          <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: 800, fontSize: '16px', color: '#111827' }}>{cartEntry.qty}</span>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => onInc(item.id)} style={{ flex: 1, padding: '12px 0', background: '#1D9E75', border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}><Plus size={18} strokeWidth={3} /></motion.button>
        </div>
      )}
    </motion.div>
  );
}

function CartBottomBar({ cartItems, onCheckout }) {
  const totalQty = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  return (
    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} style={{ position: 'fixed', bottom: '24px', right: '24px', left: 'calc(280px + 24px)', background: '#111827', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', zIndex: 200, boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={16} strokeWidth={2.5} /> {totalQty} items selected</span>
        <span style={{ fontSize: '20px', color: '#FFFFFF', fontFamily: "'Courier New', monospace", fontWeight: 800 }}>₹{totalPrice}</span>
      </div>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onCheckout} style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 28px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(29,158,117,0.4)' }}>
        Proceed to Cart <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
      </motion.button>
    </motion.div>
  );
}

export default function Menu() {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [cartItems, setCartItems] = useState([]); 

  const timeSlot = getTimeSlot();
  const SlotIcon = timeSlot.icon;
  const categories = ['All', 'Snacks', 'Meals', 'Beverages'];

  useEffect(() => {
    async function fetchMenu() {
      try {
        const q = query(collection(db, 'menu'), orderBy('displayOrder', 'asc'));
        const snap = await getDocs(q);
        setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(item => item.available));
      } finally { setLoading(false); }
    }
    fetchMenu();
  }, []);

  const filteredItems = activeFilter === 'All' ? menuItems : menuItems.filter(i => i.category === activeFilter);
  const hasCart = cartItems.length > 0;

  function addItem(item) { setCartItems(prev => { const exists = prev.find(c => c.id === item.id); return exists ? prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c) : [...prev, { ...item, qty: 1 }]; }); }
  function incrementItem(id) { setCartItems(prev => prev.map(c => c.id === id ? { ...c, qty: c.qty + 1 } : c)); }
  function decrementItem(id) { setCartItems(prev => { const entry = prev.find(c => c.id === id); if (!entry) return prev; return entry.qty === 1 ? prev.filter(c => c.id !== id) : prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c); }); }

  return (
    <div style={{ paddingBottom: hasCart ? '120px' : '30px' }}>
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
        
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#111827', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Taste the Best</h1>
          <p style={{ fontSize: '16px', color: '#6B7280', margin: '0 0 32px 0', fontWeight: 600 }}>Explore our massive culinary catalog 🌱</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} style={{ background: 'linear-gradient(135deg, #1D9E75 0%, #111827 100%)', borderRadius: '24px', padding: '24px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '20px', color: '#fff', boxShadow: '0 10px 30px rgba(29,158,117,0.2)' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px', borderRadius: '16px' }}><SlotIcon size={32} strokeWidth={2.5} /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '20px', marginBottom: '4px' }}>{timeSlot.label}</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', opacity: 0.9 }}>
              {timeSlot.items.map(name => {
                const found = menuItems.find(m => m.name.toLowerCase() === name.toLowerCase());
                return <span key={name} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '20px', padding: '4px 12px', fontSize: '13px', fontWeight: 700 }}>{found?.emoji} {name}</span>;
              })}
            </div>
          </div>
        </motion.div>
        
        <CategoryFilters categories={categories} active={activeFilter} onChange={setActiveFilter} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#6B7280', fontSize: '18px', fontWeight: 600 }}>Loading culinary catalog...</div>
        ) : (
          <motion.div variants={listVariants} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
            <AnimatePresence mode="popLayout">
              {filteredItems.map(item => (
                <MenuItemCard key={item.id} item={item} cartEntry={cartItems.find(c => c.id === item.id)} onAdd={addItem} onInc={incrementItem} onDec={decrementItem} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {hasCart && <CartBottomBar cartItems={cartItems} onCheckout={() => navigate('/student/cart', { state: { cartItems } })} />}
      </AnimatePresence>

      <style>{`@media(max-width: 768px) { div[style*="left: calc(280px + 24px)"] { left: 24px !important; } }`}</style>
    </div>
  );
}
