import React from "react";
import { FACES } from "../../lib/constants";

export default function RatingSelector({
  value,
  onChange,
  label,
  minLabel = "Low",
  maxLabel = "High",
  required = false,
}) {
  return (
    <div className="py-4 border-b border-gray-100 last:border-0 select-none">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="font-semibold text-gray-800 text-sm">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
        <span
          className={`font-bold px-2.5 py-0.5 rounded-full text-xs transition-all duration-200 ${
            value
              ? "text-[#344A91] bg-blue-100/80 border border-blue-200"
              : "text-gray-400 bg-gray-100"
          }`}
        >
          {value ? `${value} / 5` : "Select"}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
        {FACES.map((face, i) => {
          const num = i + 1;
          const active = value === num;
          return (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 sm:py-3 rounded-2xl border transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-300 active:scale-95 ${
                active
                  ? "border-[#4E6ABF] bg-gradient-to-b from-[#EEF1FA] to-blue-50/80 shadow-[0_4px_14px_rgba(78,106,191,0.22)] scale-105 z-10"
                  : "border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50/80 hover:scale-102"
              }`}
            >
              <span className={`text-2xl sm:text-3xl transition-transform duration-200 ${active ? "scale-115 drop-shadow-xs" : "group-hover:scale-110"}`}>
                {face}
              </span>
              <span
                className={`text-[11px] font-bold transition-colors ${
                  active ? "text-[#344A91]" : "text-gray-400 group-hover:text-gray-600"
                }`}
              >
                {num}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between text-[11px] text-gray-400 px-1 mt-2 font-medium">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

