import React, { useState } from "react";
import ToggleSwitch from "./ToggleSwitch";

export default function ToggleRow({
  title,
  label,
  description,
  sub,
  checked,
  defaultOn = false,
  onChange,
  disabled = false,
  badge = null,
}) {
  const [internalChecked, setInternalChecked] = useState(defaultOn);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  const handleToggle = () => {
    if (disabled) return;
    if (onChange) {
      onChange(!isChecked);
    }
    if (!isControlled) {
      setInternalChecked((prev) => !prev);
    }
  };

  const effectiveTitle = title || label || "";
  const effectiveDescription = description || sub || "";

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0 select-none">
      <div className="pr-4">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-gray-800">{effectiveTitle}</p>
          {badge}
        </div>
        {effectiveDescription && (
          <p className="text-[11px] text-gray-500 mt-0.5">{effectiveDescription}</p>
        )}
      </div>
      <ToggleSwitch checked={isChecked} onChange={handleToggle} disabled={disabled} />
    </div>
  );
}
