import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { T } from "./Tokens";

export default function Delta({ value, goodDirection = "up", suffix = "" }) {
  const isUp = value >= 0;
  const good = goodDirection === "up" ? isUp : !isUp;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-all"
      style={{
        background: good ? T.positiveBg : T.negativeBg,
        color: good ? "#3F7A5C" : "#A3392F",
      }}
    >
      {isUp ? <ArrowUp size={11} className="shrink-0" /> : <ArrowDown size={11} className="shrink-0" />}
      <span>{Math.abs(value)}{suffix}</span>
    </span>
  );
}
