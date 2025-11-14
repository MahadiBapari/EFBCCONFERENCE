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

/**
 * Format date for display (short format: Month Day, Year)
 */
export const formatDateShort = (dateString: string | Date): string => {
  return formatDateEastern(dateString, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York'
  });
};

/**
 * Format date for display (numeric format: MM/DD/YYYY)
 */
export const formatDateNumeric = (dateString: string | Date): string => {
  return formatDateEastern(dateString, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/New_York'
  });
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

