import React from "react";
import ToggleSwitch from "./ToggleSwitch";

export default function ToggleRow({ title, description, checked, onChange, disabled = false, badge = null }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0 select-none">
      <div className="pr-4">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-gray-800">{title}</p>
          {badge}
        </div>
        {description && <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}
