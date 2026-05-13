import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { CHART_COLORS } from "../../utils/chartColors";

interface TrendChartProps {
  data: Array<Record<string, any>>;
  type: "line" | "bar" | "area";
  dataKey: string;
  xKey: string;
  color?: string;
  label?: string;
  className?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  type,
  dataKey,
  xKey,
  color,
  label,
  className,
}) => {
  const resolvedColor = color || CHART_COLORS.mood;
  const axisStroke = CHART_COLORS.default;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
          <p className="text-sm text-foreground">{label}</p>
          <p className="text-sm" style={{ color: resolvedColor }}>
            {`${dataKey}: ${payload[0].value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 5, left: 0, bottom: 5 },
    };

    const commonAxisProps = {
      stroke: axisStroke,
      style: { fontSize: "12px", fontWeight: "300" },
    };

    switch (type) {
      case "area":
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={resolvedColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={resolvedColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border"
              opacity={0.3}
            />
            <XAxis dataKey={xKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={resolvedColor}
              fill="url(#colorGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        );

      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border"
              opacity={0.3}
            />
            <XAxis dataKey={xKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={dataKey} fill={resolvedColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case "line":
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border"
              opacity={0.3}
            />
            <XAxis dataKey={xKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={resolvedColor}
              strokeWidth={2}
              dot={{ fill: resolvedColor, r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {label && <h4 className="text-sm text-muted-foreground mb-2">{label}</h4>}
      <ResponsiveContainer width="100%" height={200}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};
