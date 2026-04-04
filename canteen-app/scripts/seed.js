/**
 * Canteen Management System — Full Database Seed Script
 * -------------------------------------------------------
 * Uses Firebase Admin SDK (bypasses Firestore security rules).
 *
 * SETUP BEFORE RUNNING:
 *   1. Go to: https://console.firebase.google.com/project/immutableops-d22f9/settings/serviceaccounts/adminsdk
 *   2. Click "Generate new private key" → Save the JSON file
 *   3. Rename it to: serviceAccountKey.json
 *   4. Place it in the scripts/ folder (same folder as this file)
 *   5. Run: node scripts/seed.js
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load service account ────────────────────────────────────────────────────
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'immutableops-d22f9-firebase-adminsdk-fbsvc-5d1a0991c6.json'), 'utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Menu items ───────────────────────────────────────────────────────────────
const menuItems = [
  { id: 'vada_pav',  name: 'Vada Pav',   price: 15, prepTime: 5,  category: 'Snacks',    emoji: '🥙', available: true, displayOrder: 1 },
  { id: 'misal_pav', name: 'Misal Pav',  price: 40, prepTime: 12, category: 'Meals',     emoji: '🍛', available: true, displayOrder: 2 },
  { id: 'veg_thali', name: 'Veg Thali',  price: 70, prepTime: 20, category: 'Meals',     emoji: '🍱', available: true, displayOrder: 3 },
  { id: 'sandwich',  name: 'Sandwich',   price: 35, prepTime: 7,  category: 'Snacks',    emoji: '🥪', available: true, displayOrder: 4 },
  { id: 'samosa',    name: 'Samosa (2)', price: 20, prepTime: 8,  category: 'Snacks',    emoji: '🥟', available: true, displayOrder: 5 },
  { id: 'coffee',    name: 'Coffee',     price: 20, prepTime: 3,  category: 'Beverages', emoji: '☕', available: true, displayOrder: 6 },
  { id: 'chai',      name: 'Chai',       price: 10, prepTime: 2,  category: 'Beverages', emoji: '🍵', available: true, displayOrder: 7 },
  { id: 'juice',     name: 'Juice',      price: 30, prepTime: 4,  category: 'Beverages', emoji: '🧃', available: true, displayOrder: 8 },
];

// ── Canteen settings ─────────────────────────────────────────────────────────
const canteenSettings = {
  maxConcurrentOrders: 6,
  avgLoadFactor:       1.5,
  isOpen:              true,
  openTime:            '08:00',
  closeTime:           '17:00',
  updatedBy:           'seed-script',
  updatedAt:           FieldValue.serverTimestamp(),
};

// ── Seed functions ───────────────────────────────────────────────────────────
async function seedMenu() {
  console.log('\n🌱 Seeding /menu ...');
  const batch = db.batch();

  for (const { id, ...data } of menuItems) {
    const ref = db.collection('menu').doc(id);
    batch.set(ref, {
      ...data,
      addedBy:   'seed-script',
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`   ✅ ${menuItems.length} menu items written.`);
}

async function seedSettings() {
  console.log('\n🌱 Seeding /settings/canteen ...');
  await db.collection('settings').doc('canteen').set(canteenSettings);
  console.log('   ✅ Canteen settings written.');
}

// ── Run ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting Canteen DB seed for project: immutableops-d22f9');
  try {
    await seedMenu();
    await seedSettings();
    console.log('\n🎉 All done! Check Firestore in the Firebase Console.\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    if (err.message?.includes('NOT_FOUND') || err.code === 5) {
      console.error('\n👉 Firestore Database does not exist yet for this project!');
      console.error('   Create it here: https://console.firebase.google.com/project/immutableops-d22f9/firestore');
      console.error('   → Click "Create database" → "Start in test mode" → Choose region (asia-south1) → Enable\n');
    } else if (err.message?.includes('serviceAccountKey.json') || err.message?.includes('adminsdk')) {
      console.error('\n👉 Service account key file not found in scripts/ folder.\n');
    }
    process.exit(1);
  }
}

main();
