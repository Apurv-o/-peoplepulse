import React from "react";

export default function Dropdown({ value, onChange, options, className = "" }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:border-[#4E6ABF] transition-all cursor-pointer ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
