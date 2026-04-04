import { formatISO, formatTime, addMinutes } from './timeHelpers';

export const calculateSchedule = (orderItems, pickupTimeISO, activeOrderCount) => {
  // Step 1: Max base prep time
  const maxBase = Math.max(...orderItems.map(i => i.prepTime || 0));
  
  // Step 2: Volume extra
  const totalQty = orderItems.reduce((sum, item) => sum + (item.qty || 1), 0);
  const volumeExtra = totalQty > 3 ? Math.ceil((totalQty - 3) * 1.5) : 0;
  
  // Step 3: Load overhead
  const loadOverhead = Math.min(activeOrderCount * 1.5, 12);
  
  // Step 4: Buffer
  const buffer = 3;
  
  // Step 5: Total prep time estimate
  const totalPrepTime = maxBase + volumeExtra + Math.round(loadOverhead) + buffer;
  
  // Step 6: Scheduled start time
  const scheduledStart = addMinutes(new Date(pickupTimeISO), -totalPrepTime);
  
  return {
    prepEstimate: totalPrepTime,
    scheduledStart: formatISO(scheduledStart),
    startDisplay: formatTime(scheduledStart),
    breakdown: `${maxBase}min base + ${volumeExtra}min volume + ${Math.round(loadOverhead)}min load + ${buffer}min buffer`
  };
};
