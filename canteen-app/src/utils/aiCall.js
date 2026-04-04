/**
 * aiCall.js
 * Routes AI requests through the Firebase Cloud Function (getAIInsights)
 * instead of calling the Anthropic API directly from the browser.
 * The API key is now stored securely in Firebase Functions config.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

/**
 * Get AI-generated priority, tip, and confidence for a new order.
 *
 * @param {{
 *   items:             Array<{ qty: number, name: string }>,
 *   pickupTimeDisplay: string,
 *   startDisplay:      string,
 *   prepEstimate:      number
 * }} order
 *
 * @param {{ activeOrders: number }} kitchenState
 *
 * @returns {Promise<{ priority: string, tip: string, confidence: number }>}
 */
export async function getAIInsights(order, kitchenState) {
  try {
    const getInsights = httpsCallable(functions, 'getAIInsights');

    const result = await getInsights({
      orderItems:        order.items,
      pickupTimeDisplay: order.pickupTimeDisplay,
      activeOrders:      kitchenState.activeOrders,
      startDisplay:      order.startDisplay,
      prepEstimate:      order.prepEstimate,
    });

    return result.data;
  } catch (err) {
    // Non-critical — silently fall back
    console.warn('getAIInsights cloud function error:', err.message);
    return { priority: 'normal', tip: 'Prepare as scheduled.', confidence: 70 };
  }
}

// ── Legacy stubs kept for backward compat ────────────────────────────────────

const AI_ENDPOINT = import.meta.env.VITE_AI_ENDPOINT ?? '';

export async function getMenuRecommendations(userId, orderHistory = []) {
  if (!AI_ENDPOINT) return [];
  const res = await fetch(`${AI_ENDPOINT}/recommendations`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ userId, orderHistory }),
  });
  if (!res.ok) throw new Error(`AI endpoint error: ${res.status}`);
  const data = await res.json();
  return data.recommendations ?? [];
}

export async function getDemandForecast(hours = 2) {
  if (!AI_ENDPOINT) return {};
  const res = await fetch(`${AI_ENDPOINT}/demand-forecast?hours=${hours}`);
  if (!res.ok) throw new Error(`AI endpoint error: ${res.status}`);
  const data = await res.json();
  return data.forecast ?? {};
}
