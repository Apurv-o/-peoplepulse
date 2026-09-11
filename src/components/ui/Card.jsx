import React from "react";
import { T } from "./Tokens";

export default function Card({ children, className = "", padded = true, interactive = false }) {
  return (
    <div
      className={`bg-white rounded-2xl border ${padded ? "p-6" : ""} ${
        interactive ? "interactive-card cursor-pointer" : "transition-all duration-200 hover:shadow-[0_2px_12px_rgba(31,42,40,0.06)]"
      } ${className}`}
      style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(31,42,40,0.04)" }}
    >
      {children}
    </div>
  );
}
