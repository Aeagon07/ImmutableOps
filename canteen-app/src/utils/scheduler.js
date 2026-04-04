/**
 * scheduler.js
 * Calculates the kitchen prep schedule for a student order.
 */

import { addMinutes, formatISO, formatTime } from './timeHelpers';

/**
 * Calculate when the kitchen should start preparing an order.
 *
 * @param {Array<{ prepTime: number, qty: number }>} orderItems
 * @param {string} pickupTimeISO   — ISO timestamp of when student wants to collect
 * @param {number} activeOrderCount — number of orders currently queued/preparing
 * @returns {{
 *   prepEstimate:    number,
 *   scheduledStart:  string,
 *   startDisplay:    string,
 *   breakdown:       string
 * }}
 */
export function calculateSchedule(orderItems, pickupTimeISO, activeOrderCount) {
  // Step 1 — longest single item determines the base time
  const maxBase = Math.max(...orderItems.map(i => i.prepTime));

  // Step 2 — volume overhead: extra 1.5 min per item beyond 3
  const totalQty   = orderItems.reduce((sum, i) => sum + i.qty, 0);
  const volumeExtra = totalQty > 3 ? Math.ceil((totalQty - 3) * 1.5) : 0;

  // Step 3 — kitchen load overhead (capped at 12 min)
  const loadOverhead = Math.min(activeOrderCount * 1.5, 12);

  // Step 4 — fixed buffer
  const buffer = 3;

  // Step 5 — total
  const totalPrepTime = maxBase + volumeExtra + Math.round(loadOverhead) + buffer;

  // Step 6 — count backwards from pickup time
  const pickupDate     = new Date(pickupTimeISO);
  const scheduledStart = addMinutes(pickupDate, -totalPrepTime);

  return {
    prepEstimate:   totalPrepTime,
    scheduledStart: formatISO(scheduledStart),
    startDisplay:   formatTime(scheduledStart),
    breakdown:      `${maxBase}min base + ${volumeExtra}min volume + ${Math.round(loadOverhead)}min load + ${buffer}min buffer`,
  };
}

// ── Legacy helpers kept for backward compat ───────────────────────────────────

/**
 * Picks the chef with the currently lowest active order count.
 * @param {Array<{ id: string, activeOrders: number }>} chefs
 * @returns {string|null}
 */
export function pickLeastBusyChef(chefs = []) {
  if (!chefs.length) return null;
  return chefs.reduce((prev, curr) =>
    curr.activeOrders < prev.activeOrders ? curr : prev
  ).id;
}

/**
 * Splits an array of orders evenly across available chefs.
 * @param {Array} orders
 * @param {Array<{ id: string }>} chefs
 * @returns {Object} { [chefId]: orders[] }
 */
export function distributeOrders(orders = [], chefs = []) {
  if (!chefs.length) return {};
  return orders.reduce((acc, order, i) => {
    const chefId = chefs[i % chefs.length].id;
    if (!acc[chefId]) acc[chefId] = [];
    acc[chefId].push(order);
    return acc;
  }, {});
}
