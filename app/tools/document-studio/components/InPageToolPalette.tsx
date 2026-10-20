"use client";

import type { ReactNode } from "react";
import { INPAGE_TOOLBOX_PX } from "../utils/windowRuler";

export type StudioToolId =
  | "select"
  | "text"
  | "rotate"
  | "link"
  | "unlink"
  | "image"
  | "image-frame"
  | "cross-square"
  | "cross-circle"
  | "cross-round"
  | "rect"
  | "ellipse"
  | "round-rect"
  | "line"
  | "polygon"
  | "zoom"
  | "hand";

type ToolSpec = {
  id: StudioToolId;
  label: string;
  enabled: boolean;
  icon: ReactNode;
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.35">
      {children}
    </svg>
  );
}

const TOOLS: ToolSpec[] = [
  {
    id: "select",
    label: "Select",
    enabled: true,
    icon: (
      <Icon>
        <path d="M3 2 L3 13 L6.2 10.2 L8.4 14 L10.2 13.2 L8 9.4 L12 9.2 Z" fill="currentColor" stroke="none" />
      </Icon>
    ),
  },
  {
    id: "text",
    label: "Text",
    enabled: true,
    icon: (
      <Icon>
        <path d="M8.2 2.2 V7.2 M6.6 2.2 H9.8 M6.8 7.2 H9.6" strokeWidth="1.4" />
        <path d="M6.2 8.4 C4.6 8.6 4 10 4.2 11.4 V13.2 H11.4 V10.4 C11.4 9.2 10.6 8.6 10 8.6" />
        <path d="M6.2 8.6 V6.4 M10 8.6 V7" />
      </Icon>
    ),
  },
  {
    id: "rotate",
    label: "Rotate",
    enabled: false,
    icon: (
      <Icon>
        <path d="M8 3 A5 5 0 1 1 4 6" />
        <path d="M8 1.5 V4.5 H5" />
      </Icon>
    ),
  },
  {
    id: "link",
    label: "Link text",
    enabled: false,
    icon: (
      <Icon>
        <path d="M2.2 8 C2.2 5.6 4 4.2 6.2 4.2 C7.6 4.2 8.6 5 9.2 6.2 C9.8 5 10.8 4.2 12.2 4.2 C14.4 4.2 15.8 5.6 15.8 8 C15.8 10.4 14.4 11.8 12.2 11.8 C10.8 11.8 9.8 11 9.2 9.8 C8.6 11 7.6 11.8 6.2 11.8 C4 11.8 2.2 10.4 2.2 8 Z" strokeWidth="1.6" />
      </Icon>
    ),
  },
  {
    id: "unlink",
    label: "Unlink text",
    enabled: false,
    icon: (
      <Icon>
        <path d="M2 6.2 H5.2 A1.8 1.8 0 1 1 5.2 9.8 H2" />
        <path d="M14 6.2 H10.8 A1.8 1.8 0 1 0 10.8 9.8 H14" />
        <path d="M7.2 8 H8.8" strokeDasharray="0.8 0.8" />
      </Icon>
    ),
  },
  {
    id: "image",
    label: "Picture",
    enabled: true,
    icon: (
      <Icon>
        <rect x="2.2" y="2.2" width="11.6" height="11.6" />
        <text x="8" y="11.2" textAnchor="middle" fontSize="8" stroke="none" fill="currentColor" fontFamily="Tahoma, sans-serif">ع</text>
      </Icon>
    ),
  },
  {
    id: "image-frame",
    label: "Picture box",
    enabled: false,
    icon: (
      <Icon>
        <rect x="2.2" y="2.2" width="11.6" height="11.6" strokeDasharray="1.2 1.1" />
        <text x="8" y="11.2" textAnchor="middle" fontSize="8" stroke="none" fill="currentColor" fontFamily="Tahoma, sans-serif">ع</text>
      </Icon>
    ),
  },
  {
    id: "cross-square",
    label: "Crossed square",
    enabled: false,
    icon: (
      <Icon>
        <rect x="3" y="3" width="10" height="10" />
        <path d="M4 4 L12 12 M12 4 L4 12" />
      </Icon>
    ),
  },
  {
    id: "cross-circle",
    label: "Crossed circle",
    enabled: false,
    icon: (
      <Icon>
        <circle cx="8" cy="8" r="5" />
        <path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" />
      </Icon>
    ),
  },
  {
    id: "cross-round",
    label: "Crossed rounded square",
    enabled: false,
    icon: (
      <Icon>
        <rect x="3" y="3" width="10" height="10" rx="2.5" />
        <path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" />
      </Icon>
    ),
  },
  {
    id: "rect",
    label: "Rectangle",
    enabled: true,
    icon: (
      <Icon>
        <rect x="3" y="3.5" width="10" height="9" />
      </Icon>
    ),
  },
  {
    id: "ellipse",
    label: "Ellipse",
    enabled: true,
    icon: (
      <Icon>
        <ellipse cx="8" cy="8" rx="5" ry="4.2" />
      </Icon>
    ),
  },
  {
    id: "round-rect",
    label: "Rounded rectangle",
    enabled: true,
    icon: (
      <Icon>
        <rect x="3" y="3.5" width="10" height="9" rx="2.4" />
      </Icon>
    ),
  },
  {
    id: "line",
    label: "Line",
    enabled: true,
    icon: (
      <Icon>
        <path d="M3 13 L13 3" />
      </Icon>
    ),
  },
  {
    id: "polygon",
    label: "Polygon",
    enabled: false,
    icon: (
      <Icon>
        <path d="M4 2.2 H12 L8.2 8 L12 13.8 H4 L7.8 8 Z" />
        <path d="M6.2 8 H9.8" />
      </Icon>
    ),
  },
];

export function InPageToolPalette({
  tool,
  onTool,
}: {
  tool: StudioToolId;
  onTool: (id: StudioToolId) => void;
}) {
  return (
    <div
      className="studio-no-print flex h-full shrink-0 flex-col items-center overflow-y-auto"
      style={{
        width: INPAGE_TOOLBOX_PX,
        background: "#f0f0f0",
        borderRight: "1px solid #696969",
        boxShadow: "inset -1px 0 0 #ffffff",
      }}
      data-studio-tool-palette="true"
      data-studio-tool={tool}
      role="toolbar"
      aria-label="Tools"
    >
      {TOOLS.map((item, index) => {
        const active = item.enabled && tool === item.id;
        const gapAfter = index === 4 || index === 6 || index === 9 || index === 12;
        return (
          <button
            key={item.id}
            type="button"
            title={item.enabled ? item.label : `${item.label} (not available yet)`}
            aria-label={item.label}
            aria-pressed={active}
            disabled={!item.enabled}
            data-studio-tool-button={item.id}
            data-studio-tool-enabled={item.enabled ? "true" : "false"}
            onClick={() => onTool(item.id)}
            className="grid shrink-0 place-items-center p-0"
            style={{
              width: 27,
              height: 22,
              marginLeft: 2,
              marginBottom: gapAfter ? 2 : 0,
              color: item.enabled ? "#111" : "#555",
              opacity: item.enabled ? 1 : 0.75,
              background: active ? "#d6d6d6" : "#f0f0f0",
              border: "none",
              boxShadow: active
                ? "inset 1px 1px 0 #646464, inset 2px 2px 0 #a0a0a0, inset -1px -1px 0 #fff"
                : "inset 1px 1px 0 #fff, inset -1px -1px 0 #646464, inset -2px -2px 0 #a0a0a0",
            }}
          >
            <span style={{ lineHeight: 0 }}>{item.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
