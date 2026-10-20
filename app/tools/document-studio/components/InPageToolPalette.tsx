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
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" shapeRendering="crispEdges">
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
        <path d="M3 14L2 9L3 8L5 10V5H7V8H9V6H11V8H13V12L11 15H5Z" fill="#fff" strokeWidth="1.5" />
        <path d="M9 1H15M12 1V6M9 6H15" strokeWidth="2" />
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
      <Icon><path d="M8 8C6 3 1 3 1 8S6 13 8 8S15 3 15 8S10 13 8 8" strokeWidth="2.5" /></Icon>
    ),
  },
  {
    id: "unlink",
    label: "Unlink text",
    enabled: false,
    icon: (
      <Icon>
        <path d="M6 5H4C0 5 0 11 4 11H6M10 5H12C16 5 16 11 12 11H10" strokeWidth="2" />
        <path d="M7 1V4M10 1L9 4M7 12V15M9 12L10 15M5 2L6 4M10 12L12 14" strokeWidth="1.5" />
      </Icon>
    ),
  },
  {
    id: "image",
    label: "Picture",
    enabled: true,
    icon: (
      <Icon>
        <rect x="1.5" y="1.5" width="13" height="13" />
        <text x="8" y="12" textAnchor="middle" fontSize="12" fontWeight="700" stroke="none" fill="#0000a0" fontFamily="Tahoma, Arial, sans-serif">ع</text>
      </Icon>
    ),
  },
  {
    id: "image-frame",
    label: "Picture box",
    enabled: false,
    icon: (
      <Icon>
        <rect x="1.5" y="1.5" width="13" height="13" strokeWidth="1" strokeDasharray="1 1" />
        <text x="8" y="12" textAnchor="middle" fontSize="12" fontWeight="700" stroke="none" fill="#0000a0" fontFamily="Tahoma, Arial, sans-serif">ع</text>
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
      <Icon><path d="M2 2H14M3 3L13 13M13 3L3 13M2 14H14" strokeWidth="2" /></Icon>
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
        alignItems: "flex-start",
        paddingTop: 3,
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
              color: "#000",
              opacity: 1,
              background: "#f0f0f0",
              outline: active ? "1px solid #000" : undefined,
              outlineOffset: -1,
              border: "none",
              boxShadow: active
                ? "inset 0 0 0 1px #000, inset 2px 2px 0 #fff, inset -2px -2px 0 #646464, inset -3px -3px 0 #a0a0a0"
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
