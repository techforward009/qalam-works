// app/tools/document-studio/components/KeyboardSwitcher.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  KeyboardLayoutId,
  KEYBOARD_LAYOUT_LABELS,
} from "../utils/inpageKeyboard";

interface KeyboardSwitcherProps {
  layoutId: KeyboardLayoutId;
  onChange(id: KeyboardLayoutId): void;
  hasCustom: boolean;
  onOpenCustom(): void;
}

const ORDERED_LAYOUT_IDS: KeyboardLayoutId[] = [
  "off",
  "inpagePhonetic",
  "inpageMonotype",
  "arabic",
  "persian",
  "custom",
];

export function KeyboardSwitcher({
  layoutId,
  onChange,
  hasCustom,
  onOpenCustom,
}: KeyboardSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleDocumentMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % 7);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev <= 0 ? 6 : prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < 6) {
          const targetId = ORDERED_LAYOUT_IDS[focusedIndex];
          if (targetId === "custom" && !hasCustom) return;
          onChange(targetId);
          setIsOpen(false);
        } else if (focusedIndex === 6) {
          onOpenCustom();
          setIsOpen(false);
        }
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleDocumentMouseDown);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, focusedIndex, hasCustom, onChange, onOpenCustom]);

  const toggleOpen = () => {
    setIsOpen((prev) => {
      if (!prev) {
        const idx = ORDERED_LAYOUT_IDS.indexOf(layoutId);
        setFocusedIndex(idx >= 0 ? idx : 0);
      }
      return !prev;
    });
  };

  return (
    <div
      ref={containerRef}
      dir="rtl"
      style={{
        position: "relative",
        display: "inline-block",
        fontFamily: "Tahoma, Arial, sans-serif",
      }}
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        style={{
          height: "20px",
          fontSize: "12px",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "0 6px",
          background: "#f0f0f0",
          border: "1px solid #ababab",
          borderRadius: "2px",
          cursor: "pointer",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        <span>⌨</span>
        <span>{KEYBOARD_LAYOUT_LABELS[layoutId]}</span>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "absolute",
            bottom: "100%",
            right: 0,
            marginBottom: "2px",
            background: "#ffffff",
            border: "1px solid #7a7a7a",
            boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
            zIndex: 1000,
            minWidth: "150px",
            padding: "2px 0",
            fontSize: "12px",
            userSelect: "none",
          }}
        >
          {ORDERED_LAYOUT_IDS.map((id, index) => {
            const isDisabled = id === "custom" && !hasCustom;
            const isSelected = layoutId === id;
            const isFocused = focusedIndex === index;

            return (
              <div
                key={id}
                role="menuitemradio"
                aria-checked={isSelected}
                aria-disabled={isDisabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (isDisabled) return;
                  onChange(id);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setFocusedIndex(index)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "3px 8px",
                  cursor: isDisabled ? "default" : "pointer",
                  color: isDisabled ? "#888888" : "#000000",
                  backgroundColor: isFocused
                    ? isDisabled
                      ? "#eeeeee"
                      : "#0078d7"
                    : "transparent",
                  ...(isFocused && !isDisabled ? { color: "#ffffff" } : {}),
                }}
              >
                <span>{KEYBOARD_LAYOUT_LABELS[id]}</span>
                <span style={{ width: "14px", textAlign: "left" }}>
                  {isSelected ? "✓" : ""}
                </span>
              </div>
            );
          })}

          <div
            style={{
              height: "1px",
              background: "#d4d4d4",
              margin: "3px 0",
            }}
          />

          <div
            role="menuitem"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onOpenCustom();
              setIsOpen(false);
            }}
            onMouseEnter={() => setFocusedIndex(6)}
            style={{
              padding: "3px 8px",
              cursor: "pointer",
              color: focusedIndex === 6 ? "#ffffff" : "#000000",
              backgroundColor: focusedIndex === 6 ? "#0078d7" : "transparent",
            }}
          >
            اپنا کی بورڈ بنائیں…
          </div>
        </div>
      )}
    </div>
  );
}