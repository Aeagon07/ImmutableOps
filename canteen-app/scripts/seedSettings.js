/**
 * Canteen Management System — Settings Seed Script
 * --------------------------------------------------
 * Run this in the browser console AFTER signing in as admin.
 * Writes the /settings/canteen document with default canteen config.
 *
 * Usage:
 *   1. Open your running app in the browser (npm run dev)
 *   2. Sign in as an admin user
 *   3. Open DevTools → Console
 *   4. Paste the entire contents of this file and press Enter
 */

import { getFirestore, setDoc, doc, serverTimestamp } from 'firebase/firestore';

const db = getFirestore();

async function seedSettings() {
  console.log('🌱 Seeding /settings/canteen...');
  try {
    await setDoc(doc(db, 'settings', 'canteen'), {
      maxConcurrentOrders: 6,
      avgLoadFactor: 1.5,
      isOpen: true,
      openTime: '08:00',
      closeTime: '17:00',
      updatedBy: 'seed-script',
      updatedAt: serverTimestamp(),
    });
    console.log('✅ /settings/canteen seeded successfully.');
  } catch (err) {
    console.error('❌ Failed to seed settings:', err);
  }
}

seedSettings();
