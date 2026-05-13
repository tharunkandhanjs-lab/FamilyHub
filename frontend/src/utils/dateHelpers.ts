import {
  format,
  isSameDay,
  isToday,
  isYesterday,
  isTomorrow,
  isThisWeek,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  subDays,
  subWeeks,
  differenceInDays,
  formatDistanceToNow,
  parseISO,
} from "date-fns";

// ============================================
// Nanosecond conversion constants
// ============================================
// The IC (Internet Computer) uses nanoseconds for timestamps,
// while JavaScript uses milliseconds.

/** Nanoseconds per millisecond (1,000,000) */
export const NS_PER_MS = BigInt(1_000_000);

/** Nanoseconds per second (1,000,000,000) */
export const NS_PER_SECOND = BigInt(1_000_000_000);

/** Nanoseconds per minute */
export const NS_PER_MINUTE = BigInt(60) * NS_PER_SECOND;

/** Nanoseconds per hour (3,600,000,000,000) */
export const NS_PER_HOUR = BigInt(3_600_000_000_000);

/** Nanoseconds per day (86,400,000,000,000) */
export const NS_PER_DAY = BigInt(86_400_000_000_000);

/** Milliseconds per day (86,400,000) */
export const MS_PER_DAY = 86_400_000;

// ============================================
// Date conversion helpers
// ============================================

/**
 * Convert bigint nanoseconds (ICP timestamp) to JavaScript Date
 */
export const nanosecondsToDate = (nanoseconds: bigint): Date => {
  const milliseconds = Number(nanoseconds / NS_PER_MS);
  return new Date(milliseconds);
};

/**
 * Convert a JavaScript Date to bigint nanoseconds (ICP timestamp)
 */
export const dateToNanoseconds = (date: Date): bigint => {
  return BigInt(date.getTime()) * NS_PER_MS;
};

/**
 * Get today's date as a string in YYYY-MM-DD format (for HTML date inputs)
 * This correctly uses local timezone, avoiding the toISOString() UTC bug
 */
export const getTodayLocalDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Convert nanoseconds to YYYY-MM-DD string in local timezone
 * Use this when populating a date input from backend data
 */
export const nanosecondsToLocalDateString = (nanoseconds: bigint): string => {
  const date = nanosecondsToDate(nanoseconds);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Convert YYYY-MM-DD string to nanoseconds (parsing as local midnight)
 * Use this when saving a date input value to the backend
 */
export const localDateStringToNanoseconds = (dateString: string): bigint => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return BigInt(date.getTime()) * NS_PER_MS;
};

/**
 * Format bigint nanoseconds as a readable date string
 */
export const formatNanoseconds = (
  nanoseconds: bigint,
  formatString: string = "MMM dd, yyyy",
): string => {
  return format(nanosecondsToDate(nanoseconds), formatString);
};

/**
 * Check if bigint timestamp is within this week
 */
export const isThisWeekNano = (nanoseconds: bigint): boolean => {
  const date = nanosecondsToDate(nanoseconds);
  return isWithinInterval(date, {
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date()),
  });
};

/**
 * Check if bigint timestamp is within last week
 */
export const isLastWeekNano = (nanoseconds: bigint): boolean => {
  const date = nanosecondsToDate(nanoseconds);
  const lastWeekStart = startOfWeek(subWeeks(new Date(), 1));
  const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1));
  return isWithinInterval(date, {
    start: lastWeekStart,
    end: lastWeekEnd,
  });
};

/**
 * Check if bigint timestamp is today
 */
export const isTodayNano = (nanoseconds: bigint): boolean => {
  return isToday(nanosecondsToDate(nanoseconds));
};

/**
 * Check if bigint timestamp is yesterday
 */
export const isYesterdayNano = (nanoseconds: bigint): boolean => {
  return isYesterday(nanosecondsToDate(nanoseconds));
};

/**
 * Check if bigint timestamp is tomorrow
 */
export const isTomorrowNano = (nanoseconds: bigint): boolean => {
  return isTomorrow(nanosecondsToDate(nanoseconds));
};

/**
 * Check if two bigint timestamps are on the same day
 */
export const isSameDayNano = (nano1: bigint, nano2: bigint): boolean => {
  return isSameDay(nanosecondsToDate(nano1), nanosecondsToDate(nano2));
};

/**
 * Get an array of the last N days (Date objects)
 */
export const getLastNDays = (n: number): Date[] => {
  return Array.from({ length: n }, (_, i) => subDays(new Date(), n - 1 - i));
};

/**
 * Get the last 7 days
 */
export const getLast7Days = (): Date[] => {
  return getLastNDays(7);
};

/**
 * Calculate days until a bigint timestamp
 */
export const daysUntilNano = (nanoseconds: bigint): number => {
  const target = nanosecondsToDate(nanoseconds);
  return differenceInDays(target, new Date());
};

/**
 * Format bigint timestamp as relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (nanoseconds: bigint): string => {
  const date = nanosecondsToDate(nanoseconds);

  if (isToday(date)) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  if (isYesterday(date)) {
    return "Yesterday";
  }

  if (isTomorrow(date)) {
    return "Tomorrow";
  }

  const daysAgo = differenceInDays(new Date(), date);
  if (daysAgo >= 0 && daysAgo <= 7) {
    return `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`;
  }

  return format(date, "MMM dd");
};

/**
 * Format date with conditional formatting based on recency
 */
export const formatSmartDate = (nanoseconds: bigint): string => {
  const date = nanosecondsToDate(nanoseconds);

  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`;
  }

  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  }

  if (isThisWeek(date)) {
    return format(date, "EEEE 'at' h:mm a");
  }

  return format(date, "MMM dd, yyyy 'at' h:mm a");
};

/**
 * Get day name (Mon, Tue, etc.)
 */
export const getDayName = (date: Date, short: boolean = true): string => {
  return format(date, short ? "EEE" : "EEEE");
};

/**
 * Check if a date falls within a range of days from now
 */
export const isWithinDaysFromNow = (
  nanoseconds: bigint,
  days: number,
): boolean => {
  const date = nanosecondsToDate(nanoseconds);
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  return date >= now && date <= future;
};
