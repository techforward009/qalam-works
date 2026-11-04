// app/tools/document-studio/utils/useInpageKeyboard.ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  KeyboardLayoutId,
  KeyboardLayout,
  loadKeyboardChoice,
  saveKeyboardChoice,
  parseCustomLayout
} from "./inpageKeyboard";
import rawLayouts from "./keyboardLayouts.json";

const baseLayoutsMap = rawLayouts as Record<string, KeyboardLayout>;

const CUSTOM_LAYOUT_STORAGE_KEY = "qalam.keyboard.custom";

export function isKeyboardToggleShortcut(e: {
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}): boolean {
  return (
    e.code === "F12" &&
    !e.ctrlKey &&
    !e.altKey &&
    !e.shiftKey &&
    !e.metaKey
  );
}

export function useInpageKeyboard(): {
  layoutId: KeyboardLayoutId;
  setLayoutId(id: KeyboardLayoutId): void;
  toggle(): void;
  activeLayout: KeyboardLayout | null;
  customLayout: KeyboardLayout | null;
  setCustomLayout(l: KeyboardLayout | null): void;
  getLayout: () => KeyboardLayout | null;
} {
  const [layoutId, setLayoutIdState] = useState<KeyboardLayoutId>("off");
  const [customLayout, setCustomLayoutState] = useState<KeyboardLayout | null>(null);

  const lastNonOffRef = useRef<KeyboardLayoutId>("inpagePhonetic");
  const activeLayoutRef = useRef<KeyboardLayout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedId = loadKeyboardChoice(window.localStorage);
    setLayoutIdState(savedId);
    if (savedId !== "off") {
      lastNonOffRef.current = savedId;
    }

    const savedCustomJson = window.localStorage.getItem(CUSTOM_LAYOUT_STORAGE_KEY);
    if (savedCustomJson) {
      const parsed = parseCustomLayout(savedCustomJson);
      if (parsed.ok) {
        setCustomLayoutState(parsed.layout);
      }
    }
  }, []);

  let activeLayout: KeyboardLayout | null = null;
  if (layoutId === "off") {
    activeLayout = null;
  } else if (layoutId === "custom") {
    activeLayout = customLayout;
  } else {
    activeLayout = baseLayoutsMap[layoutId] || null;
  }

  activeLayoutRef.current = activeLayout;

  const setLayoutId = useCallback((id: KeyboardLayoutId) => {
    setLayoutIdState(id);
    if (id !== "off") {
      lastNonOffRef.current = id;
    }
    if (typeof window !== "undefined") {
      saveKeyboardChoice(window.localStorage, id);
    }
  }, []);

  const setCustomLayout = useCallback((l: KeyboardLayout | null) => {
    setCustomLayoutState(l);
    if (typeof window !== "undefined") {
      if (l) {
        window.localStorage.setItem(CUSTOM_LAYOUT_STORAGE_KEY, JSON.stringify(l));
      } else {
        window.localStorage.removeItem(CUSTOM_LAYOUT_STORAGE_KEY);
      }
    }
  }, []);

  const toggle = useCallback(() => {
    if (layoutId === "off") {
      setLayoutId(lastNonOffRef.current);
    } else {
      setLayoutId("off");
    }
  }, [layoutId, setLayoutId]);

  const getLayout = useCallback(() => {
    return activeLayoutRef.current;
  }, []);

  return {
    layoutId,
    setLayoutId,
    toggle,
    activeLayout,
    customLayout,
    setCustomLayout,
    getLayout,
  };
}