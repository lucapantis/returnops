"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { REASON_LABELS, type ReturnReason } from "@/lib/constants";
import { CHART_INK, REASON_COLORS } from "@/lib/chartColors";
import type { ReasonCount } from "@/lib/metrics";

export function ReasonBarChart({ data }: { data: ReasonCount[] }) {
  // Already sorted by count desc (color still follows the reason, not rank).
  const chartData = data.map((d) => ({
    reason: d.reason,
    label: REASON_LABELS[d.reason],
    count: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
      >
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: CHART_INK.secondary, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip
          cursor={{ fill: "rgba(11,11,11,0.04)" }}
          contentStyle={{ borderRadius: 8, border: "1px solid #e1e0d9", fontSize: 13 }}
          formatter={(value: number) => [`${value}`, "Returns"]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {chartData.map((entry) => (
            <Cell key={entry.reason} fill={REASON_COLORS[entry.reason as ReturnReason]} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            style={{ fill: CHART_INK.primary, fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
