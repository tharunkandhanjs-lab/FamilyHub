import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
  trend?: number[];
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  trend,
  className,
}) => {
  const getChangeIcon = () => {
    if (!change) return null;

    switch (changeType) {
      case "positive":
        return <ArrowUp className="h-3 w-3" />;
      case "negative":
        return <ArrowDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const changeColorClass = {
    positive: "text-primary",
    negative: "text-destructive",
    neutral: "text-muted-foreground",
  }[changeType];

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col">
            <div className="text-2xl text-foreground">{value}</div>
            {change && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  changeColorClass,
                )}
              >
                {getChangeIcon()}
                <span>{change}</span>
              </div>
            )}
          </div>
          {trend && trend.length > 0 && (
            <div className="flex items-end gap-0.5 h-8">
              {trend.map((val, i) => {
                const maxVal = Math.max(...trend);
                const height = (val / maxVal) * 100;
                return (
                  <div
                    key={i}
                    className={cn(
                      "w-1 rounded-t-sm transition-all",
                      changeType === "positive"
                        ? "bg-primary"
                        : changeType === "negative"
                          ? "bg-destructive/10"
                          : "bg-muted",
                    )}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
