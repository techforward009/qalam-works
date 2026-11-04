// app/tools/document-studio/components/CustomKeyboardDialog.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  KeyboardLayout,
  KeyState,
  parseCustomLayout,
} from "../utils/inpageKeyboard";

interface CustomKeyboardDialogProps {
  open: boolean;
  initial: KeyboardLayout | null;
  baseLayouts: Record<
    "inpageMonotype" | "inpagePhonetic" | "arabic" | "persian",
    KeyboardLayout
  >;
  onSave(l: KeyboardLayout): void;
  onClose(): void;
}

const KEYBOARD_ROWS: string[][] = [
  [
    "Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5",
    "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal"
  ],
  [
    "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY",
    "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight", "Backslash"
  ],
  [
    "KeyA", "KeyS", "KeyD", "KeyF", "KeyG",
    "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"
  ],
  [
    "IntlBackslash", "KeyZ", "KeyX", "KeyC", "KeyV",
    "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"
  ]
];

const CODE_LABELS: Record<string, string> = {
  Backquote: "`", Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4", Digit5: "5",
  Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9", Digit0: "0", Minus: "-", Equal: "=",
  KeyQ: "Q", KeyW: "W", KeyE: "E", KeyR: "R", KeyT: "T", KeyY: "Y", KeyU: "U", KeyI: "I",
  KeyO: "O", KeyP: "P", BracketLeft: "[", BracketRight: "]", Backslash: "\\",
  KeyA: "A", KeyS: "S", KeyD: "D", KeyF: "F", KeyG: "G", KeyH: "H", KeyJ: "J", KeyK: "K",
  KeyL: "L", Semicolon: ";", Quote: "'",
  IntlBackslash: "\\", KeyZ: "Z", KeyX: "X", KeyC: "C", KeyV: "V", KeyB: "B", KeyN: "N",
  KeyM: "M", Comma: ",", Period: ".", Slash: "/"
};

const STATE_OPTIONS: { id: KeyState; label: string }[] = [
  { id: "normal", label: "عام" },
  { id: "shift", label: "شفٹ" },
  { id: "altgr", label: "آلٹ جی آر" },
  { id: "shiftAltgr", label: "شفٹ + آلٹ جی آر" }
];

export function CustomKeyboardDialog({
  open,
  initial,
  baseLayouts,
  onSave,
  onClose,
}: CustomKeyboardDialogProps) {
  const [layout, setLayout] = useState<KeyboardLayout>({});
  const [selectedState, setSelectedState] = useState<KeyState>("normal");
  const [selectedCode, setSelectedCode] = useState<string>("KeyA");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const charInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setLayout(initial ? JSON.parse(JSON.stringify(initial)) : {});
      setSelectedState("normal");
      setSelectedCode("KeyA");
      setErrorMessage(null);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter") {
        if (document.activeElement !== charInputRef.current) {
          e.preventDefault();
          onSave(layout);
        }
      } else if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, layout, onSave, onClose]);

  if (!open) return null;

  const currentKeyChar = layout[selectedCode]?.[selectedState] || "";

  const handleBaseSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as keyof typeof baseLayouts;
    if (val && baseLayouts[val]) {
      setLayout(JSON.parse(JSON.stringify(baseLayouts[val])));
      setErrorMessage(null);
    }
  };

  const handleCharChange = (newChar: string) => {
    const updated = { ...layout };
    if (!updated[selectedCode]) {
      updated[selectedCode] = {};
    } else {
      updated[selectedCode] = { ...updated[selectedCode] };
    }

    if (newChar === "") {
      delete updated[selectedCode][selectedState];
      if (Object.keys(updated[selectedCode]).length === 0) {
        delete updated[selectedCode];
      }
    } else {
      updated[selectedCode][selectedState] = newChar;
    }

    setLayout(updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseCustomLayout(content);
      if (parsed.ok) {
        setLayout(parsed.layout);
        setErrorMessage(null);
      } else {
        setErrorMessage(parsed.error);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(layout, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qalam-keyboard.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        ref={dialogRef}
        dir="rtl"
        style={{
          width: "560px",
          backgroundColor: "#f0f0f0",
          border: "1px solid #a0a0a0",
          boxShadow: "2px 2px 10px rgba(0,0,0,0.3)",
          fontFamily: "Tahoma, Arial, sans-serif",
          fontSize: "12px",
          color: "#000000",
          display: "flex",
          flexDirection: "column",
          userSelect: "none",
        }}
      >
        <div
          style={{
            backgroundColor: "#0055ea",
            color: "#ffffff",
            padding: "4px 8px",
            fontWeight: "bold",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>اپنا کی بورڈ</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "#ffffff",
              fontSize: "14px",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label htmlFor="base-layout-select">شروع کریں:</label>
            <select
              id="base-layout-select"
              defaultValue=""
              onChange={handleBaseSelect}
              style={{ fontSize: "12px", fontFamily: "Tahoma", padding: "1px 4px" }}
            >
              <option value="" disabled>
                -- بنیادی لے آؤٹ منتخب کریں --
              </option>
              <option value="inpagePhonetic">ان پیج فونیٹک</option>
              <option value="inpageMonotype">ان پیج مونوٹائپ</option>
              <option value="arabic">عربی</option>
              <option value="persian">فارسی</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            {STATE_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", cursor: "pointer" }}
              >
                <input
                  type="radio"
                  name="keyState"
                  checked={selectedState === opt.id}
                  onChange={() => setSelectedState(opt.id)}
                />
                {opt.label}
              </label>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              backgroundColor: "#dcdcdc",
              padding: "6px",
              border: "1px solid #bfbfbf",
            }}
          >
            {KEYBOARD_ROWS.map((row, rIdx) => (
              <div
                key={rIdx}
                style={{
                  display: "flex",
                  gap: "3px",
                  justifyContent: rIdx === 2 ? "flex-start" : "flex-start",
                  marginRight: rIdx === 1 ? "12px" : rIdx === 2 ? "18px" : rIdx === 3 ? "24px" : "0",
                }}
              >
                {row.map((code) => {
                  const keyData = layout[code];
                  const normChar = keyData?.normal || "";
                  const shiftChar = keyData?.shift || "";
                  const isSelected = selectedCode === code;

                  return (
                    <div
                      key={code}
                      onClick={() => setSelectedCode(code)}
                      style={{
                        width: "34px",
                        height: "34px",
                        backgroundColor: isSelected ? "#cce8ff" : "#ffffff",
                        border: isSelected ? "1px solid #0055ea" : "1px solid #8e8e8e",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                        cursor: "pointer",
                        boxSizing: "border-box",
                        padding: "1px",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: "2px",
                          top: "1px",
                          fontSize: "8px",
                          color: "#777777",
                          fontFamily: "sans-serif",
                        }}
                      >
                        {CODE_LABELS[code] || ""}
                      </span>

                      <span
                        style={{
                          position: "absolute",
                          right: "2px",
                          top: "1px",
                          fontSize: "9px",
                          color: "#555555",
                        }}
                      >
                        {shiftChar}
                      </span>

                      <span
                        style={{
                          marginTop: "auto",
                          textAlign: "center",
                          fontSize: "14px",
                          fontWeight: "bold",
                          lineHeight: "18px",
                        }}
                      >
                        {normChar}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>منتخب بٹن ({CODE_LABELS[selectedCode] || selectedCode}):</span>
            <label htmlFor="char-input">حرف:</label>
            <input
              id="char-input"
              ref={charInputRef}
              type="text"
              maxLength={8}
              value={currentKeyChar}
              onChange={(e) => handleCharChange(e.target.value)}
              style={{
                width: "80px",
                fontSize: "14px",
                fontFamily: "Tahoma",
                textAlign: "center",
                padding: "2px",
              }}
            />
          </div>

          {errorMessage && (
            <div style={{ color: "red", fontSize: "11px" }}>{errorMessage}</div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "8px",
            }}
          >
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  height: "23px",
                  fontSize: "12px",
                  fontFamily: "Tahoma",
                  padding: "0 8px",
                  cursor: "pointer",
                }}
              >
                فائل سے لائیں…
              </button>
              <button
                type="button"
                onClick={handleExport}
                style={{
                  height: "23px",
                  fontSize: "12px",
                  fontFamily: "Tahoma",
                  padding: "0 8px",
                  cursor: "pointer",
                }}
              >
                فائل میں محفوظ کریں…
              </button>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => onSave(layout)}
                style={{
                  width: "75px",
                  height: "23px",
                  fontSize: "12px",
                  fontFamily: "Tahoma",
                  cursor: "pointer",
                }}
              >
                ٹھیک ہے
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: "75px",
                  height: "23px",
                  fontSize: "12px",
                  fontFamily: "Tahoma",
                  cursor: "pointer",
                }}
              >
                منسوخ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}