// app/tools/document-studio/components/CustomKeyboardDialog.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { KeyboardLayout, KeyState } from "../utils/inpageKeyboard";

export interface CustomKeyboardDialogProps {
  open: boolean;
  initial: KeyboardLayout | null;
  baseLayouts: Record<"inpageMonotype" | "inpagePhonetic" | "arabic" | "persian", KeyboardLayout>;
  onSave(l: KeyboardLayout): void;
  onClose(): void;
}

const URDU_FONT = '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", "Noto Naskh Arabic", serif';
const UI_FONT = '"Segoe UI", Tahoma, Arial, sans-serif';

interface KeyDef {
  code: string;
  label: string;
  width?: number; // relative flex / width units
  isModifier?: boolean;
  isDecorative?: boolean;
}

const FUNCTION_ROW: KeyDef[] = [
  { code: "Escape", label: "Esc", width: 1.2, isDecorative: true },
  { code: "F1", label: "F1", isDecorative: true },
  { code: "F2", label: "F2", isDecorative: true },
  { code: "F3", label: "F3", isDecorative: true },
  { code: "F4", label: "F4", isDecorative: true },
  { code: "F5", label: "F5", isDecorative: true },
  { code: "F6", label: "F6", isDecorative: true },
  { code: "F7", label: "F7", isDecorative: true },
  { code: "F8", label: "F8", isDecorative: true },
  { code: "F9", label: "F9", isDecorative: true },
  { code: "F10", label: "F10", isDecorative: true },
  { code: "F11", label: "F11", isDecorative: true },
  { code: "F12", label: "F12", isDecorative: true },
];

const ROW_1: KeyDef[] = [
  { code: "Backquote", label: "`" },
  { code: "Digit1", label: "1" },
  { code: "Digit2", label: "2" },
  { code: "Digit3", label: "3" },
  { code: "Digit4", label: "4" },
  { code: "Digit5", label: "5" },
  { code: "Digit6", label: "6" },
  { code: "Digit7", label: "7" },
  { code: "Digit8", label: "8" },
  { code: "Digit9", label: "9" },
  { code: "Digit0", label: "0" },
  { code: "Minus", label: "-" },
  { code: "Equal", label: "=" },
  { code: "Backspace", label: "Backspace", width: 2.0, isModifier: true },
];

const ROW_2: KeyDef[] = [
  { code: "Tab", label: "Tab", width: 1.5, isModifier: true },
  { code: "KeyQ", label: "Q" },
  { code: "KeyW", label: "W" },
  { code: "KeyE", label: "E" },
  { code: "KeyR", label: "R" },
  { code: "KeyT", label: "T" },
  { code: "KeyY", label: "Y" },
  { code: "KeyU", label: "U" },
  { code: "KeyI", label: "I" },
  { code: "KeyO", label: "O" },
  { code: "KeyP", label: "P" },
  { code: "BracketLeft", label: "[" },
  { code: "BracketRight", label: "]" },
  { code: "Backslash", label: "\\", width: 1.5 },
];

const ROW_3: KeyDef[] = [
  { code: "CapsLock", label: "Caps", width: 1.8, isModifier: true },
  { code: "KeyA", label: "A" },
  { code: "KeyS", label: "S" },
  { code: "KeyD", label: "D" },
  { code: "KeyF", label: "F" },
  { code: "KeyG", label: "G" },
  { code: "KeyH", label: "H" },
  { code: "KeyJ", label: "J" },
  { code: "KeyK", label: "K" },
  { code: "KeyL", label: "L" },
  { code: "Semicolon", label: ";" },
  { code: "Quote", label: "'" },
  { code: "Enter", label: "Enter", width: 2.2, isModifier: true },
];

const ROW_4: KeyDef[] = [
  { code: "ShiftLeft", label: "Shift", width: 2.4, isModifier: true },
  { code: "KeyZ", label: "Z" },
  { code: "KeyX", label: "X" },
  { code: "KeyC", label: "C" },
  { code: "KeyV", label: "V" },
  { code: "KeyB", label: "B" },
  { code: "KeyN", label: "N" },
  { code: "KeyM", label: "M" },
  { code: "Comma", label: "," },
  { code: "Period", label: "." },
  { code: "Slash", label: "/" },
  { code: "ShiftRight", label: "Shift", width: 2.6, isModifier: true },
];

const ROW_5: KeyDef[] = [
  { code: "ControlLeft", label: "Ctrl", width: 1.4, isModifier: true },
  { code: "MetaLeft", label: "Win", width: 1.2, isModifier: true },
  { code: "AltLeft", label: "Alt", width: 1.3, isModifier: true },
  { code: "Space", label: "Space", width: 6.2, isModifier: true },
  { code: "AltRight", label: "AltGr", width: 1.4, isModifier: true },
  { code: "ControlRight", label: "Ctrl", width: 1.5, isModifier: true },
];

const EDITABLE_CODES = new Set<string>([
  "Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6",
  "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal",
  "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP",
  "BracketLeft", "BracketRight", "Backslash",
  "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL",
  "Semicolon", "Quote",
  "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM",
  "Comma", "Period", "Slash"
]);

const EXCLUDED_FORMAT_CHARS = new Set<number>([
  0x0600, 0x0601, 0x0602, 0x0603, 0x0604, 0x0605, 0x061C, 0x06DD
]);

const CHARMAP_SUBSETS: { name: string; ranges: [number, number][] }[] = [
  { name: "Arabic (0600-06FF)", ranges: [[0x0600, 0x06FF]] },
  { name: "Arabic Supplement (0750-077F)", ranges: [[0x0750, 0x077F]] },
  { name: "Presentation Forms-A (FB50-FDFF)", ranges: [[0xFB50, 0xFDFF]] },
];

export function CustomKeyboardDialog(props: CustomKeyboardDialogProps): React.JSX.Element | null {
  const { open, initial, baseLayouts, onSave, onClose } = props;

  const [layout, setLayout] = useState<KeyboardLayout>({});
  const [selectedCode, setSelectedCode] = useState<string>("KeyQ");
  const [viewState, setViewState] = useState<KeyState>("normal");
  const [lastFocusedState, setLastFocusedState] = useState<KeyState>("normal");
  const [keyboardName, setKeyboardName] = useState<string>("Custom Keyboard");
  const [startFrom, setStartFrom] = useState<string>("inpageMonotype");
  const [statusMessage, setStatusMessage] = useState<string>('Select a key to view or edit mappings.');
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [helpOpen, setHelpOpen] = useState<boolean>(true);
  const [charMapOpen, setCharMapOpen] = useState<boolean>(false);
  const [charMapSubsetIndex, setCharMapSubsetIndex] = useState<number>(0);
  const [hoveredCharInfo, setHoveredCharInfo] = useState<{ char: string; cp: number } | null>(null);

  // Movable Dialog Window coordinates
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Load / initialize dialog
  useEffect(() => {
    if (open) {
      const working = initial
        ? (JSON.parse(JSON.stringify(initial)) as KeyboardLayout)
        : (JSON.parse(JSON.stringify(baseLayouts.inpageMonotype || {})) as KeyboardLayout);
      setLayout(working);
      setSelectedCode("KeyQ");
      setViewState("normal");
      setLastFocusedState("normal");
      setErrorMessage("");
      setStatusMessage("Keyboard loaded. Click a key or press it on your keyboard.");
      try {
        const storedHelp = localStorage.getItem("qalam.keyboard.helpHidden");
        if (storedHelp === "true") {
          setHelpOpen(false);
        } else {
          setHelpOpen(true);
        }
      } catch {
        setHelpOpen(true);
      }
      setPosition(null); // Recenter on fresh open
    }
  }, [open, initial, baseLayouts]);

  // Take focus away from the editor so no keystroke lands in the document.
  useEffect(() => {
    if (!open) return;
    const active = document.activeElement;
    if (!(active && dialogRef.current?.contains(active))) dialogRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Center the dialog upon mounting when open
  useEffect(() => {
    if (open && position === null && typeof window !== "undefined") {
      const w = Math.min(window.innerWidth * 0.96, 960);
      const h = Math.min(window.innerHeight * 0.92, 740);
      const x = Math.max(10, (window.innerWidth - w) / 2);
      const y = Math.max(10, (window.innerHeight - h) / 2);
      setPosition({ x, y });
    }
  }, [open, position]);

  const toggleHelp = () => {
    setHelpOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("qalam.keyboard.helpHidden", String(!next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Dragging logic
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement && e.target.closest("button")) {
      return;
    }
    const currentX = position?.x ?? 0;
    const currentY = position?.y ?? 0;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    // Keep the whole dialog inside the viewport (not just its first 300px).
    const rect = dialogRef.current?.getBoundingClientRect();
    const w = rect && rect.width > 0 ? rect.width : 300;
    const h = rect && rect.height > 0 ? rect.height : 150;
    const nextX = Math.max(0, Math.min(Math.max(0, window.innerWidth - w), dragRef.current.initX + dx));
    const nextY = Math.max(0, Math.min(Math.max(0, window.innerHeight - h), dragRef.current.initY + dy));
    setPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      dragRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Keyboard shortcut for Escape (Cancel) and physical key detection
  useEffect(() => {
    if (!open) return;

    // Capture phase + stopPropagation so Escape/Enter/key presses never reach
    // the editor (or document-level shortcuts) underneath the dialog.
    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable);
      const insideDialog = !!(activeEl && dialogRef.current?.contains(activeEl));

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === "Enter") {
        e.stopPropagation();
        // Let focused buttons/selects activate normally; elsewhere Enter = OK.
        if (isInput && insideDialog) return;
        if (activeEl instanceof HTMLButtonElement && insideDialog) return;
        e.preventDefault();
        handleCommit();
        return;
      }

      if (isInput && insideDialog) {
        // Typing into the dialog's own fields: keep it away from the editor.
        e.stopPropagation();
        return;
      }

      // Physical key outside inputs selects that key and never types anywhere.
      if (!e.ctrlKey && !e.metaKey && EDITABLE_CODES.has(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedCode(e.code);
        setStatusMessage(`Key ${e.code} selected via physical keyboard.`);
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown, true);
    };
  }, [open, onClose, layout]);

  // Updating layout mappings
  const updateKeyMapping = useCallback((code: string, state: KeyState, char: string) => {
    if (!EDITABLE_CODES.has(code) || code === "Space") return;

    setLayout((prev) => {
      const next = { ...prev };
      const currentEntry = { ...(next[code] || {}) };

      if (!char || char.trim() === "") {
        delete currentEntry[state];
      } else {
        currentEntry[state] = char.slice(0, 4);
      }

      if (Object.keys(currentEntry).length === 0) {
        delete next[code];
      } else {
        next[code] = currentEntry;
      }
      return next;
    });

    const stateLabel =
      state === "normal"
        ? "Normal"
        : state === "shift"
        ? "Shift"
        : state === "altgr"
        ? "AltGr"
        : "Shift+AltGr";
    setStatusMessage(`${code} + ${stateLabel} now types "${char || "(nothing)"}"`);
  }, []);

  const handleCharInput = (state: KeyState, val: string) => {
    updateKeyMapping(selectedCode, state, val);
  };

  const handleCodeInput = (state: KeyState, numStr: string) => {
    if (numStr === "") {
      updateKeyMapping(selectedCode, state, "");
      return;
    }
    const parsed = parseInt(numStr, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 0x10ffff) {
      try {
        const char = String.fromCodePoint(parsed);
        updateKeyMapping(selectedCode, state, char);
      } catch {
        // ignore invalid codepoint
      }
    }
  };

  // CharMap characters list
  const charMapList = useMemo(() => {
    const list: number[] = [];
    const ranges = CHARMAP_SUBSETS[charMapSubsetIndex]?.ranges || [];
    for (const [start, end] of ranges) {
      for (let cp = start; cp <= end; cp++) {
        if (EXCLUDED_FORMAT_CHARS.has(cp)) continue;
        try {
          const s = String.fromCodePoint(cp);
          if (s && s.trim() !== "") {
            list.push(cp);
          }
        } catch {
          // ignore
        }
      }
    }
    return list;
  }, [charMapSubsetIndex]);

  const handleCommit = () => {
    const sanitized: KeyboardLayout = {};
    for (const [code, val] of Object.entries(layout)) {
      if (code === "__name" || code === "Space") continue;
      if (EDITABLE_CODES.has(code) && val && typeof val === "object") {
        const cleanedVal: Partial<Record<KeyState, string>> = {};
        if (val.normal) cleanedVal.normal = val.normal.slice(0, 4);
        if (val.shift) cleanedVal.shift = val.shift.slice(0, 4);
        if (val.altgr) cleanedVal.altgr = val.altgr.slice(0, 4);
        if (val.shiftAltgr) cleanedVal.shiftAltgr = val.shiftAltgr.slice(0, 4);
        if (Object.keys(cleanedVal).length > 0) {
          sanitized[code] = cleanedVal;
        }
      }
    }
    onSave(sanitized);
  };

  const handleLoadStartFrom = () => {
    if (window.confirm("Replace current layout? All unsaved changes will be lost.")) {
      if (startFrom === "empty") {
        setLayout({});
        setStatusMessage("Layout cleared to empty.");
      } else {
        const base = baseLayouts[startFrom as keyof typeof baseLayouts];
        if (base) {
          setLayout(JSON.parse(JSON.stringify(base)));
          setStatusMessage(`Loaded layout template "${startFrom}".`);
        }
      }
    }
  };

  const handleResetKey = () => {
    const base = startFrom !== "empty" ? baseLayouts[startFrom as keyof typeof baseLayouts] : null;
    const baseEntry = base?.[selectedCode];
    setLayout((prev) => {
      const next = { ...prev };
      if (baseEntry) {
        next[selectedCode] = { ...baseEntry };
      } else {
        delete next[selectedCode];
      }
      return next;
    });
    setStatusMessage(`Reset ${selectedCode} from current template.`);
  };

  const handleClearKey = () => {
    setLayout((prev) => {
      const next = { ...prev };
      delete next[selectedCode];
      return next;
    });
    setStatusMessage(`Cleared all mappings for ${selectedCode}.`);
  };

  const handleResetAll = () => {
    if (window.confirm("Reset all keys to the initial value?")) {
      const working = initial
        ? (JSON.parse(JSON.stringify(initial)) as KeyboardLayout)
        : (JSON.parse(JSON.stringify(baseLayouts.inpageMonotype || {})) as KeyboardLayout);
      setLayout(working);
      setStatusMessage("All keys reset to initial.");
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage("");
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          setErrorMessage("Invalid JSON format: Must be an object.");
          return;
        }
        if (typeof parsed.__name === "string") {
          setKeyboardName(parsed.__name);
        }
        const imported: KeyboardLayout = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (k === "__name" || k === "Space") continue;
          if (EDITABLE_CODES.has(k) && typeof v === "object" && v !== null) {
            imported[k] = v as Partial<Record<KeyState, string>>;
          }
        }
        setLayout(imported);
        setStatusMessage(`Successfully imported layout (${Object.keys(imported).length} keys).`);
      } catch (err) {
        setErrorMessage("Error reading layout JSON: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportFile = () => {
    const exportData = {
      __name: keyboardName || "Custom Keyboard",
      ...layout,
    };
    delete (exportData as Record<string, unknown>)["Space"];
    const str = JSON.stringify(exportData, null, 2);
    const blob = new Blob([str], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${keyboardName.trim().replace(/\s+/g, "-").toLowerCase() || "custom-keyboard"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage(`Exported layout as "${a.download}".`);
  };

  // Toggle on-screen modifiers (Shift, AltGr)
  const toggleModifier = (mod: "shift" | "altgr") => {
    if (mod === "shift") {
      setViewState((prev) =>
        prev === "normal" ? "shift" : prev === "shift" ? "normal" : prev === "altgr" ? "shiftAltgr" : "altgr"
      );
    } else {
      setViewState((prev) =>
        prev === "normal" ? "altgr" : prev === "altgr" ? "normal" : prev === "shift" ? "shiftAltgr" : "shift"
      );
    }
  };

  if (!open) return null;

  const currentKeyData = layout[selectedCode] || {};
  const currentPreviewChar = currentKeyData[viewState] || "";

  // Render on-screen keyboard key
  const renderKey = (key: KeyDef) => {
    const isSelected = selectedCode === key.code;
    const isShiftActive = viewState === "shift" || viewState === "shiftAltgr";
    const isAltGrActive = viewState === "altgr" || viewState === "shiftAltgr";
    const isModifierActive =
      (key.label === "Shift" && isShiftActive) || (key.label === "AltGr" && isAltGrActive);

    const keyData = layout[key.code] || {};
    const mainChar = keyData[viewState] || "";
    const shiftHint = keyData.shift || "";
    const isEditable = EDITABLE_CODES.has(key.code);

    const flexWidth = key.width || 1.0;

    const handleClick = () => {
      if (key.label === "Shift") {
        toggleModifier("shift");
        return;
      }
      if (key.label === "AltGr") {
        toggleModifier("altgr");
        return;
      }
      if (isEditable) {
        setSelectedCode(key.code);
        setStatusMessage(`Selected key: ${key.code} (${key.label})`);
      }
    };

    return (
      <button
        key={key.code}
        type="button"
        data-key-code={key.code}
        disabled={key.isDecorative}
        onClick={handleClick}
        style={{
          flex: `${flexWidth} 0 0`,
          minWidth: `${Math.round(flexWidth * 38)}px`,
          height: "54px",
          margin: "2px",
          padding: "2px 4px",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          borderRadius: "4px",
          background: isSelected
            ? "linear-gradient(to bottom, #dbeeff, #b3d7ff)"
            : isModifierActive
            ? "linear-gradient(to bottom, #fff0a8, #ffd86b)"
            : key.isModifier || key.isDecorative
            ? "linear-gradient(to bottom, #e3e6ea, #cfd4da)"
            : "linear-gradient(to bottom, #ffffff, #e9ecef)",
          border: isSelected ? "3px solid #0066cc" : "1px solid #9aa0a6",
          boxShadow: isSelected
            ? "0 0 6px rgba(0, 102, 204, 0.6), inset 0 1px 0 #fff"
            : "0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 #ffffff",
          cursor: key.isDecorative ? "default" : "pointer",
          userSelect: "none",
          outline: "none",
          transition: "border 0.1s, background 0.1s",
        }}
      >
        {/* Top line: Latin label on left, shift character hint on right */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: isSelected ? "#004080" : "#555555",
              fontFamily: UI_FONT,
            }}
          >
            {key.label}
          </span>
          {isEditable && shiftHint && (
            <span
              style={{
                fontSize: "13px",
                color: "#777777",
                fontFamily: URDU_FONT,
                direction: "rtl",
              }}
            >
              {shiftHint}
            </span>
          )}
        </div>

        {/* Center: Large Urdu character for current view state */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "26px",
            fontWeight: "normal",
            fontFamily: URDU_FONT,
            color: "#111111",
            direction: "rtl",
            lineHeight: 1,
            marginTop: "-2px",
            pointerEvents: "none",
          }}
        >
          {mainChar}
        </div>
      </button>
    );
  };

  return (
    <div
      role="dialog"
      dir="ltr"
      aria-label="Custom Keyboard"
      data-custom-keyboard-dialog
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        direction: "ltr",
        pointerEvents: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.45)",
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
          outline: "none",
          position: "absolute",
          left: position ? `${position.x}px` : "auto",
          top: position ? `${position.y}px` : "auto",
          width: "960px",
          maxWidth: "96vw",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "6px",
          backgroundColor: "#f0f2f5",
          border: "1px solid #707070",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.4) inset",
          fontFamily: UI_FONT,
          fontSize: "14px",
          color: "#222222",
          overflow: "hidden",
        }}
      >
        {/* Title Bar */}
        <div
          data-dialog-titlebar
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            height: "36px",
            background: "linear-gradient(to bottom, #1976d2, #0d47a1)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            cursor: "move",
            userSelect: "none",
            borderTopLeftRadius: "5px",
            borderTopRightRadius: "5px",
            fontWeight: 600,
            fontSize: "15px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>⌨</span>
            <span>Custom Keyboard</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: "28px",
              height: "22px",
              lineHeight: "20px",
              borderRadius: "3px",
              border: "1px solid #08336d",
              background: "linear-gradient(to bottom, #e81123, #c4101e)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {/* Help Strip */}
          <div
            style={{
              background: "#e8f0fe",
              border: "1px solid #bad3fc",
              borderRadius: "4px",
              padding: "8px 12px",
              fontSize: "13px",
              lineHeight: 1.4,
              color: "#1a3a60",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>How to make your keyboard:</strong>
              <button
                type="button"
                onClick={toggleHelp}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#0d47a1",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: 0,
                }}
              >
                {helpOpen ? "Hide help" : "Show help"}
              </button>
            </div>
            {helpOpen && (
              <ol style={{ margin: "6px 0 0 18px", padding: 0 }}>
                <li>Choose a starting keyboard in &quot;Start from&quot; and press Load.</li>
                <li>Click a key on the keyboard (or press it on your real keyboard).</li>
                <li>On the right, type the letter you want for Normal, Shift, AltGr and Shift+AltGr, or pick it from CharMap.</li>
                <li>Repeat for other keys, then press OK. Use Export to keep a backup file.</li>
              </ol>
            )}
          </div>

          {/* Main Working Area: Keyboard on Left, Editor Panel on Right */}
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            {/* Left: View State Toggles & Keyboard */}
            <div style={{ flex: "1 1 650px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* State bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#e4e7eb",
                  border: "1px solid #c2c7ce",
                  padding: "6px 10px",
                  borderRadius: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: 600, fontSize: "13px" }}>View State:</span>
                  {(["normal", "shift", "altgr", "shiftAltgr"] as KeyState[]).map((st) => {
                    const isCur = viewState === st;
                    const labels: Record<KeyState, string> = {
                      normal: "Normal",
                      shift: "Shift",
                      altgr: "AltGr",
                      shiftAltgr: "Shift+AltGr",
                    };
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setViewState(st)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "13px",
                          fontWeight: isCur ? "bold" : "normal",
                          borderRadius: "3px",
                          border: isCur ? "1px solid #005299" : "1px solid #abb0b7",
                          background: isCur
                            ? "linear-gradient(to bottom, #1976d2, #125aa3)"
                            : "linear-gradient(to bottom, #ffffff, #e1e4e8)",
                          color: isCur ? "#ffffff" : "#222222",
                          cursor: "pointer",
                        }}
                      >
                        {labels[st]}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCharMapOpen((prev) => !prev)}
                  style={{
                    padding: "4px 12px",
                    fontWeight: 600,
                    borderRadius: "3px",
                    border: "1px solid #7a828a",
                    background: charMapOpen
                      ? "linear-gradient(to bottom, #ffd54f, #ffb300)"
                      : "linear-gradient(to bottom, #ffffff, #e1e4e8)",
                    color: "#111111",
                    cursor: "pointer",
                  }}
                >
                  CharMap...
                </button>
              </div>

              {/* On-screen Keyboard grid */}
              <div
                style={{
                  background: "#33383f",
                  padding: "6px",
                  borderRadius: "6px",
                  border: "1px solid #22262a",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
                }}
              >
                <div style={{ display: "flex", width: "100%", marginBottom: "4px" }}>
                  {FUNCTION_ROW.map(renderKey)}
                </div>
                <div style={{ display: "flex", width: "100%" }}>{ROW_1.map(renderKey)}</div>
                <div style={{ display: "flex", width: "100%" }}>{ROW_2.map(renderKey)}</div>
                <div style={{ display: "flex", width: "100%" }}>{ROW_3.map(renderKey)}</div>
                <div style={{ display: "flex", width: "100%" }}>{ROW_4.map(renderKey)}</div>
                <div style={{ display: "flex", width: "100%" }}>{ROW_5.map(renderKey)}</div>
              </div>

              {/* Status Line */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #c2c7ce",
                  padding: "5px 10px",
                  borderRadius: "3px",
                  fontSize: "13px",
                  color: "#2e5b88",
                  fontWeight: 500,
                  minHeight: "28px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                ℹ {statusMessage}
              </div>
            </div>

            {/* Right: Selected Key Editor Panel */}
            <div
              style={{
                flex: "0 0 280px",
                background: "#ffffff",
                border: "1px solid #c2c7ce",
                borderRadius: "5px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "bold",
                  color: "#0d47a1",
                  borderBottom: "1px solid #e1e4e8",
                  paddingBottom: "4px",
                }}
              >
                Selected Key: {selectedCode}
              </div>

              {/* Live Preview Strip */}
              <div
                style={{
                  background: "#f7f9fa",
                  border: "1px solid #e1e4e8",
                  borderRadius: "4px",
                  padding: "6px 8px",
                }}
              >
                <div style={{ fontSize: "11px", color: "#666", marginBottom: "2px" }}>
                  This key types (N / S / Alt / S+Alt):
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-around",
                    alignItems: "center",
                    fontFamily: URDU_FONT,
                    fontSize: "24px",
                    direction: "ltr",
                    color: "#000",
                    height: "36px",
                  }}
                >
                  <span title="Normal" style={{ minWidth: "20px", textAlign: "center" }}>
                    {currentKeyData.normal || "—"}
                  </span>
                  <span title="Shift" style={{ minWidth: "20px", textAlign: "center", color: "#8a4b00" }}>
                    {currentKeyData.shift || "—"}
                  </span>
                  <span title="AltGr" style={{ minWidth: "20px", textAlign: "center", color: "#006b38" }}>
                    {currentKeyData.altgr || "—"}
                  </span>
                  <span title="Shift+AltGr" style={{ minWidth: "20px", textAlign: "center", color: "#6a0dad" }}>
                    {currentKeyData.shiftAltgr || "—"}
                  </span>
                </div>
              </div>

              {/* 4 State Rows */}
              {(
                [
                  { state: "normal" as KeyState, label: "Normal" },
                  { state: "shift" as KeyState, label: "Shift" },
                  { state: "altgr" as KeyState, label: "AltGr" },
                  { state: "shiftAltgr" as KeyState, label: "Shift + AltGr" },
                ] as const
              ).map(({ state, label }) => {
                const charVal = currentKeyData[state] || "";
                const codePointVal = charVal ? charVal.codePointAt(0) : "";

                return (
                  <div
                    key={state}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      background: viewState === state ? "#eef6ff" : "transparent",
                      padding: "4px",
                      borderRadius: "3px",
                      border: viewState === state ? "1px solid #b3d7ff" : "1px solid transparent",
                    }}
                  >
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#444" }}>
                      {label}
                    </label>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <input
                        type="text"
                        data-state-char={state}
                        value={charVal}
                        maxLength={4}
                        onFocus={() => {
                          setLastFocusedState(state);
                          setViewState(state);
                        }}
                        onChange={(e) => handleCharInput(state, e.target.value)}
                        style={{
                          width: "60px",
                          height: "44px",
                          fontSize: "30px",
                          textAlign: "center",
                          fontFamily: URDU_FONT,
                          direction: "rtl",
                          border: "1px solid #8e959d",
                          borderRadius: "3px",
                          background: "#ffffff",
                        }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <span style={{ fontSize: "10px", color: "#666" }}>Dec Code:</span>
                        <input
                          type="number"
                          data-state-code={state}
                          value={codePointVal ?? ""}
                          placeholder="Dec"
                          onFocus={() => {
                            setLastFocusedState(state);
                            setViewState(state);
                          }}
                          onChange={(e) => handleCodeInput(state, e.target.value)}
                          style={{
                            height: "26px",
                            fontSize: "12px",
                            fontFamily: UI_FONT,
                            border: "1px solid #8e959d",
                            borderRadius: "3px",
                            padding: "0 6px",
                            background: "#ffffff",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={handleResetKey}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    fontSize: "12px",
                    borderRadius: "3px",
                    border: "1px solid #a0a6ad",
                    background: "linear-gradient(to bottom, #ffffff, #e1e4e8)",
                    cursor: "pointer",
                  }}
                >
                  Reset Key
                </button>
                <button
                  type="button"
                  onClick={handleClearKey}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    fontSize: "12px",
                    borderRadius: "3px",
                    border: "1px solid #a0a6ad",
                    background: "linear-gradient(to bottom, #ffffff, #e1e4e8)",
                    cursor: "pointer",
                  }}
                >
                  Clear Key
                </button>
              </div>
            </div>
          </div>

          {/* Optional Floating / Attached CharMap Panel */}
          {charMapOpen && (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #1976d2",
                borderRadius: "5px",
                padding: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #e1e4e8",
                  paddingBottom: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontWeight: 600 }}>Character Map</span>
                  <label style={{ fontSize: "12px" }}>
                    Subset:{" "}
                    <select
                      value={charMapSubsetIndex}
                      onChange={(e) => setCharMapSubsetIndex(parseInt(e.target.value, 10))}
                      style={{ fontSize: "12px", padding: "2px 4px" }}
                    >
                      {CHARMAP_SUBSETS.map((sub, idx) => (
                        <option key={sub.name} value={idx}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {hoveredCharInfo ? (
                    <span style={{ fontSize: "14px", color: "#0d47a1", fontWeight: 600 }}>
                      <span
                        style={{
                          fontSize: "22px",
                          fontFamily: URDU_FONT,
                          marginRight: "6px",
                        }}
                      >
                        {hoveredCharInfo.char}
                      </span>
                      U+{hoveredCharInfo.cp.toString(16).toUpperCase().padStart(4, "0")} (
                      {hoveredCharInfo.cp})
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#888" }}>Hover a character</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setCharMapOpen(false)}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Grid of characters */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(36px, 1fr))",
                  gap: "3px",
                  maxHeight: "150px",
                  overflowY: "auto",
                  padding: "4px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "3px",
                }}
              >
                {charMapList.map((cp) => {
                  const ch = String.fromCodePoint(cp);
                  return (
                    <button
                      key={cp}
                      type="button"
                      onMouseEnter={() => setHoveredCharInfo({ char: ch, cp })}
                      onClick={() => {
                        const targetState = lastFocusedState || viewState;
                        updateKeyMapping(selectedCode, targetState, ch);
                      }}
                      style={{
                        height: "36px",
                        fontSize: "20px",
                        fontFamily: URDU_FONT,
                        background: "#ffffff",
                        border: "1px solid #d1d5db",
                        borderRadius: "3px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Keyboard Name & Template Selectors */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
              background: "#e4e7eb",
              border: "1px solid #c2c7ce",
              borderRadius: "4px",
              padding: "8px 12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Keyboard Name:</label>
              <input
                type="text"
                value={keyboardName}
                onChange={(e) => setKeyboardName(e.target.value)}
                style={{
                  height: "26px",
                  fontSize: "13px",
                  fontFamily: UI_FONT,
                  border: "1px solid #8e959d",
                  borderRadius: "3px",
                  padding: "0 6px",
                  width: "160px",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontWeight: 600, fontSize: "13px" }}>Start from:</label>
              <select
                value={startFrom}
                onChange={(e) => setStartFrom(e.target.value)}
                style={{ height: "26px", fontSize: "13px", padding: "0 4px" }}
              >
                <option value="inpageMonotype">Monotype</option>
                <option value="inpagePhonetic">Phonetic</option>
                <option value="arabic">Arabic (Monotype)</option>
                <option value="persian">Persian (Monotype)</option>
                <option value="empty">Empty</option>
              </select>
              <button
                type="button"
                onClick={handleLoadStartFrom}
                style={{
                  height: "26px",
                  padding: "0 10px",
                  fontSize: "12px",
                  borderRadius: "3px",
                  border: "1px solid #7a828a",
                  background: "linear-gradient(to bottom, #ffffff, #e1e4e8)",
                  cursor: "pointer",
                }}
              >
                Load
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetAll}
              style={{
                height: "26px",
                padding: "0 10px",
                fontSize: "12px",
                borderRadius: "3px",
                border: "1px solid #7a828a",
                background: "linear-gradient(to bottom, #ffffff, #e1e4e8)",
                cursor: "pointer",
                marginLeft: "auto",
              }}
            >
              Reset All
            </button>
          </div>

          {/* Error display if any */}
          {errorMessage && (
            <div style={{ color: "#d32f2f", fontSize: "13px", fontWeight: "bold" }}>
              ⚠ {errorMessage}
            </div>
          )}

          {/* Bottom Actions Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #d1d5db",
              paddingTop: "10px",
              marginTop: "4px",
            }}
          >
            {/* Import / Export */}
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleImportFile}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: "6px 14px",
                  fontSize: "13px",
                  borderRadius: "3px",
                  border: "1px solid #7a828a",
                  background: "linear-gradient(to bottom, #ffffff, #e1e4e8)",
                  cursor: "pointer",
                }}
              >
                Import...
              </button>
              <button
                type="button"
                onClick={handleExportFile}
                style={{
                  padding: "6px 14px",
                  fontSize: "13px",
                  borderRadius: "3px",
                  border: "1px solid #7a828a",
                  background: "linear-gradient(to bottom, #ffffff, #e1e4e8)",
                  cursor: "pointer",
                }}
              >
                Export...
              </button>
            </div>

            {/* Note & OK/Cancel */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "11px", color: "#555" }}>
                Your keyboard is saved in this browser. Use Export to save a copy as a file.
              </span>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleCommit}
                  style={{
                    minWidth: "85px",
                    padding: "6px 16px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    borderRadius: "3px",
                    border: "1px solid #084298",
                    background: "linear-gradient(to bottom, #1976d2, #0d47a1)",
                    color: "#ffffff",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }}
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    minWidth: "80px",
                    padding: "6px 16px",
                    fontSize: "13px",
                    borderRadius: "3px",
                    border: "1px solid #7a828a",
                    background: "linear-gradient(to bottom, #ffffff, #e1e4e8)",
                    color: "#222222",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}