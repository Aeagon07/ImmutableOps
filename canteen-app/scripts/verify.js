import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, 'immutableops-d22f9-firebase-adminsdk-fbsvc-5d1a0991c6.json'), 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const menu     = await db.collection('menu').get();
const settings = await db.collection('settings').doc('canteen').get();

console.log('\n=== Firestore Verification ===');
console.log('Menu docs      :', menu.size);
console.log('Menu item IDs  :', menu.docs.map(d => d.id).join(', '));
console.log('Settings exists:', settings.exists);
if (settings.exists) {
  const d = settings.data();
  console.log('Settings       :', `isOpen=${d.isOpen}, openTime=${d.openTime}, closeTime=${d.closeTime}, maxOrders=${d.maxConcurrentOrders}`);
}
console.log('==============================\n');
process.exit(0);
