import type {
  Chore,
  MoodEntry,
  CalendarEvent,
  FamilyMember,
  MealOption,
  ShoppingItem,
} from "../backend";
import {
  formatRelativeTime,
  isTodayNano,
  nanosecondsToDate,
} from "./dateHelpers";
import { Activity } from "../components/shared/ActivityFeed";
import { CHART_COLORS } from "./chartColors";
import {
  CheckCircle2,
  Smile,
  Calendar as CalendarIcon,
  UtensilsCrossed,
} from "lucide-react";

/**
 * Calculate completion rate as a percentage
 */
export const calculateCompletionRate = (
  items: { isCompleted: boolean }[],
): number => {
  if (items.length === 0) return 0;
  const completed = items.filter((i) => i.isCompleted).length;
  return Math.round((completed / items.length) * 100);
};

/**
 * Calculate percentage change between two values
 */
export const calculateChange = (
  current: number,
  previous: number,
): {
  value: string;
  type: "positive" | "negative" | "neutral";
} => {
  if (previous === 0) {
    if (current === 0) return { value: "—", type: "neutral" };
    return { value: `+${current}`, type: "positive" };
  }

  const change = ((current - previous) / previous) * 100;
  const absChange = Math.abs(change);

  if (absChange < 0.1) {
    return { value: "—", type: "neutral" };
  }

  return {
    value: `${change > 0 ? "+" : ""}${change.toFixed(1)}%`,
    type: change > 0 ? "positive" : change < 0 ? "negative" : "neutral",
  };
};

/**
 * Get member-specific statistics
 */
export const getMemberStats = (
  memberId: bigint,
  chores: Chore[],
  moods: MoodEntry[],
  events: CalendarEvent[],
) => {
  const memberChores = chores.filter((c) => c.assignedTo === memberId);
  const memberMoods = moods.filter((m) => m.memberId === memberId);
  const memberEvents = events.filter((e) =>
    e.memberIds.some((a) => a === memberId),
  );

  const recentMood = memberMoods.sort((a, b) => Number(b.date - a.date))[0];

  return {
    choresAssigned: memberChores.length,
    choresCompleted: memberChores.filter((c) => c.isCompleted).length,
    completionRate: calculateCompletionRate(memberChores),
    moodCheckIns: memberMoods.length,
    recentMood: recentMood?.mood || null,
    upcomingEvents: memberEvents.filter(
      (e) => nanosecondsToDate(e.startDate) > new Date(),
    ).length,
  };
};

/**
 * Generate activity feed from various data sources
 */
export const generateActivityFeed = (
  moods: MoodEntry[],
  chores: Chore[],
  events: CalendarEvent[],
  meals: MealOption[],
  members: FamilyMember[],
  maxItems: number = 20,
): Activity[] => {
  const activities: Activity[] = [];

  const getMemberName = (id: bigint): string => {
    return members.find((m) => m.id === id)?.name || "Someone";
  };

  // Recent moods
  moods.forEach((m) => {
    activities.push({
      type: "mood",
      memberName: getMemberName(m.memberId),
      action: `logged mood ${m.mood}`,
      time: formatRelativeTime(m.date),
      icon: Smile,
      color: CHART_COLORS.mood,
    });
  });

  // Completed chores
  chores
    .filter((c) => c.isCompleted && c.assignedTo)
    .forEach((c) => {
      activities.push({
        type: "chore",
        memberName: getMemberName(c.assignedTo!),
        action: `completed "${c.title}"`,
        time: formatRelativeTime(c.dueDate),
        icon: CheckCircle2,
        color: CHART_COLORS.chore,
      });
    });

  // New events
  events.forEach((e) => {
    if (e.memberIds.length > 0) {
      activities.push({
        type: "event",
        memberName: getMemberName(e.memberIds[0]),
        action: `created event "${e.title}"`,
        time: formatRelativeTime(e.startDate),
        icon: CalendarIcon,
        color: CHART_COLORS.event,
      });
    }
  });

  // Meal proposals
  meals.forEach((m) => {
    activities.push({
      type: "meal",
      memberName: getMemberName(m.proposedBy),
      action: `proposed meal "${m.name}"`,
      time: formatRelativeTime(m.scheduledDate),
      icon: UtensilsCrossed,
      color: CHART_COLORS.meal,
    });
  });

  // Sort by time (most recent first) and limit
  return activities
    .sort((a, b) => {
      // This is a simple string comparison, may not be perfectly accurate
      // but good enough for display purposes
      if (a.time.includes("ago") && !b.time.includes("ago")) return -1;
      if (!a.time.includes("ago") && b.time.includes("ago")) return 1;
      return 0;
    })
    .slice(0, maxItems);
};

/**
 * Calculate mood score from emoji
 */
export const getMoodScore = (mood: string): number => {
  const scores: Record<string, number> = {
    "😊": 10,
    "🤩": 10,
    "😐": 7,
    "😴": 5,
    "😢": 3,
    "😡": 2,
  };
  return scores[mood] || 5;
};

/**
 * Calculate average mood score
 */
export const calculateAverageMoodScore = (moods: MoodEntry[]): number => {
  if (moods.length === 0) return 0;

  const scores = moods.map((m) => getMoodScore(m.mood));
  const sum = scores.reduce((a, b) => a + b, 0);
  return sum / scores.length;
};

/**
 * Get emoji for average mood score
 */
export const getEmojiForScore = (score: number): string => {
  if (score === 0) return "😊"; // Default to happy when no moods logged
  if (score >= 9) return "😊";
  if (score >= 7) return "😐";
  if (score >= 5) return "😴";
  if (score >= 3) return "😢";
  return "😡";
};

/**
 * Group items by date
 */
export const groupByDate = <T extends { date?: bigint }>(
  items: T[],
): Map<string, T[]> => {
  const grouped = new Map<string, T[]>();

  items.forEach((item) => {
    if (!item.date) return;

    const date = nanosecondsToDate(item.date);
    const dateKey = date.toDateString();

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }

    grouped.get(dateKey)!.push(item);
  });

  return grouped;
};

/**
 * Filter items by date range
 */
export const filterByDateRange = <T extends { date?: bigint }>(
  items: T[],
  startDate: Date,
  endDate: Date,
): T[] => {
  return items.filter((item) => {
    if (!item.date) return false;
    const date = nanosecondsToDate(item.date);
    return date >= startDate && date <= endDate;
  });
};

/**
 * Get items for today
 */
export const filterToday = <T extends { date?: bigint }>(items: T[]): T[] => {
  return items.filter((item) => item.date && isTodayNano(item.date));
};

/**
 * Sort items by date (newest first)
 */
export const sortByDateDesc = <T extends { date?: bigint }>(
  items: T[],
): T[] => {
  return [...items].sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return Number(b.date - a.date);
  });
};

/**
 * Sort items by date (oldest first)
 */
export const sortByDateAsc = <T extends { date?: bigint }>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return Number(a.date - b.date);
  });
};
