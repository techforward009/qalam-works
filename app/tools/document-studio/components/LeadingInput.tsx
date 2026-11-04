"use client";
import { useEffect, useRef, useState } from "react";
import { formatLeading, parseLeading, type Leading } from "../utils/leading";

function focusEditor(node: HTMLElement) {
  node.closest("[data-studio-shell]")?.querySelector<HTMLElement>(".ProseMirror")?.focus();
}

/** Editable classic combo: commits valid points/Auto, restores invalid entries. */
export function LeadingInput({ value, mixed = false, onChange, ref: forwarded, onKeyDown, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { ref?: React.Ref<HTMLInputElement>; value: Leading; mixed?: boolean; onChange: (value: Leading, meta?: { focus?: boolean }) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dirtyRef = useRef(false);
  const tabbing = useRef(false);
  const cancelling = useRef(false);
  const label = mixed ? "" : formatLeading(value);
  const [text, setText] = useState(label);
  useEffect(() => {
    if (dirtyRef.current || document.activeElement === inputRef.current) return;
    setText(label);
  }, [label]);
  const commit = (raw: string, focus = true, fromBlur = false) => {
    if (fromBlur && !dirtyRef.current) { setText(label); return; }
    dirtyRef.current = false;
    const next = parseLeading(raw);
    if (next) { setText(formatLeading(next)); onChange(next, { focus }); }
    else setText(label);
  };
  return <input {...props} ref={(node) => { inputRef.current = node; if (typeof forwarded === "function") forwarded(node); else if (forwarded) forwarded.current = node; }} value={text} onChange={event => { dirtyRef.current = true; setText(event.target.value); }} onBlur={event => {
    if (cancelling.current) { cancelling.current = false; tabbing.current = false; dirtyRef.current = false; setText(label); return; }
    const next = event.relatedTarget;
    const toolbar = event.currentTarget.closest("[data-studio-toolbar]");
    const inToolbar = next instanceof HTMLElement && !!toolbar?.contains(next);
    const stay = inToolbar || tabbing.current;
    tabbing.current = false;
    commit(event.currentTarget.value, !stay, true);
    if (inToolbar) next.focus();
  }} onKeyDown={event => {
    if (event.key === "Tab") tabbing.current = true;
    if (event.key === "Enter") { event.preventDefault(); commit(event.currentTarget.value, true); focusEditor(event.currentTarget); }
    if (event.key === "Escape") { event.preventDefault(); dirtyRef.current = false; cancelling.current = true; setText(label); focusEditor(event.currentTarget); }
    onKeyDown?.(event);
  }} />;
}
