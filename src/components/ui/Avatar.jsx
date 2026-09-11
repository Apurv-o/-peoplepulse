import React from "react";
import { T } from "./Tokens";

export default function Avatar({ initials, size = 36, className = "" }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 border border-white/70 shadow-sm transition-transform hover:scale-105 select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #EEF1FA 0%, #E0E7F8 100%)",
        color: T.primaryDark,
        fontSize: Math.max(11, size * 0.36),
      }}
    >
      {initials}
    </div>
  );
}
