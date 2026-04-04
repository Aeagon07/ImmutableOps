/**
 * Canteen Management System — Create Admin User
 * -----------------------------------------------
 * Creates a Firebase Auth user + Firestore profile with role='admin'.
 * Run: node scripts/create-admin.js
 */

import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config — change these before running ─────────────────────────────────────
const ADMIN_EMAIL    = 'admin@canteen.com';
const ADMIN_PASSWORD = 'Admin@1234';
const ADMIN_NAME     = 'Admin';
// ─────────────────────────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, 'immutableops-d22f9-firebase-adminsdk-fbsvc-5d1a0991c6.json'), 'utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const db   = getFirestore();
const auth = getAuth();

async function main() {
  console.log('\n🔐 Creating admin account...');
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);

  // 1. Create Firebase Auth user
  let uid;
  try {
    const user = await auth.createUser({
      email:         ADMIN_EMAIL,
      password:      ADMIN_PASSWORD,
      displayName:   ADMIN_NAME,
      emailVerified: true,
    });
    uid = user.uid;
    console.log(`\n✅ Auth user created — UID: ${uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      // User already exists in Auth — fetch their UID
      const existing = await auth.getUserByEmail(ADMIN_EMAIL);
      uid = existing.uid;
      console.log(`⚠  Auth user already exists — UID: ${uid} (proceeding to set Firestore role)`);
    } else {
      throw err;
    }
  }

  // 2. Write Firestore user document with role = 'admin'
  await db.collection('users').doc(uid).set({
    name:      ADMIN_NAME,
    email:     ADMIN_EMAIL,
    role:      'admin',
    createdAt: FieldValue.serverTimestamp(),
    lastLogin: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log('✅ Firestore /users document written with role=admin');
  console.log('\n🎉 Done! Login credentials:');
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   URL:      http://localhost:5173\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Failed:', err.message);
  process.exit(1);
});
