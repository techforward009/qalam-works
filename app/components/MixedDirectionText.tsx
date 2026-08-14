"use client";

import {
  analyzeMixedDirectionText,
  type TextDirection,
} from "../utils/bidi/segmentDirection";

interface MixedDirectionTextProps {
  text: string;
  /** Document-level fallback when a line has no strong script. */
  fallbackDir?: TextDirection;
  className?: string;
  /** Optional max height / scroll handled by parent. */
}

/**
 * Renders plain text with per-line and per-segment BiDi isolation.
 * Does not alter characters — display only.
 */
export default function MixedDirectionText({
  text,
  fallbackDir = "rtl",
  className = "",
}: MixedDirectionTextProps) {
  const lines = analyzeMixedDirectionText(text, fallbackDir);

  return (
    <div className={className} dir={fallbackDir}>
      {lines.map((line, i) => (
        <div
          key={i}
          dir={line.dir}
          className="unicode-bidi-isolate"
          style={{
            unicodeBidi: "isolate",
            textAlign: line.dir === "rtl" ? "right" : "left",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {line.segments.map((seg, j) => (
            <span
              key={j}
              dir={seg.dir}
              style={{ unicodeBidi: "isolate" }}
            >
              {seg.text}
            </span>
          ))}
          {i < lines.length - 1 ? null : null}
        </div>
      ))}
    </div>
  );
}
