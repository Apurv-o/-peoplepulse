import React from "react";
import Delta from "./Delta";
import { T } from "./Tokens";

export default function KPICard({ label, value, unit, delta, deltaSuffix, goodDirection, extra, className = "" }) {
  return (
    <div
      className={`bg-white rounded-2xl border p-6 interactive-card group flex flex-col justify-between ${className}`}
      style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(31,42,40,0.04)" }}
    >
      <div>
        <p className="text-xs uppercase tracking-wider font-semibold transition-colors group-hover:text-gray-900" style={{ color: T.muted }}>
          {label}
        </p>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-3xl font-extrabold tracking-tight transition-transform duration-200 group-hover:scale-[1.02]" style={{ color: T.text }}>
            {value}
          </span>
          {unit && <span className="text-sm font-medium" style={{ color: T.muted }}>{unit}</span>}
        </div>
      </div>
      <div className="mt-3 min-h-[24px] flex items-center">
        {delta !== undefined ? (
          <Delta value={delta} goodDirection={goodDirection} suffix={deltaSuffix} />
        ) : (
          extra
        )}
      </div>
    </div>
  );
}
