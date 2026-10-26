"use client";
import { useEffect, useRef, useState } from "react";
import { formatLeading, parseLeading, type Leading } from "../utils/leading";
/** Editable classic combo: commits valid points/Auto, restores invalid entries. */
export function LeadingInput({ value, onChange, ref: forwarded, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { ref?: React.Ref<HTMLInputElement>; value: Leading; onChange: (value: Leading) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const label = formatLeading(value);
  const [text, setText] = useState(label);
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setText(label);
  }, [label]);
  const commit = (raw: string) => { const next = parseLeading(raw); if (next) { setText(formatLeading(next)); onChange(next); } else setText(label); };
  return <input {...props} ref={(node) => { inputRef.current = node; if (typeof forwarded === "function") forwarded(node); else if (forwarded) forwarded.current = node; }} value={text} onChange={event => setText(event.target.value)} onBlur={event => commit(event.currentTarget.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); commit(event.currentTarget.value); } if (event.key === "Escape") setText(label); }} />;
}
