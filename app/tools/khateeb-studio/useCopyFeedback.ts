"use client";
import { useEffect, useRef, useState } from "react";
export type CopyFeedbackState = { status: "idle" | "copying" | "copied" | "manual"; text: string };
export function useCopyFeedback() {
  const [state, setState] = useState<CopyFeedbackState>({ status: "idle", text: "" });
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; }, []);
  async function copy(text: string) {
    if (!text) return;
    const id = ++request.current;
    setState({ status: "copying", text: "" });
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      if (id === request.current) setState({ status: "copied", text: "" });
    } catch {
      if (id === request.current) setState({ status: "manual", text });
    }
  }
  function dismiss() { request.current += 1; setState({ status: "idle", text: "" }); }
  return { state, copy, dismiss };
}
