"use client";
import { useEffect, useRef, useState } from "react";
import { formatLeading, parseLeading, type Leading } from "../utils/leading";

function focusEditor(node: HTMLElement) {
  node.closest("[data-studio-shell]")?.querySelector<HTMLElement>(".ProseMirror")?.focus();
}

/** Editable classic combo: commits valid points/Auto, restores invalid entries. */
export function LeadingInput({ value, onChange, ref: forwarded, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { ref?: React.Ref<HTMLInputElement>; value: Leading; onChange: (value: Leading, meta?: { focus?: boolean }) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const tabbing = useRef(false);
  const label = formatLeading(value);
  const [text, setText] = useState(label);
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setText(label);
  }, [label]);
  const commit = (raw: string, focus = true) => {
    const next = parseLeading(raw);
    if (next) { setText(formatLeading(next)); onChange(next, { focus }); }
    else setText(label);
  };
  return <input {...props} ref={(node) => { inputRef.current = node; if (typeof forwarded === "function") forwarded(node); else if (forwarded) forwarded.current = node; }} value={text} onChange={event => setText(event.target.value)} onBlur={event => {
    const next = event.relatedTarget;
    const toolbar = event.currentTarget.closest("[data-studio-toolbar]");
    const inToolbar = next instanceof HTMLElement && !!toolbar?.contains(next);
    const stay = inToolbar || tabbing.current;
    tabbing.current = false;
    commit(event.currentTarget.value, !stay);
    if (inToolbar) next.focus();
  }} onKeyDown={event => {
    if (event.key === "Tab") tabbing.current = true;
    if (event.key === "Enter") { event.preventDefault(); commit(event.currentTarget.value, true); focusEditor(event.currentTarget); }
    if (event.key === "Escape") { event.preventDefault(); setText(label); focusEditor(event.currentTarget); }
  }} />;
}
