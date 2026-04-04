/**
 * Canteen Management System — Menu Seed Script
 * -----------------------------------------------
 * Run this in the browser console AFTER signing in to the app.
 * Requires: Firebase SDK already loaded on the page (via your Vite app).
 *
 * Usage:
 *   1. Open your running app in the browser (npm run dev)
 *   2. Sign in as an admin or chef user
 *   3. Open DevTools → Console
 *   4. Paste the entire contents of this file and press Enter
 */

import { getFirestore, setDoc, doc, serverTimestamp } from 'firebase/firestore';

const db = getFirestore();

const menuItems = [
  {
    id: 'vada_pav',
    name: 'Vada Pav',
    price: 15,
    prepTime: 5,
    category: 'Snacks',
    emoji: '🥙',
    available: true,
    displayOrder: 1,
  },
  {
    id: 'misal_pav',
    name: 'Misal Pav',
    price: 40,
    prepTime: 12,
    category: 'Meals',
    emoji: '🍛',
    available: true,
    displayOrder: 2,
  },
  {
    id: 'veg_thali',
    name: 'Veg Thali',
    price: 70,
    prepTime: 20,
    category: 'Meals',
    emoji: '🍱',
    available: true,
    displayOrder: 3,
  },
  {
    id: 'sandwich',
    name: 'Sandwich',
    price: 35,
    prepTime: 7,
    category: 'Snacks',
    emoji: '🥪',
    available: true,
    displayOrder: 4,
  },
  {
    id: 'samosa',
    name: 'Samosa (2)',
    price: 20,
    prepTime: 8,
    category: 'Snacks',
    emoji: '🥟',
    available: true,
    displayOrder: 5,
  },
  {
    id: 'coffee',
    name: 'Coffee',
    price: 20,
    prepTime: 3,
    category: 'Beverages',
    emoji: '☕',
    available: true,
    displayOrder: 6,
  },
  {
    id: 'chai',
    name: 'Chai',
    price: 10,
    prepTime: 2,
    category: 'Beverages',
    emoji: '🍵',
    available: true,
    displayOrder: 7,
  },
  {
    id: 'juice',
    name: 'Juice',
    price: 30,
    prepTime: 4,
    category: 'Beverages',
    emoji: '🧃',
    available: true,
    displayOrder: 8,
  },
];

async function seedMenu() {
  console.log('🌱 Starting menu seed...');
  const results = await Promise.allSettled(
    menuItems.map((item) => {
      const { id, ...data } = item;
      return setDoc(doc(db, 'menu', id), {
        ...data,
        addedBy: 'seed-script',
        createdAt: serverTimestamp(),
      });
    })
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed    = results.filter((r) => r.status === 'rejected').length;

  console.log(`✅ Seeded ${succeeded} item(s) successfully.`);
  if (failed > 0) {
    console.error(`❌ ${failed} item(s) failed:`);
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`  - ${menuItems[i].id}:`, r.reason);
    });
  }
}

seedMenu();
