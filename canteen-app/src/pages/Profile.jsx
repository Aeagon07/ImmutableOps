import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Shield, Calendar, Award, Edit2, Save, X, CheckCircle2 } from 'lucide-react';

export default function Profile() {
  const { user, updateUserProfile } = useAuth();
  const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'student') return;
    async function fetchStats() {
      try {
        const q = query(collection(db, 'orders'), where('studentId', '==', user.uid), where('status', '==', 'done'));
        const snap = await getDocs(q);
        let spent = 0;
        snap.forEach(d => { spent += d.data().totalPrice || 0; });
        setStats({ totalOrders: snap.docs.length, totalSpent: spent });
      } catch (e) {
        console.error(e);
      }
    }
    fetchStats();
  }, [user]);

  if (!user) return null;

  const canEdit = user.role === 'student' || user.role === 'admin';

  async function handleSave() {
    if (!editName.trim() || editName === user.name) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateUserProfile(editName);
      setIsEditing(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch(e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px', position: 'relative' }}>
      
      <AnimatePresence>
        {showToast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: '#fff', padding: '12px 24px', borderRadius: '30px', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 100, boxShadow: '0 8px 24px rgba(29,158,117,0.3)' }}>
            <CheckCircle2 size={18} /> Profile updated successfully!
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#FFFFFF', borderRadius: '24px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.02)' }}>
        
        {/* Cover Video/Gradient */}
        <div style={{ height: '160px', background: 'linear-gradient(135deg, #1D9E75 0%, #111827 100%)', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: '-40px', left: '32px', width: '96px', height: '96px', borderRadius: '50%', background: '#F5F7F6', border: '4px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: '#111827', fontWeight: 800 }}>
            {user.name ? user.name.charAt(0).toUpperCase() : <User size={40} />}
          </div>
        </div>

        <div style={{ padding: '56px 32px 32px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div key="editing" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <input 
                      autoFocus
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      disabled={isSaving}
                      style={{ fontSize: '24px', fontWeight: 800, color: '#111827', padding: '8px 16px', borderRadius: '12px', border: '2px solid #1D9E75', outline: 'none', background: '#F9FAFB', width: '100%', maxWidth: '300px' }} 
                    />
                    <button onClick={handleSave} disabled={isSaving} style={{ background: '#1D9E75', border: 'none', color: '#fff', borderRadius: '12px', padding: '12px', cursor: isSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Save size={20} strokeWidth={2.5} />
                    </button>
                    <button onClick={() => setIsEditing(false)} disabled={isSaving} style={{ background: '#FCEBEB', border: 'none', color: '#A32D2D', borderRadius: '12px', padding: '12px', cursor: isSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={20} strokeWidth={2.5} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="viewing" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                      {user.name || 'Anonymous User'}
                    </h1>
                    {canEdit && (
                      <button onClick={() => { setEditName(user.name); setIsEditing(true); }} style={{ background: '#F3F4F6', border: 'none', color: '#4B5563', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        <Edit2 size={16} strokeWidth={2.5} />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280', fontSize: '14px', fontWeight: 500 }}>
                <Mail size={16} /> {user.email}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#E1F5EE', color: '#085041', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
              <Shield size={16} /> Role: {user.role}
            </div>
          </div>

          <div style={{ margin: '32px 0', borderTop: '1px solid #E5E7EB' }} />

          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', marginBottom: '20px' }}>Account Details</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
             <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '20px' }}>
               <Calendar color="#6B7280" size={20} style={{ marginBottom: '12px' }} />
               <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Account Created</div>
               <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
                 {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
               </div>
             </div>

             {user.role === 'student' && (
               <>
                 <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '20px' }}>
                   <Award color="#BA7517" size={20} style={{ marginBottom: '12px' }} />
                   <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Total Orders</div>
                   <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>{stats.totalOrders}</div>
                 </div>
                 <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '20px' }}>
                   <Award color="#1D9E75" size={20} style={{ marginBottom: '12px' }} />
                   <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>Total Spent</div>
                   <div style={{ fontSize: '24px', fontWeight: 800, color: '#1D9E75', marginTop: '4px', fontFamily: "'Courier New', monospace" }}>₹{stats.totalSpent}</div>
                 </div>
               </>
             )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}
