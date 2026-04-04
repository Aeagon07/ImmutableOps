import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // { uid, email, name, role }
  const [loading, setLoading] = useState(true);

  // ── Auth state listener ────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            setUser({
              uid:   firebaseUser.uid,
              email: firebaseUser.email,
              name:  data.name  ?? '',
              role:  data.role  ?? 'student',
            });
            // Update lastLogin silently
            updateDoc(doc(db, 'users', firebaseUser.uid), {
              lastLogin: serverTimestamp(),
            }).catch(() => {});
          } else {
            // Firestore doc missing — auto-create with defaults.
            // This happens when a user registered in Firebase Auth
            // before Firestore was set up.
            const fallbackName = firebaseUser.displayName
              ?? firebaseUser.email.split('@')[0]
              ?? 'User';
            const defaultDoc = {
              name:      fallbackName,
              email:     firebaseUser.email,
              role:      'student',
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), defaultDoc);
            setUser({
              uid:   firebaseUser.uid,
              email: firebaseUser.email,
              name:  fallbackName,
              role:  'student',
            });
          }
        } catch (err) {
          console.error('AuthContext: failed to fetch user profile', err);
          // Do NOT sign out on network error — keep auth session alive
          // so user doesn't get stuck in a reload loop.
          setUser({
            uid:   firebaseUser.uid,
            email: firebaseUser.email,
            name:  '',
            role:  'student',
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ── login ─────────────────────────────────────────────────────────────────
  async function login(email, password) {
    // signInWithEmailAndPassword — onAuthStateChanged will handle the rest
    await signInWithEmailAndPassword(auth, email, password);
  }

  // ── register ──────────────────────────────────────────────────────────────
  // Admin role cannot be self-registered — only "student" and "chef" allowed.
  async function register(email, password, name, role) {
    if (role === 'admin') {
      throw new Error('Admin accounts cannot be self-registered.');
    }
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid        = credential.user.uid;

    // Write Firestore profile — onAuthStateChanged will read it back
    await setDoc(doc(db, 'users', uid), {
      name,
      email,
      role,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });
  }

  // ── logout ────────────────────────────────────────────────────────────────
  async function logout() {
    await signOut(auth);
    // onAuthStateChanged will setUser(null) automatically
  }

  // ── update profile ────────────────────────────────────────────────────────
  async function updateUserProfile(newName) {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), { name: newName });
    setUser(prev => ({ ...prev, name: newName }));
  }

  // ── context value ─────────────────────────────────────────────────────────
  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
