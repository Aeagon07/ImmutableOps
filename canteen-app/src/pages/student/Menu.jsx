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

// ─── Style tokens ─────────────────────────────────────────────────────────────
const GREEN    = '#1D9E75';
const DARK_RED = '#A32D2D';
const BORDER   = '#E5E7EB';
const GRAY     = '#6B7280';

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavBar({ user, onLogout }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 52,
        background: '#fff',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      }}
    >
      {/* Logo */}
      <span style={{ fontSize: 18, fontWeight: 700, color: GREEN, letterSpacing: '-0.3px' }}>
        🍽 CaféSync
      </span>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
          Hello, {user?.name || 'Student'} 👋
        </span>
        <button
          id="btn-logout"
          onClick={onLogout}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: DARK_RED,
            fontSize: 13,
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: 6,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

function RecommendationBanner({ slot, menuItems }) {
  // Find emojis of recommended items that exist in the menu
  const recPills = slot.items.map(name => {
    const found = menuItems.find(
      m => m.name.toLowerCase() === name.toLowerCase()
    );
    return { name, emoji: found ? found.emoji : null };
  });

  return (
    <div
      style={{
        background: '#E1F5EE',
        border: '1px solid #5DCAA5',
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        animation: 'fadeSlideIn 0.4s ease',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: '#155e45', marginRight: 4, flexShrink: 0 }}>
        {slot.label}
      </span>
      {recPills.map(pill => (
        <span
          key={pill.name}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#fff',
            border: '1px solid #5DCAA5',
            borderRadius: 20,
            padding: '3px 10px',
            fontSize: 12,
            fontWeight: 600,
            color: '#155e45',
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
    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
      {categories.map(cat => {
        const isActive = cat === active;
        return (
          <button
            key={cat}
            id={`filter-${cat.toLowerCase()}`}
            onClick={() => onChange(cat)}
            style={{
              padding: '7px 16px',
              borderRadius: 20,
              border: isActive ? 'none' : `1px solid ${BORDER}`,
              background: isActive ? GREEN : '#fff',
              color: isActive ? '#fff' : '#374151',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 2px 8px rgba(29,158,117,0.3)' : 'none',
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}

function MenuItemCard({ item, cartEntry, onAdd, onInc, onDec, isRecommended }) {
  const [pressed, setPressed] = useState(false);

  const cardStyle = {
    background: '#fff',
    borderRadius: 12,
    padding: 14,
    border: isRecommended
      ? `1.5px solid ${GREEN}`
      : `1px solid ${BORDER}`,
    boxShadow: isRecommended
      ? `0 0 0 3px rgba(29,158,117,0.12), 0 1px 3px rgba(0,0,0,0.06)`
      : '0 1px 3px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    transform: pressed ? 'scale(0.97)' : 'scale(1)',
    cursor: 'default',
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = isRecommended
          ? `0 0 0 3px rgba(29,158,117,0.18), 0 4px 12px rgba(0,0,0,0.1)`
          : '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isRecommended
          ? `0 0 0 3px rgba(29,158,117,0.12), 0 1px 3px rgba(0,0,0,0.06)`
          : '0 1px 3px rgba(0,0,0,0.06)';
      }}
    >
      {/* Emoji */}
      <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 8, lineHeight: 1 }}>
        {item.emoji}
      </div>

      {/* Name */}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 4, textAlign: 'center' }}>
        {item.name}
      </div>

      {/* Price + Prep row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: GREEN, fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>
          ₹{item.price}
        </span>
        <span style={{ color: GRAY, fontSize: 11 }}>
          {item.prepTime} min
        </span>
      </div>

      {/* Cart controls */}
      {!cartEntry ? (
        <button
          id={`add-${item.id}`}
          onClick={() => onAdd(item)}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          style={{
            width: '100%',
            padding: '8px 0',
            background: GREEN,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'background 0.2s',
            letterSpacing: '0.2px',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#17896a')}
          onMouseLeave={e => (e.currentTarget.style.background = GREEN)}
        >
          + Add
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <button
            id={`dec-${item.id}`}
            onClick={() => onDec(item.id)}
            style={{
              flex: 1,
              padding: '7px 0',
              background: '#F3F4F6',
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              color: '#374151',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
            onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
          >
            −
          </button>
          <span
            style={{
              minWidth: 28,
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 15,
              color: GREEN,
            }}
          >
            {cartEntry.qty}
          </span>
          <button
            id={`inc-${item.id}`}
            onClick={() => onInc(item.id)}
            style={{
              flex: 1,
              padding: '7px 0',
              background: GREEN,
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              color: '#fff',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#17896a')}
            onMouseLeave={e => (e.currentTarget.style.background = GREEN)}
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
        height: 60,
        background: '#fff',
        borderTop: `1px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 200,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.07)',
        animation: 'slideUp 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>
          🛒 {totalQty} item{totalQty !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: 12, color: GRAY, fontFamily: 'monospace' }}>
          ₹{totalPrice}
        </span>
      </div>

      <button
        id="btn-checkout"
        onClick={onCheckout}
        style={{
          background: GREEN,
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '10px 20px',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'background 0.2s, transform 0.1s',
          boxShadow: '0 2px 8px rgba(29,158,117,0.35)',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#17896a')}
        onMouseLeave={e => (e.currentTarget.style.background = GREEN)}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        Checkout →
      </button>
    </div>
  );
}

// ─── Keyframes injected once ─────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideUp {
    from { transform: translateY(60px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Menu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuItems,   setMenuItems]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [cartItems,   setCartItems]   = useState([]); // [{id, name, price, qty, prepTime}]

  const timeSlot   = getTimeSlot();
  const categories = ['All', 'Snacks', 'Meals', 'Beverages'];

  // ── Inject keyframes once ──────────────────────────────────────────────────
  useEffect(() => {
    const styleId = 'cafesync-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []);

  // ── Fetch menu from Firestore ─────────────────────────────────────────────
  useEffect(() => {
    async function fetchMenu() {
      try {
        setLoading(true);
        const q    = query(collection(db, 'menu'), orderBy('displayOrder', 'asc'));
        const snap = await getDocs(q);
        const items = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(item => item.available === true);
        setMenuItems(items);
      } catch (err) {
        console.error('Menu fetch error:', err);
        setError('Failed to load menu. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filteredItems = activeFilter === 'All'
    ? menuItems
    : menuItems.filter(i => i.category === activeFilter);

  // ── Recommended names set (lowercase) ─────────────────────────────────────
  const recNames = new Set(timeSlot.items.map(n => n.toLowerCase()));

  // ── Cart helpers ──────────────────────────────────────────────────────────
  function getCartEntry(id) {
    return cartItems.find(c => c.id === id) || null;
  }

  function addItem(item) {
    setCartItems(prev => {
      const exists = prev.find(c => c.id === item.id);
      if (exists) {
        return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, prepTime: item.prepTime }];
    });
  }

  function incrementItem(id) {
    setCartItems(prev =>
      prev.map(c => c.id === id ? { ...c, qty: c.qty + 1 } : c)
    );
  }

  function decrementItem(id) {
    setCartItems(prev => {
      const entry = prev.find(c => c.id === id);
      if (!entry) return prev;
      if (entry.qty === 1) return prev.filter(c => c.id !== id);
      return prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c);
    });
  }

  // ── Checkout ──────────────────────────────────────────────────────────────
  function handleCheckout() {
    navigate('/student/cart', { state: { cartItems } });
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    try { await logout(); } catch (e) { console.error(e); }
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  const hasCart = cartItems.length > 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F9FAFB',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        paddingBottom: hasCart ? 72 : 24,
      }}
    >
      {/* NavBar */}
      <NavBar user={user} onLogout={handleLogout} />

      {/* Content */}
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '16px 14px 0' }}>

        {/* Page heading */}
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 4 }}>
          Today's Menu
        </h1>
        <p style={{ fontSize: 13, color: GRAY, marginBottom: 16, marginTop: 0 }}>
          Fresh items, updated daily 🌿
        </p>

        {/* Recommendation Banner */}
        <RecommendationBanner slot={timeSlot} menuItems={menuItems} />

        {/* Category Filters */}
        <CategoryFilters
          categories={categories}
          active={activeFilter}
          onChange={setActiveFilter}
        />

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: GRAY }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: `3px solid ${BORDER}`,
                borderTop: `3px solid ${GREEN}`,
                borderRadius: '50%',
                margin: '0 auto 12px',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: 13 }}>Loading menu…</span>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 10,
              padding: '14px 16px',
              textAlign: 'center',
              color: '#991B1B',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredItems.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 0',
              color: GRAY,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>🍽</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No items in this category</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Try switching to "All" filters</div>
          </div>
        )}

        {/* Menu grid */}
        {!loading && !error && filteredItems.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            {filteredItems.map(item => (
              <MenuItemCard
                key={item.id}
                item={item}
                cartEntry={getCartEntry(item.id)}
                onAdd={addItem}
                onInc={incrementItem}
                onDec={decrementItem}
                isRecommended={recNames.has(item.name.toLowerCase())}
              />
            ))}
          </div>
        )}
      </main>

      {/* Fixed cart bar */}
      {hasCart && (
        <CartBottomBar cartItems={cartItems} onCheckout={handleCheckout} />
      )}
    </div>
  );
}
