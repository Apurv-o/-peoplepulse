import React from "react";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { T } from "./Tokens";

export default function Sparkline({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={36}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="score" stroke={T.primary} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
