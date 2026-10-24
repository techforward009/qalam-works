"use client";
import { useEffect, useState } from "react";
import { formatLeading, parseLeading, type Leading } from "../utils/leading";
/** Editable classic combo: commits valid points/Auto, restores invalid entries. */
export function LeadingInput({ value, onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { ref?: React.Ref<HTMLInputElement>; value: Leading; onChange: (value: Leading) => void }) {
  const label = formatLeading(value);
  const [text,setText] = useState(label);
  useEffect(() => setText(label),[label]);
  const commit = () => { const next = parseLeading(text); if (next) { setText(formatLeading(next)); onChange(next); } else setText(label); };
  return <input {...props} list="studio-leading-points" value={text} onChange={event=>setText(event.target.value)} onBlur={commit} onKeyDown={event=>{ if(event.key === "Enter") { event.preventDefault(); commit(); } if(event.key === "Escape") setText(label); }} />;
}
