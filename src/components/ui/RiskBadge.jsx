import React from "react";
import { T } from "./Tokens";

export default function RiskBadge({ risk }) {
  const map = {
    Low: { bg: T.positiveBg, fg: "#3F7A5C" },
    Medium: { bg: T.amberBg, fg: "#9A6B1E" },
    High: { bg: T.negativeBg, fg: "#A3392F" },
  };
  const c = map[risk] || map.Low;
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 transition-transform hover:scale-105"
      style={{ background: c.bg, color: c.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.fg }} />
      {risk}
    </span>
  );
}
