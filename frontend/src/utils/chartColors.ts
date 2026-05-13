function getCSSColor(varName: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}

export const CHART_COLORS = {
  get mood() {
    return getCSSColor("--chart-1");
  },
  get chore() {
    return getCSSColor("--chart-2");
  },
  get event() {
    return getCSSColor("--chart-3");
  },
  get meal() {
    return getCSSColor("--chart-4");
  },
  get shopping() {
    return getCSSColor("--chart-5");
  },
  get default() {
    return getCSSColor("--muted-foreground");
  },
} as const;
