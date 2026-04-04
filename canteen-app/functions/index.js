/**
 * Canteen Management System — Firebase Cloud Functions
 *
 * Exports:
 *   1. getAIInsights     — HTTPS Callable: AI kitchen scheduling insights
 *   2. checkDelays       — Scheduled (every 2 min): detect & reschedule late orders
 *   3. onOrderCreated    — Firestore trigger: rebalance load on new order
 *
 * NOTE: Scheduled functions (checkDelays) require the Firebase Blaze plan.
 *
 * Deploy:
 *   firebase deploy --only functions
 */

const functions = require('firebase-functions');
const fetch     = require('node-fetch');
const admin     = require('firebase-admin');

// Initialize Admin SDK once at module level
if (!admin.apps.length) {
  admin.initializeApp();
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 1: getAIInsights — HTTPS Callable
// ─────────────────────────────────────────────────────────────────────────────

exports.getAIInsights = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { orderItems, pickupTimeDisplay, activeOrders, startDisplay, prepEstimate } = data;
  const itemsSummary = (orderItems ?? [])
    .map(i => `${i.qty ?? i.quantity ?? 1}x ${i.name}`)
    .join(', ');

  const prompt = `You are a smart canteen kitchen AI scheduler.
Order details: ${itemsSummary}
Student pickup time: ${pickupTimeDisplay}
Active orders in kitchen right now: ${activeOrders}
Calculated prep start time: ${startDisplay}
Prep estimate: ${prepEstimate} minutes

Respond ONLY with valid JSON (no markdown, no code blocks):
{ "priority": "normal or high or urgent", "tip": "one short actionable sentence for the chef (max 12 words)", "confidence": 85 }

Priority rules:
- urgent: pickup is in less than 15 minutes from now
- high: kitchen currently has 5 or more active orders
- normal: everything else`;

  try {
    const anthropicKey = functions.config().anthropic.key;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });
    const result = await response.json();
    const text   = result.content[0].text.trim().replace(/```json|```/g, '');
    const parsed = JSON.parse(text);
    return {
      priority:   parsed.priority   || 'normal',
      tip:        parsed.tip        || 'Prepare as scheduled.',
      confidence: parsed.confidence || 70,
    };
  } catch (err) {
    functions.logger.warn('getAIInsights fallback:', err.message);
    return { priority: 'normal', tip: 'Prepare as scheduled.', confidence: 70 };
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 2: checkDelays — Pub/Sub Scheduled every 2 minutes
// ─────────────────────────────────────────────────────────────────────────────

exports.checkDelays = functions.pubsub
  .schedule('every 2 minutes')
  .onRun(async (context) => {
    const db  = admin.firestore();
    const now = new Date();

    const snapshot = await db.collection('orders')
      .where('status', '==', 'queued')
      .get();

    const batch = db.batch();
    let updatedCount = 0;

    snapshot.forEach(doc => {
      const order            = doc.data();
      const scheduledStart   = new Date(order.scheduledStart);
      const minutesPastStart = (now - scheduledStart) / 60000;

      if (minutesPastStart > 5 && !order.delayFlag) {
        const newStart = new Date(now.getTime() + 2 * 60000);
        batch.update(doc.ref, {
          delayFlag:      true,
          scheduledStart: newStart.toISOString(),
          startDisplay:   newStart.toLocaleTimeString('en-IN', {
            hour: 'numeric', minute: '2-digit', hour12: true,
          }),
          aiReason: 'Delayed: kitchen was busy. Prep rescheduled to start now.',
        });
        updatedCount++;
      }
    });

    await batch.commit();
    functions.logger.info(`Delay check: ${updatedCount} orders rescheduled`);
    return null;
  });

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 3: onOrderCreated — Firestore trigger
// ─────────────────────────────────────────────────────────────────────────────

exports.onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const db = admin.firestore();

    const activeSnap = await db.collection('orders')
      .where('status', 'in', ['queued', 'preparing'])
      .get();
    const activeCount = activeSnap.size;

    const settingsSnap = await db.doc('settings/canteen').get();
    const maxOrders    = settingsSnap.exists
      ? (settingsSnap.data().maxConcurrentOrders ?? 6)
      : 6;

    if (activeCount >= maxOrders) {
      await snap.ref.update({
        aiReason: `Kitchen at capacity (${activeCount}/${maxOrders}). Prep will start as soon as possible.`,
        priority:  'high',
      });
      functions.logger.info(
        `onOrderCreated: ${context.params.orderId} flagged HIGH — ${activeCount}/${maxOrders}`
      );
    }

    return null;
  });
