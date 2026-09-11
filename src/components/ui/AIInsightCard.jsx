import React from "react";
import { Sparkles } from "lucide-react";
import { T } from "./Tokens";

export default function AIInsightCard({ text, footnote, className = "" }) {
  return (
    <div
      className={`rounded-xl p-4 flex gap-3 transition-all duration-200 hover:border-blue-300 hover:shadow-sm ${className}`}
      style={{ background: "#F5F7FC", border: `1px solid #E3E7F5` }}
    >
      <div className="w-7 h-7 rounded-lg bg-blue-100/80 flex items-center justify-center shrink-0 mt-0.5 text-blue-600">
        <Sparkles size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-sm leading-relaxed font-medium" style={{ color: T.text }}>{text}</p>
        {footnote && <p className="text-xs mt-1.5 font-normal" style={{ color: T.muted }}>{footnote}</p>}
      </div>
    </div>
  );
}
