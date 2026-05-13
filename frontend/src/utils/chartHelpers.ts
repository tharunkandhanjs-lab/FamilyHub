import type { MoodEntry, Chore } from "../backend";
import {
  getLast7Days,
  getDayName,
  nanosecondsToDate,
  isSameDayNano,
} from "./dateHelpers";
import { getMoodScore, calculateAverageMoodScore } from "./dataHelpers";
import { CHART_COLORS } from "./chartColors";

export interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

/**
 * Prepare mood data for chart visualization
 * Returns last 7 days with average mood score per day
 */
export const prepareMoodChartData = (moods: MoodEntry[]): ChartDataPoint[] => {
  const last7Days = getLast7Days();

  return last7Days.map((day) => {
    // Filter moods for this specific day
    const dayMoods = moods.filter((m) => {
      const moodDate = nanosecondsToDate(m.date);
      return moodDate.toDateString() === day.toDateString();
    });

    const avgScore =
      dayMoods.length > 0 ? calculateAverageMoodScore(dayMoods) : 0;

    return {
      date: getDayName(day),
      score: Number(avgScore.toFixed(1)),
      count: dayMoods.length,
    };
  });
};

/**
 * Prepare chore completion data for chart visualization
 * Returns last 7 days with completion counts and rates
 */
export const prepareChoreChartData = (chores: Chore[]): ChartDataPoint[] => {
  const last7Days = getLast7Days();

  return last7Days.map((day) => {
    // Filter chores due on this day
    const dayChores = chores.filter((c) => {
      const choreDate = nanosecondsToDate(c.dueDate);
      return choreDate.toDateString() === day.toDateString();
    });

    const completed = dayChores.filter((c) => c.isCompleted).length;
    const total = dayChores.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      date: getDayName(day),
      completed,
      total,
      rate,
    };
  });
};

/**
 * Prepare member-specific mood trend data
 */
export const prepareMemberMoodTrend = (
  moods: MoodEntry[],
  memberId: bigint,
): ChartDataPoint[] => {
  const memberMoods = moods.filter((m) => m.memberId === memberId);
  const last7Days = getLast7Days();

  return last7Days.map((day) => {
    const dayMood = memberMoods.find((m) => {
      const moodDate = nanosecondsToDate(m.date);
      return moodDate.toDateString() === day.toDateString();
    });

    return {
      date: getDayName(day),
      score: dayMood ? getMoodScore(dayMood.mood) : 0,
      mood: dayMood?.mood || "—",
    };
  });
};

/**
 * Prepare member-specific chore completion trend
 */
export const prepareMemberChoreTrend = (
  chores: Chore[],
  memberId: bigint,
): ChartDataPoint[] => {
  const memberChores = chores.filter((c) => c.assignedTo === memberId);
  const last7Days = getLast7Days();

  return last7Days.map((day) => {
    const dayChores = memberChores.filter((c) => {
      const choreDate = nanosecondsToDate(c.dueDate);
      return choreDate.toDateString() === day.toDateString();
    });

    const completed = dayChores.filter((c) => c.isCompleted).length;

    return {
      date: getDayName(day),
      completed,
      total: dayChores.length,
    };
  });
};

/**
 * Prepare simple trend data from array of numbers
 * Useful for sparklines in StatCard
 */
export const prepareSparklineData = (values: number[]): number[] => {
  if (values.length === 0) return [];

  // Normalize values to 0-100 range for better visualization
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) return values.map(() => 50);

  return values.map((val) => ((val - min) / range) * 100);
};

/**
 * Calculate trend direction from data points
 */
export const getTrendDirection = (data: number[]): "up" | "down" | "stable" => {
  if (data.length < 2) return "stable";

  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;
  const threshold = ((firstAvg + secondAvg) / 2) * 0.1; // 10% threshold

  if (Math.abs(diff) < threshold) return "stable";
  return diff > 0 ? "up" : "down";
};

/**
 * Get color for chart based on data type
 */
export const getChartColor = (type: string): string => {
  const color = CHART_COLORS[type as keyof typeof CHART_COLORS];
  return color || CHART_COLORS.default;
};

/**
 * Prepare data for comparison charts (this week vs last week)
 */
export const prepareComparisonData = (
  currentWeekData: ChartDataPoint[],
  lastWeekData: ChartDataPoint[],
  dataKey: string,
): ChartDataPoint[] => {
  return currentWeekData.map((current, index) => ({
    date: current.date,
    current: current[dataKey] as number,
    previous: (lastWeekData[index]?.[dataKey] as number) || 0,
  }));
};
