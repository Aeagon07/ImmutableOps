export const getAIInsights = async (order, kitchenState) => {
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
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const text = data.content[0].text.trim();
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    return { 
      priority: parsed.priority || 'normal', 
      tip: parsed.tip || 'Prepare as scheduled.', 
      confidence: parsed.confidence || 70 
    };
  } catch (e) {
    console.error("AI Insight Error:", e);
    return { priority: 'normal', tip: 'Prepare as scheduled.', confidence: 70 };
  }
};
