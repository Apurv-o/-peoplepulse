import React from "react";
import { ShieldCheck } from "lucide-react";

export default function ToggleSwitch({ checked, onChange, disabled = false, ariaLabel = "Toggle" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={`group relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-300 ease-in-out border-0 outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4E6ABF] focus-visible:ring-offset-2 select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${
        checked
          ? "bg-[#4E6ABF] shadow-[0_2px_8px_rgba(78,106,191,0.35)]"
          : "bg-gray-200 hover:bg-gray-300"
      }`}
      style={{
        background: checked ? "linear-gradient(135deg, #4E6ABF 0%, #3B5299 100%)" : undefined,
      }}
    >
      <span
        className={`pointer-events-none flex items-center justify-center h-6 w-6 transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.18)] transition-all duration-300 ease-spring group-active:scale-95 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      >
        {checked ? (
          <ShieldCheck size={12} className="text-[#4E6ABF] animate-scale-in" />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        )}
      </span>
    </button>
  );
}
