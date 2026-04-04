import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

// ─── Time-based recommendation config ────────────────────────────────────────
function getTimeSlot() {
  const hour = new Date().getHours();
  const minute = new Date().getMinutes();
  const totalMinutes = hour * 60 + minute;

  if (totalMinutes < 11 * 60) {
    return {
      label: '☀ Good morning! Popular breakfast picks:',
      items: ['Chai', 'Sandwich', 'Samosa'],
    };
  } else if (totalMinutes <= 14 * 60 + 30) {
    return {
      label: '🍽 Lunch rush! Popular now:',
      items: ['Veg Thali', 'Misal Pav', 'Juice'],
    };
  } else {
    return {
      label: '☕ Afternoon snacks:',
      items: ['Coffee', 'Vada Pav', 'Samosa'],
    };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavBar({ user, onLogout }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: '52px',
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)' // subtle sticky distinction
      }}
    >
      <span style={{ fontSize: '16px', fontWeight: 700, color: '#1D9E75' }}>
        🍽 CaféSync
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: '#111827', fontWeight: 500 }}>
          {user?.name || 'Student'}
        </span>
        <button
          onClick={onLogout}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#A32D2D',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '4px 8px',
            transition: 'opacity 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

function RecommendationBanner({ slot, menuItems }) {
  const recPills = slot.items.map(name => {
    const found = menuItems.find(m => m.name.toLowerCase() === name.toLowerCase());
    return { name, emoji: found ? found.emoji : null };
  });

  return (
    <div
      style={{
        background: '#E1F5EE',
        border: '1px solid #5DCAA5',
        borderRadius: '12px',
        padding: '14px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}
    >
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#085041', marginRight: '4px' }}>
        {slot.label}
      </span>
      {recPills.map(pill => (
        <span
          key={pill.name}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: '#FFFFFF',
            border: '1px solid #5DCAA5',
            borderRadius: '20px',
            padding: '3px 10px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#085041',
            whiteSpace: 'nowrap',
          }}
        >
          {pill.emoji && <span>{pill.emoji}</span>}
          {pill.name}
        </span>
      ))}
    </div>
  );
}

function CategoryFilters({ categories, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
      {categories.map(cat => {
        const isActive = cat === active;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: isActive ? 'none' : '1px solid #E5E7EB',
              background: isActive ? '#1D9E75' : '#FFFFFF',
              color: isActive ? '#fff' : '#6B7280',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'opacity 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}

function MenuItemCard({ item, cartEntry, onAdd, onInc, onDec }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        padding: '14px 16px',
        marginBottom: '10px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ fontSize: '32px', textAlign: 'center', marginBottom: '8px' }}>
        {item.emoji}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px', textAlign: 'center' }}>
        {item.name}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ color: '#1D9E75', fontWeight: 600, fontFamily: "'Courier New', monospace", fontSize: '14px' }}>
          ₹{item.price}
        </span>
        <span style={{ color: '#6B7280', fontSize: '11px' }}>
          {item.prepTime} min
        </span>
      </div>

      {!cartEntry ? (
        <button
          onClick={() => onAdd(item)}
          style={{
            background: 'transparent',
            color: '#1D9E75',
            border: '1.5px solid #1D9E75',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 500,
            width: '100%',
            cursor: 'pointer',
            transition: 'opacity 0.15s, transform 0.1s'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          Add 
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <button
            onClick={() => onDec(item.id)}
            style={{
              flex: 1,
              padding: '10px 0',
              background: '#F5F7F6',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              color: '#374151',
            }}
          >
            −
          </button>
          <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: '#1D9E75' }}>
            {cartEntry.qty}
          </span>
          <button
            onClick={() => onInc(item.id)}
            style={{
              flex: 1,
              padding: '10px 0',
              background: '#1D9E75',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              color: '#fff',
            }}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

function CartBottomBar({ cartItems, onCheckout }) {
  const totalQty   = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 200,
        boxShadow: '0 -1px 3px rgba(0,0,0,0.06)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
          🛒 {totalQty} item{totalQty !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '13px', color: '#1D9E75', fontFamily: "'Courier New', monospace", fontWeight: 600 }}>
          ₹{totalPrice}
        </span>
      </div>

      <button
        onClick={onCheckout}
        style={{
          background: '#1D9E75',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontWeight: 500,
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        Checkout →
      </button>
    </div>
  );
}

export default function Menu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuItems,   setMenuItems]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [cartItems,   setCartItems]   = useState([]); 

  const timeSlot   = getTimeSlot();
  const categories = ['All', 'Snacks', 'Meals', 'Beverages'];

  useEffect(() => {
    async function fetchMenu() {
      try {
        setLoading(true);
        const q    = query(collection(db, 'menu'), orderBy('displayOrder', 'asc'));
        const snap = await getDocs(q);
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(item => item.available === true);
        setMenuItems(items);
      } catch (err) {
        console.error('Menu fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  const filteredItems = activeFilter === 'All'
    ? menuItems
    : menuItems.filter(i => i.category === activeFilter);

  function getCartEntry(id) {
    return cartItems.find(c => c.id === id) || null;
  }

  function addItem(item) {
    setCartItems(prev => {
      const exists = prev.find(c => c.id === item.id);
      if (exists) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, prepTime: item.prepTime }];
    });
  }

  function incrementItem(id) {
    setCartItems(prev => prev.map(c => c.id === id ? { ...c, qty: c.qty + 1 } : c));
  }

  function decrementItem(id) {
    setCartItems(prev => {
      const entry = prev.find(c => c.id === id);
      if (!entry) return prev;
      if (entry.qty === 1) return prev.filter(c => c.id !== id);
      return prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c);
    });
  }

  async function handleLogout() {
    await logout();
  }

  const hasCart = cartItems.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F6', paddingBottom: hasCart ? '80px' : '20px' }}>
      <NavBar user={user} onLogout={handleLogout} />

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 16px' }}>
        
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 4px 0' }}>Today's Menu</h1>
        <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 20px 0', lineHeight: 1.6 }}>Fresh items, ordered daily 🌱</p>

        <RecommendationBanner slot={timeSlot} menuItems={menuItems} />
        
        <CategoryFilters categories={categories} active={activeFilter} onChange={setActiveFilter} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280', fontSize: '13px' }}>Loading menu...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {filteredItems.map(item => (
              <MenuItemCard
                key={item.id}
                item={item}
                cartEntry={getCartEntry(item.id)}
                onAdd={addItem}
                onInc={incrementItem}
                onDec={decrementItem}
              />
            ))}
          </div>
        )}
      </main>

      {hasCart && <CartBottomBar cartItems={cartItems} onCheckout={() => navigate('/student/cart', { state: { cartItems } })} />}
    </div>
  );
}
