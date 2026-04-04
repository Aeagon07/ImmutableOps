import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['Snacks', 'Meals', 'Beverages'];

const EMPTY_FORM = { emoji: '', name: '', price: '', prepTime: '', category: 'Snacks' };

// ─── NavBar ────────────────────────────────────────────────────────────────────

function NavBar() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 58,
      background: '#fff', borderBottom: '1px solid #E5E7EB',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <span style={{ fontWeight: 800, fontSize: 17, color: '#7C3AED' }}>🍽 Menu Management</span>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <NavBtn label="← Dashboard" onClick={() => navigate('/admin/dashboard')} color="#1D9E75" />
        <NavBtn label="Users →"     onClick={() => navigate('/admin/users')}     color="#374151" />
        <NavBtn label="Logout"      onClick={logout}                              color="#EF4444" />
      </div>
    </div>
  );
}

function NavBtn({ label, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', color,
      fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0,
    }}>{label}</button>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} style={{
      width: 40, height: 22, borderRadius: 99,
      background: checked ? '#1D9E75' : '#D1D5DB',
      position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3,
        left: checked ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

// ─── Inline Edit Form ──────────────────────────────────────────────────────────

function EditForm({ item, onSave, onCancel }) {
  const [vals, setVals] = useState({
    emoji:    item.emoji    ?? '',
    name:     item.name     ?? '',
    price:    item.price    ?? '',
    prepTime: item.prepTime ?? '',
    category: item.category ?? 'Snacks',
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setVals(prev => ({ ...prev, [k]: v })); }

  async function handleSave() {
    if (!vals.name.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'menu', item.id), {
        emoji:    vals.emoji,
        name:     vals.name.trim(),
        price:    Number(vals.price),
        prepTime: Number(vals.prepTime),
        category: vals.category,
      });
      onSave();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  const inputStyle = {
    border: '1px solid #D1D5DB', borderRadius: 7, padding: '7px 10px',
    fontSize: 13, outline: 'none', color: '#111827', background: '#fff',
  };

  return (
    <div style={{
      background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10,
      padding: '14px 16px', margin: '6px 0 10px', display: 'flex',
      flexWrap: 'wrap', gap: 10, alignItems: 'flex-end',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Emoji</label>
        <input value={vals.emoji} onChange={e => set('emoji', e.target.value)}
          maxLength={2} style={{ ...inputStyle, width: 50, textAlign: 'center', fontSize: 18 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 140px' }}>
        <label style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Name</label>
        <input value={vals.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Price (₹)</label>
        <input type="number" value={vals.price} onChange={e => set('price', e.target.value)}
          style={{ ...inputStyle, width: 80 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Prep (min)</label>
        <input type="number" value={vals.prepTime} onChange={e => set('prepTime', e.target.value)}
          style={{ ...inputStyle, width: 80 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Category</label>
        <select value={vals.category} onChange={e => set('category', e.target.value)} style={inputStyle}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={saving} style={{
          background: '#1D9E75', color: '#fff', border: 'none',
          borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
        }}>Save</button>
        <button onClick={onCancel} style={{
          background: '#fff', color: '#6B7280', border: '1px solid #D1D5DB',
          borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Add Item Form ─────────────────────────────────────────────────────────────

function AddItemForm({ maxOrder, currentUserId, onAdded }) {
  const [open,    setOpen]    = useState(false);
  const [vals,    setVals]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);

  function set(k, v) { setVals(prev => ({ ...prev, [k]: v })); }

  async function handleAdd() {
    if (!vals.name.trim() || !vals.price) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'menu'), {
        emoji:        vals.emoji,
        name:         vals.name.trim(),
        price:        Number(vals.price),
        prepTime:     Number(vals.prepTime),
        category:     vals.category,
        available:    true,
        displayOrder: maxOrder + 1,
        addedBy:      currentUserId ?? 'admin',
        createdAt:    serverTimestamp(),
      });
      setVals(EMPTY_FORM);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      onAdded();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  const inputStyle = {
    border: '1px solid #D1D5DB', borderRadius: 7, padding: '7px 10px',
    fontSize: 13, outline: 'none', color: '#111827', background: '#fff',
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
      padding: '16px 20px', marginBottom: 18,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: 'none', border: 'none', color: '#7C3AED',
        fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: 0,
      }}>
        {open ? '✕ Close Form' : '＋ Add Menu Item'}
      </button>

      {open && (
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Emoji</label>
            <input value={vals.emoji} onChange={e => set('emoji', e.target.value)}
              maxLength={2} style={{ ...inputStyle, width: 50, textAlign: 'center', fontSize: 18 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 140px' }}>
            <label style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Name *</label>
            <input value={vals.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Price (₹) *</label>
            <input type="number" min={0} value={vals.price} onChange={e => set('price', e.target.value)}
              style={{ ...inputStyle, width: 80 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Prep (min)</label>
            <input type="number" min={0} value={vals.prepTime} onChange={e => set('prepTime', e.target.value)}
              style={{ ...inputStyle, width: 80 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>Category</label>
            <select value={vals.category} onChange={e => set('category', e.target.value)} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button onClick={handleAdd} disabled={saving} style={{
              background: '#7C3AED', color: '#fff', border: 'none',
              borderRadius: 7, padding: '8px 18px', fontSize: 13, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: 18,
            }}>Add Item</button>
          </div>
          {success && (
            <span style={{ fontSize: 13, color: '#1D9E75', fontWeight: 600, alignSelf: 'flex-end' }}>
              ✓ Item added
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Menu Item Row ─────────────────────────────────────────────────────────────

function MenuItemRow({ item, editingId, setEditingId, onRefresh }) {
  const isEditing = editingId === item.id;

  async function toggleAvailable() {
    try {
      await updateDoc(doc(db, 'menu', item.id), { available: !item.available });
      onRefresh();
    } catch (e) { console.error(e); }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'menu', item.id));
      onRefresh();
    } catch (e) { console.error(e); }
  }

  const btnBase = {
    border: 'none', borderRadius: 6, padding: '5px 12px',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  };

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: '1px solid #F3F4F6',
        opacity: item.available ? 1 : 0.45,
        transition: 'opacity 0.2s',
      }}>
        {/* Emoji */}
        <span style={{ fontSize: 22, minWidth: 30, textAlign: 'center' }}>{item.emoji}</span>

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{item.name}</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
            {item.category} · ₹{item.price} · {item.prepTime} min
          </div>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Toggle checked={!!item.available} onChange={toggleAvailable} />
          <span style={{ fontSize: 11, color: item.available ? '#1D9E75' : '#9CA3AF', fontWeight: 600 }}>
            {item.available ? 'On' : 'Off'}
          </span>
        </div>

        {/* Edit */}
        <button
          onClick={() => setEditingId(isEditing ? null : item.id)}
          style={{ ...btnBase, background: '#EDE9FE', color: '#7C3AED' }}
        >
          {isEditing ? 'Close' : 'Edit'}
        </button>

        {/* Delete */}
        <button onClick={handleDelete}
          style={{ ...btnBase, background: '#FCEBEB', color: '#A32D2D' }}>
          Delete
        </button>
      </div>

      {isEditing && (
        <EditForm
          item={item}
          onSave={() => { setEditingId(null); onRefresh(); }}
          onCancel={() => setEditingId(null)}
        />
      )}
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MenuManager() {
  const { user } = useAuth();
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editingId, setEditingId] = useState(null);

  async function fetchMenu() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'menu'), orderBy('displayOrder', 'asc')));
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { fetchMenu(); }, []);

  const maxOrder = items.length ? Math.max(...items.map(i => i.displayOrder ?? 0)) : 0;

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: "'Inter', sans-serif" }}>
      <NavBar />
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '82px 20px 48px' }}>

        {/* Add form */}
        <AddItemForm maxOrder={maxOrder} currentUserId={user?.uid} onAdded={fetchMenu} />

        {/* Menu list by category */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 40, fontSize: 15 }}>Loading menu…</div>
        ) : (
          CATEGORIES.map(cat => {
            const catItems = grouped[cat] ?? [];
            if (!catItems.length) return null;
            return (
              <div key={cat} style={{
                background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
                padding: '16px 20px', marginBottom: 18,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#7C3AED', marginBottom: 4 }}>
                  {cat}
                  <span style={{
                    marginLeft: 8, fontSize: 12, fontWeight: 600,
                    background: '#EDE9FE', color: '#7C3AED',
                    borderRadius: 20, padding: '2px 8px',
                  }}>{catItems.length}</span>
                </div>
                {catItems.map(item => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    onRefresh={fetchMenu}
                  />
                ))}
              </div>
            );
          })
        )}

      </div>
    </div>
  );
}
