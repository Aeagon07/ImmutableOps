/**
 * timeHelpers.js
 * Date/time utility functions for the CaféSync canteen app.
 */

/**
 * Format a Date to "h:mm AM/PM" — e.g. "1:30 PM"
 * @param {Date} date
 * @returns {string}
 */
export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  let hours   = d.getHours();
  const mins  = d.getMinutes();
  const ampm  = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mm = mins.toString().padStart(2, '0');
  return `${hours}:${mm} ${ampm}`;
}

/**
 * Return the ISO 8601 string of a Date.
 * @param {Date} date
 * @returns {string}
 */
export function formatISO(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString();
}

/**
 * Add (or subtract) minutes from a Date.
 * @param {Date} date
 * @param {number} minutes  — can be negative
 * @returns {Date}
 */
export function addMinutes(date, minutes) {
  const d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  d.setTime(d.getTime() + minutes * 60 * 1000);
  return d;
}

/**
 * Return a Date that is `minutes` from right now.
 * @param {number} minutes
 * @returns {Date}
 */
export function minutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Convert a "HH:MM" time-input string to a full ISO timestamp on the given base date.
 * Example: timeInputToISO("13:30") → ISO string for today at 1:30 PM.
 * @param {string} timeString  — "HH:MM" (24-hour)
 * @param {Date}   baseDate
 * @returns {string}  ISO string
 */
export function timeInputToISO(timeString, baseDate = new Date()) {
  const [h, m] = timeString.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

// ── Legacy helpers kept for backward compat with other pages ─────────────────

/**
 * Format a Firestore Timestamp or Date to a localised string.
 * @param {Date | { toDate: () => Date }} timestamp
 * @param {string} locale
 * @returns {string}
 */
export function formatTimestamp(timestamp, locale = 'en-IN') {
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString(locale, {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns elapsed time since a timestamp.
 * @param {Date | { toDate: () => Date }} timestamp
 * @returns {string}
 */
export function timeAgo(timestamp) {
  const date    = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60)    return 'just now';
  if (diffSec < 3600)  return `${Math.floor(diffSec / 60)} minute(s) ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hour(s) ago`;
  return `${Math.floor(diffSec / 86400)} day(s) ago`;
}

/**
 * Checks if the canteen is currently open.
 * @param {number} openHour
 * @param {number} closeHour
 * @returns {boolean}
 */
export function isCanteenOpen(openHour = 8, closeHour = 20) {
  const h = new Date().getHours();
  return h >= openHour && h < closeHour;
}
