/**
 * aiCall.js
 * Calls the Anthropic Claude API to get AI-powered kitchen scheduling insights.
 */

/**
 * Get AI-generated priority, tip, and confidence for a new order.
 *
 * @param {{
 *   items:            Array<{ qty: number, name: string }>,
 *   pickupTimeDisplay: string,
 *   startDisplay:     string,
 *   prepEstimate:     number
 * }} order
 *
 * @param {{ activeOrders: number }} kitchenState
 *
 * @returns {Promise<{ priority: string, tip: string, confidence: number }>}
 */
export async function getAIInsights(order, kitchenState) {
  const itemsSummary = order.items.map(i => `${i.qty}x ${i.name}`).join(', ');

  const prompt = `You are a smart canteen kitchen AI scheduler.
Order details: ${itemsSummary}
Student pickup time: ${order.pickupTimeDisplay}
Active orders in kitchen right now: ${kitchenState.activeOrders}
Calculated prep start time: ${order.startDisplay}
Prep estimate: ${order.prepEstimate} minutes

Respond ONLY with valid JSON (no markdown, no code blocks):
{ "priority": "normal or high or urgent", "tip": "one short actionable sentence for the chef (max 12 words)", "confidence": 85 }

Priority rules:
- urgent: pickup is in less than 15 minutes from now
- high: kitchen currently has 5 or more active orders
- normal: everything else`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       import.meta.env.VITE_ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    const data    = await response.json();
    const text    = data.content[0].text.trim();
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed  = JSON.parse(cleaned);

    return {
      priority:   parsed.priority   || 'normal',
      tip:        parsed.tip        || 'Prepare as scheduled.',
      confidence: parsed.confidence || 70,
    };
  } catch (e) {
    // Silently fall back — AI enrichment is non-critical
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
