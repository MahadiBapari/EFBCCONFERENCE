/**
 * Format date in Eastern Time (America/New_York timezone)
 * This handles both EST (UTC-5) and EDT (UTC-4) automatically
 */

/**
 * Format a date string to Eastern Time with specified options
 */
export const formatDateEastern = (
  dateString: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York'
  }
): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  // Ensure timezone is set to Eastern
  const easternOptions: Intl.DateTimeFormatOptions = {
    ...options,
    timeZone: 'America/New_York'
  };
  
  return new Intl.DateTimeFormat('en-US', easternOptions).format(date);
};

// Internal helper to safely parse dates, treating plain YYYY-MM-DD as a
// calendar date in the local timezone (avoids off-by-one issues when the
// string is interpreted as UTC).
const parseDateSafe = (value: string | Date): Date => {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  const str = String(value);
  // Match YYYY-MM-DD at the start of the string (ignores any time/zone part)
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]) - 1; // 0-based
    const day = Number(m[3]);
    return new Date(year, month, day);
  }
  // Fallback to native parsing for full ISO strings, etc.
  return new Date(str);
};

/**
 * Format date for display (short format: Month Day, Year)
 * Uses parseDateSafe to ensure tier and event date ranges do not shift by a day.
 */
export const formatDateShort = (dateString: string | Date): string => {
  const date = parseDateSafe(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

/**
 * Format date for display (numeric format: MM/DD/YYYY)
 */
export const formatDateNumeric = (dateString: string | Date): string => {
  const date = parseDateSafe(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

/**
 * Get current date/time in Eastern Time
 */
export const getCurrentEasternTime = (): Date => {
  const now = new Date();
  const easternTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return easternTime;
};

/**
 * Check if a date is expired (comparing in Eastern Time)
 */
export const isDateExpiredEastern = (dateString: string): boolean => {
  const eventDate = new Date(dateString);
  const now = new Date();
  
  // Convert both to Eastern Time for comparison
  const eventEastern = new Date(eventDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const nowEastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // Compare dates only (ignore time)
  eventEastern.setHours(0, 0, 0, 0);
  nowEastern.setHours(0, 0, 0, 0);
  
  return eventEastern < nowEastern;
};

