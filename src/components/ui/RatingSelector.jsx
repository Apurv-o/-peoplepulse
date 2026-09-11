import React from "react";

export default function RatingSelector({ value, onChange, label, minLabel = "Low", maxLabel = "High", required = false }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-800">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
        <span className="font-bold text-[#4E6ABF] bg-blue-50 px-2 py-0.5 rounded">
          {value ? `${value} / 5` : "Select"}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              value === num
                ? "bg-[#4E6ABF] border-[#4E6ABF] text-white shadow-sm scale-102"
                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {num}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-gray-400 px-1">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
