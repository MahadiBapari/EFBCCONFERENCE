// Utility functions for handling event activities with backward compatibility

/**
 * Get activity names from activities array (handles both old string[] and new object[] formats)
 */
export const getActivityNames = (activities?: Array<{ name: string; seatLimit?: number }> | string[]): string[] => {
  if (!activities || activities.length === 0) return [];
  if (typeof activities[0] === 'string') {
    return activities as string[];
  }
  return (activities as Array<{ name: string; seatLimit?: number }>).map(a => a.name);
};

/**
 * Get seat limit for a specific activity
 */
export const getActivitySeatLimit = (
  activities: Array<{ name: string; seatLimit?: number }> | string[] | undefined, 
  activityName: string
): number | undefined => {
  if (!activities || activities.length === 0) return undefined;
  if (typeof activities[0] === 'string') return undefined;
  const activity = (activities as Array<{ name: string; seatLimit?: number }>).find(a => a.name === activityName);
  return activity?.seatLimit;
};

/**
 * Normalize activities to object format (for consistent handling)
 */
export const normalizeActivities = (
  activities?: Array<{ name: string; seatLimit?: number }> | string[]
): Array<{ name: string; seatLimit?: number }> => {
  if (!activities || activities.length === 0) return [];
  if (typeof activities[0] === 'string') {
    return (activities as string[]).map(name => ({ name }));
  }
  return activities as Array<{ name: string; seatLimit?: number }>;
};

