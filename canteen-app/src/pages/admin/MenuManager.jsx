import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

export default function MenuManager() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [items, setItems] = useState([]);
  const [isAdding, setIsAdding] = useState(false);

  // New item form
  const [newEmoji, setNewEmoji] = useState('🍔');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newPrep, setNewPrep] = useState('');
  const [newCategory, setNewCategory] = useState('Snacks');

  // Inline edit state
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const q = query(collection(db, 'menu'), orderBy('displayOrder', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.displayOrder || 0)) + 1 : 0;
    try {
      await addDoc(collection(db, 'menu'), {
        emoji: newEmoji,
        name: newName,
        price: Number(newPrice),
        prepTime: Number(newPrep),
        category: newCategory,
        available: true,
        displayOrder: nextOrder
      });
      setIsAdding(false);
      setNewName(''); setNewPrice(''); setNewPrep('');
    } catch (err) {
      console.error(err);
    }
  }

  async function handleToggleAvailable(id, currentStat) {
    try {
      await updateDoc(doc(db, 'menu', id), { available: !currentStat });
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete menu item permanently?')) return;
    try {
      await deleteDoc(doc(db, 'menu', id));
    } catch (e) {
      console.error(e);
    }
  }

  function startEdit(item) {
    setEditId(item.id);
    setEditForm({
      emoji: item.emoji, name: item.name, price: item.price, prepTime: item.prepTime, category: item.category
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'menu', editId), {
        emoji: editForm.emoji,
        name: editForm.name,
        price: Number(editForm.price),
        prepTime: Number(editForm.prepTime),
        category: editForm.category
      });
      setEditId(null);
    } catch (err) {
      console.error(err);
    }
  }

  const grouped = items.reduce((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F6', paddingBottom: '80px' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, height: '52px', background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#1D9E75' }}>🍽 CaféSync <span style={{ color: '#7C3AED', marginLeft: '6px' }}>Admin</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/admin/dashboard')} style={navLinkStyle}>Dashboard</button>
          <button onClick={() => navigate('/admin/users')} style={navLinkStyle}>Users</button>
          <button onClick={logout} style={{ ...navLinkStyle, color: '#A32D2D' }}>Logout</button>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Menu Manager</h1>
          <button
            onClick={() => setIsAdding(!isAdding)}
            style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            {isAdding ? 'Cancel' : '＋ Add Item'}
          </button>
        </div>

        {isAdding && (
          <div style={{ background: '#FFFFFF', border: '1px solid #7C3AED', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 14px 0' }}>New Menu Item</h2>
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'min-content 2fr 1fr 1fr 1.5fr', gap: '10px', alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Emoji</label>
                <input required maxLength="2" value={newEmoji} onChange={e=>setNewEmoji(e.target.value)} style={{ ...inputStyle, width: '50px', textAlign: 'center' }} />
              </div>
              <div>
                <label style={labelStyle}>Name</label>
                <input required value={newName} onChange={e=>setNewName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Price (₹)</label>
                <input required type="number" min="0" value={newPrice} onChange={e=>setNewPrice(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Prep (min)</label>
                <input required type="number" min="1" value={newPrep} onChange={e=>setNewPrep(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={newCategory} onChange={e=>setNewCategory(e.target.value)} style={inputStyle}>
                  <option>Snacks</option><option>Meals</option><option>Beverages</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                <button type="submit" style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Save Item</button>
              </div>
            </form>
          </div>
        )}

        {['Snacks', 'Meals', 'Beverages'].map(cat => {
          const catItems = grouped[cat] || [];
          if (catItems.length === 0) return null;
          
          return (
            <div key={cat} style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', margin: '0 0 10px 4px' }}>{cat}</h2>
              <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '0 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {catItems.map((item, idx) => {
                  const isEditing = editId === item.id;
                  return (
                    <div key={item.id} style={{ borderBottom: idx !== catItems.length - 1 ? '1px solid #F3F4F6' : 'none', padding: '14px 0', opacity: item.available ? 1 : 0.6 }}>
                      
                      {!isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                           <span style={{ fontSize: '24px' }}>{item.emoji}</span>
                           <div style={{ flex: 1 }}>
                             <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{item.name}</div>
                             <div style={{ fontSize: '11px', color: '#6B7280' }}>₹{item.price} • {item.prepTime} min</div>
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                             <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                               <input type="checkbox" checked={item.available !== false} onChange={() => handleToggleAvailable(item.id, item.available)} />
                               Avail
                             </label>
                             <button onClick={() => startEdit(item)} style={{ ...actionBtnStyle, color: '#7C3AED' }}>Edit</button>
                             <button onClick={() => handleDelete(item.id)} style={{ ...actionBtnStyle, color: '#A32D2D' }}>Del</button>
                           </div>
                        </div>
                      ) : (
                        <form onSubmit={saveEdit} style={{ display: 'grid', gridTemplateColumns: 'min-content 2fr 1fr 1fr 1.5fr min-content', gap: '8px', alignItems: 'end' }}>
                          <input required maxLength="2" value={editForm.emoji} onChange={e=>setEditForm({...editForm, emoji: e.target.value})} style={{ ...inputStyle, width: '40px', padding: '6px', textAlign: 'center' }} />
                          <input required value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} style={{ ...inputStyle, padding: '6px' }} />
                          <input required type="number" value={editForm.price} onChange={e=>setEditForm({...editForm, price: e.target.value})} style={{ ...inputStyle, padding: '6px' }} />
                          <input required type="number" value={editForm.prepTime} onChange={e=>setEditForm({...editForm, prepTime: e.target.value})} style={{ ...inputStyle, padding: '6px' }} />
                          <select value={editForm.category} onChange={e=>setEditForm({...editForm, category: e.target.value})} style={{ ...inputStyle, padding: '6px' }}>
                            <option>Snacks</option><option>Meals</option><option>Beverages</option>
                          </select>
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                             <button type="submit" style={{ ...actionBtnStyle, color: '#1D9E75' }}>Save</button>
                             <button type="button" onClick={() => setEditId(null)} style={{ ...actionBtnStyle, color: '#6B7280' }}>Cancel</button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      </main>
    </div>
  );
}

const navLinkStyle = { background: 'none', border: 'none', color: '#374151', fontWeight: 500, fontSize: '13px', cursor: 'pointer', padding: 0 };
const labelStyle = { display: 'block', fontSize: '11px', color: '#6B7280', letterSpacing: '0.02em', fontWeight: 600, marginBottom: '4px' };
const inputStyle = { width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', outline: 'none' };
const actionBtnStyle = { background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '4px 6px', transition: 'opacity 0.15s' };
