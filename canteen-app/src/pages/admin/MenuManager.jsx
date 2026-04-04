import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, LayoutDashboard, Users, LogOut, Plus, X, Edit3, Trash2, CheckCircle2, Circle } from 'lucide-react';

export default function MenuManager() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [items, setItems] = useState([]);
  const [isAdding, setIsAdding] = useState(false);

  const [newEmoji, setNewEmoji] = useState('🍔');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newPrep, setNewPrep] = useState('');
  const [newCategory, setNewCategory] = useState('Snacks');

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const q = query(collection(db, 'menu'), orderBy('displayOrder', 'asc'));
    const unsub = onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.displayOrder || 0)) + 1 : 0;
    try {
      await addDoc(collection(db, 'menu'), { emoji: newEmoji, name: newName, price: Number(newPrice), prepTime: Number(newPrep), category: newCategory, available: true, displayOrder: nextOrder });
      setIsAdding(false); setNewName(''); setNewPrice(''); setNewPrep('');
    } catch (err) { console.error(err); }
  }

  async function handleToggleAvailable(id, currentStat) {
    try { await updateDoc(doc(db, 'menu', id), { available: !currentStat }); } catch (e) { console.error(e); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete menu item permanently?')) return;
    try { await deleteDoc(doc(db, 'menu', id)); } catch (e) { console.error(e); }
  }

  function startEdit(item) {
    setEditId(item.id);
    setEditForm({ emoji: item.emoji, name: item.name, price: item.price, prepTime: item.prepTime, category: item.category });
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'menu', editId), { emoji: editForm.emoji, name: editForm.name, price: Number(editForm.price), prepTime: Number(editForm.prepTime), category: editForm.category });
      setEditId(null);
    } catch (err) { console.error(err); }
  }

  async function handleSeed() {
    if (!window.confirm('Inject 15 Zomato-style snacks to DB?')) return;
    const itemsToSeed = [
      { name: 'Paneer Tikka Roll', price: 120, prepTime: 12, emoji: '🌯', category: 'Snacks' },
      { name: 'Cold Coffee Classic', price: 90, prepTime: 5, emoji: '🥤', category: 'Beverages' },
      { name: 'Spicy Veg Momos', price: 80, prepTime: 15, emoji: '🥟', category: 'Snacks' },
      { name: 'Cheese Chutney Sandwich', price: 60, prepTime: 8, emoji: '🥪', category: 'Snacks' },
      { name: 'Butter Chicken Bowl', price: 180, prepTime: 20, emoji: '🍛', category: 'Meals' },
      { name: 'Masala Fries', price: 70, prepTime: 10, emoji: '🍟', category: 'Snacks' },
      { name: 'Hakka Noodles', price: 110, prepTime: 15, emoji: '🍜', category: 'Meals' },
      { name: 'Double Chocolate Brownie', price: 90, prepTime: 2, emoji: '🍫', category: 'Snacks' },
      { name: 'Fresh Lime Soda', price: 40, prepTime: 5, emoji: '🍋', category: 'Beverages' },
      { name: 'Veg Hakka Manchurian', price: 130, prepTime: 18, emoji: '🍲', category: 'Meals' },
      { name: 'Aloo Tikki Burger', price: 75, prepTime: 10, emoji: '🍔', category: 'Snacks' },
      { name: 'Oreo Milkshake', price: 110, prepTime: 8, emoji: '🥛', category: 'Beverages' },
      { name: 'Veg Biryani', price: 150, prepTime: 25, emoji: '🍚', category: 'Meals' },
      { name: 'Pav Bhaji', price: 100, prepTime: 15, emoji: '🥘', category: 'Meals' },
      { name: 'Mango Lassi', price: 60, prepTime: 5, emoji: '🥭', category: 'Beverages' }
    ];
    try {
      const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.displayOrder || 0)) + 1 : 0;
      for (let i = 0; i < itemsToSeed.length; i++) {
        await addDoc(collection(db, 'menu'), { ...itemsToSeed[i], available: true, displayOrder: nextOrder + i });
      }
      alert('Data seeded successfully!');
    } catch (err) { console.error(err); }
  }

  const grouped = items.reduce((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});

  return (
    <div style={{ paddingBottom: '80px' }}>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <style>{`
          .add-grid { grid-template-columns: 80px 2fr 1fr 1fr 1.5fr; }
          .edit-grid { grid-template-columns: 60px 2fr 1fr 1fr 1.5fr min-content; }
          @media (max-width: 800px) {
            .add-grid, .edit-grid { grid-template-columns: 1fr; }
          }
        `}</style>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0 }}>Inventory Catalog</h1>
            <p style={{ color: '#6B7280', fontSize: '14px', margin: '4px 0 0 0', fontWeight: 500 }}>Manage prices, items, and prep times in real-time.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSeed} style={{ background: '#FCEBEB', color: '#A32D2D', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '12px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Seed Demo Data
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsAdding(!isAdding)} style={{ background: isAdding ? '#F3F4F6' : '#7C3AED', color: isAdding ? '#111827' : '#fff', border: 'none', borderRadius: '12px', padding: '12px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: isAdding ? 'none' : '0 4px 12px rgba(124,58,237,0.3)' }}>
              {isAdding ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Add Item</>}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }} style={{ background: '#FFFFFF', border: '2px solid #7C3AED', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 10px 25px rgba(124,58,237,0.1)', overflow: 'hidden' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={20} color="#7C3AED" /> Create New Listing</h2>
              <form onSubmit={handleAdd} className="add-grid" style={{ display: 'grid', gap: '12px', alignItems: 'end' }}>
                <div><label style={labelStyle}>Emoji</label><input required maxLength="2" value={newEmoji} onChange={e=>setNewEmoji(e.target.value)} style={{ ...inputStyle, textAlign: 'center', fontSize: '20px' }} /></div>
                <div><label style={labelStyle}>Name</label><input required value={newName} onChange={e=>setNewName(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Price (₹)</label><input required type="number" min="0" value={newPrice} onChange={e=>setNewPrice(e.target.value)} style={{...inputStyle, fontFamily: "'Courier New', monospace", fontWeight: 700}} /></div>
                <div><label style={labelStyle}>Prep (m)</label><input required type="number" min="1" value={newPrep} onChange={e=>setNewPrep(e.target.value)} style={{...inputStyle, fontFamily: "'Courier New', monospace", fontWeight: 700}} /></div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={newCategory} onChange={e=>setNewCategory(e.target.value)} style={{...inputStyle, cursor: 'pointer', appearance: 'none'}}>
                    <option>Snacks</option><option>Meals</option><option>Beverages</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 32px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Publish to Menu</motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {['Snacks', 'Meals', 'Beverages'].map((cat, idx) => {
          const catItems = grouped[cat] || [];
          if (catItems.length === 0) return null;
          
          return (
            <motion.div key={cat} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', marginLeft: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7C3AED' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>{cat}</h2>
              </div>
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '0 20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                {catItems.map((item, i) => {
                  const isEditing = editId === item.id;
                  const availColor = item.available ? '#FC8019' : '#9CA3AF';
                  return (
                    <div key={item.id} style={{ borderBottom: i !== catItems.length - 1 ? '1px solid #F3F4F6' : 'none', padding: '20px 0', opacity: item.available ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                      {!isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                           <span style={{ fontSize: '32px' }}>{item.emoji}</span>
                           <div style={{ flex: 1 }}>
                             <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>{item.name}</div>
                             <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 600, display: 'flex', gap: '12px' }}>
                               <span style={{ color: '#FC8019', fontFamily: "'Courier New', monospace" }}>₹{item.price}</span>
                               <span style={{ fontFamily: "'Courier New', monospace" }}>{item.prepTime} min</span>
                             </div>
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                             <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleToggleAvailable(item.id, item.available)} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: availColor, cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', background: item.available ? '#FFF0E5' : '#F3F4F6' }}>
                               {item.available ? <CheckCircle2 size={16} /> : <Circle size={16} />} {item.available ? 'Live' : 'Hidden'}
                             </motion.button>
                             <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => startEdit(item)} style={{ ...actionBtnStyle, color: '#7C3AED', background: '#EDE9FE' }}><Edit3 size={16} /></motion.button>
                             <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(item.id)} style={{ ...actionBtnStyle, color: '#A32D2D', background: '#FCEBEB' }}><Trash2 size={16} /></motion.button>
                           </div>
                        </div>
                      ) : (
                        <form onSubmit={saveEdit} className="edit-grid" style={{ display: 'grid', gap: '12px', alignItems: 'end' }}>
                          <input required maxLength="2" value={editForm.emoji} onChange={e=>setEditForm({...editForm, emoji: e.target.value})} style={{ ...inputStyle, textAlign: 'center', fontSize: '18px' }} />
                          <input required value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} style={inputStyle} />
                          <input required type="number" value={editForm.price} onChange={e=>setEditForm({...editForm, price: e.target.value})} style={{...inputStyle, fontFamily: "'Courier New', monospace", fontWeight: 700}} />
                          <input required type="number" value={editForm.prepTime} onChange={e=>setEditForm({...editForm, prepTime: e.target.value})} style={{...inputStyle, fontFamily: "'Courier New', monospace", fontWeight: 700}} />
                          <select value={editForm.category} onChange={e=>setEditForm({...editForm, category: e.target.value})} style={{...inputStyle, appearance: 'none', cursor: 'pointer'}}>
                            <option>Snacks</option><option>Meals</option><option>Beverages</option>
                          </select>
                          <div style={{ display: 'flex', gap: '8px' }}>
                             <motion.button whileTap={{ scale: 0.9 }} type="submit" style={{ ...actionBtnStyle, color: '#fff', background: '#FC8019' }}><CheckCircle2 size={18} /></motion.button>
                             <motion.button whileTap={{ scale: 0.9 }} type="button" onClick={() => setEditId(null)} style={{ ...actionBtnStyle, color: '#6B7280', background: '#F3F4F6' }}><X size={18} /></motion.button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </main>
    </div>
  );
}

const navLinkStyle = { background: '#F3F4F6', color: '#374151', border: 'none', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' };
const labelStyle = { display: 'block', fontSize: '11px', color: '#6B7280', letterSpacing: '0.02em', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' };
const inputStyle = { width: '100%', boxSizing: 'border-box', border: '2px solid #E5E7EB', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', ':focus': { borderColor: '#7C3AED' } };
const actionBtnStyle = { border: 'none', borderRadius: '10px', cursor: 'pointer', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
