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
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="#111" strokeWidth="1.2">
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
        <path d="M3 2 L3 13 L6.2 10.2 L8.4 14 L10.2 13.2 L8 9.4 L12 9.2 Z" fill="#111" stroke="none" />
      </Icon>
    ),
  },
  {
    id: "text",
    label: "Text",
    enabled: true,
    icon: (
      <Icon>
        <path d="M4 3 H12 M8 3 V13 M5.5 13 H10.5" strokeWidth="1.3" />
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
        <path d="M4 8c0-2 1.2-3.2 3-3.2 1.2 0 2 .5 2.6 1.4" />
        <path d="M12 8c0 2-1.2 3.2-3 3.2-1.2 0-2-.5-2.6-1.4" />
      </Icon>
    ),
  },
  {
    id: "unlink",
    label: "Unlink text",
    enabled: false,
    icon: (
      <Icon>
        <path d="M4 8c0-2 1.2-3.2 3-3.2" />
        <path d="M12 8c0 2-1.2 3.2-3 3.2" />
        <path d="M6 6 L10 10 M10 6 L6 10" />
      </Icon>
    ),
  },
  {
    id: "image",
    label: "Picture",
    enabled: true,
    icon: (
      <Icon>
        <rect x="2.5" y="3" width="11" height="10" />
        <path d="M3 11 L6.5 7.5 L9 10 L11 8 L13 11" />
      </Icon>
    ),
  },
  {
    id: "image-frame",
    label: "Picture box",
    enabled: false,
    icon: (
      <Icon>
        <rect x="2.5" y="3" width="11" height="10" strokeDasharray="1.4 1.2" />
        <path d="M5 8 H11 M8 5 V11" />
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
        <path d="M3 4 L13 12 M13 4 L3 12" />
      </Icon>
    ),
  },
  {
    id: "zoom",
    label: "Zoom",
    enabled: true,
    icon: (
      <Icon>
        <circle cx="7" cy="7" r="3.4" />
        <path d="M9.6 9.6 L13 13" />
      </Icon>
    ),
  },
  {
    id: "hand",
    label: "Hand",
    enabled: true,
    icon: (
      <Icon>
        <path d="M6 8 V4.5 M8.2 8 V3.6 M10.4 8.2 V5 M6 8 C5 8 4 9 4 11.2 V12.2 H11.5 V9.2 C11.5 8.2 10.8 7.6 10.4 7.6" />
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
      {TOOLS.map((item) => {
        const active = item.enabled && tool === item.id;
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
            className="grid shrink-0 place-items-center p-0 disabled:opacity-100"
            style={{
              width: 24,
              height: 22,
              marginTop: 1,
              background: active ? "#d4d0c8" : "#f0f0f0",
              borderStyle: "solid",
              borderWidth: 1,
              borderColor: active ? "#808080 #ffffff #ffffff #808080" : "#ffffff #808080 #808080 #ffffff",
              boxShadow: active ? "inset 1px 1px 0 #808080" : "none",
            }}
          >
            <span style={{ opacity: item.enabled ? 1 : 0.45, lineHeight: 0 }}>{item.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
