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

// Button-sized artwork keeps the 13px outline box on integer device pixels.
function OutlineIcon({ children }: { children: ReactNode }) {
  return <svg width="27" height="22" viewBox="0 0 27 22" aria-hidden="true" fill="none" stroke="#000" strokeWidth="1" strokeLinecap="butt" strokeLinejoin="miter" shapeRendering="crispEdges">{children}</svg>;
}

const URDU_TOOL_LABELS: Partial<Record<StudioToolId, string>> = {
  select: "انتخاب", text: "متن", image: "تصویر", rect: "مستطیل",
  ellipse: "بیضوی", "round-rect": "گول کونوں والا مستطیل", line: "لکیر",
};

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
      <OutlineIcon>
        <path d="M3.5 4.5H9.5M6.5 4.5V18.5M3.5 18.5H9.5" />
        <path d="M14.5 11.5V3.5H16.5V8.5H18.5V7.5H20.5V9.5H22.5V15.5L19.5 19.5H13.5L10.5 15.5L9.5 12.5L11.5 11.5L14.5 14.5" />
        <path d="M17.5 11.5V14.5M20.5 11.5V14.5" />
      </OutlineIcon>
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
      <OutlineIcon>
        <path d="M10.5 6.5H7.5L4.5 9.5V12.5L7.5 15.5H10.5M16.5 6.5H19.5L22.5 9.5V12.5L19.5 15.5H16.5" />
        <path d="M9.5 9.5H7.5V12.5H9.5M17.5 9.5H19.5V12.5H17.5" />
        <path d="M13.5 2.5V5.5M10.5 3.5L11.5 5.5M16.5 3.5L15.5 5.5M12.5 9.5L14.5 11.5L12.5 13.5M11.5 16.5L10.5 18.5M13.5 16.5V19.5M15.5 16.5L16.5 18.5" />
      </OutlineIcon>
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
    icon: (<OutlineIcon><rect x="7.5" y="6.5" width="12" height="12" /><path d="M8.5 7.5L18.5 17.5M18.5 7.5L8.5 17.5" /></OutlineIcon>),
  },
  {
    id: "cross-circle",
    label: "Crossed circle",
    enabled: false,
    icon: (<OutlineIcon><circle cx="13.5" cy="12.5" r="6" /><path d="M9.5 8.5L17.5 16.5M17.5 8.5L9.5 16.5" /></OutlineIcon>),
  },
  {
    id: "cross-round",
    label: "Crossed rounded square",
    enabled: false,
    icon: (<OutlineIcon><rect x="7.5" y="6.5" width="12" height="12" rx="3" /><path d="M9.5 8.5L17.5 16.5M17.5 8.5L9.5 16.5" /></OutlineIcon>),
  },
  {
    id: "rect",
    label: "Rectangle",
    enabled: true,
    icon: (<OutlineIcon><rect x="7.5" y="6.5" width="12" height="12" /></OutlineIcon>),
  },
  {
    id: "ellipse",
    label: "Ellipse",
    enabled: true,
    icon: (<OutlineIcon><ellipse cx="13.5" cy="12.5" rx="6" ry="6" /></OutlineIcon>),
  },
  {
    id: "round-rect",
    label: "Rounded rectangle",
    enabled: true,
    icon: (<OutlineIcon><rect x="7.5" y="6.5" width="12" height="12" rx="3" /></OutlineIcon>),
  },
  {
    id: "line",
    label: "Line",
    enabled: true,
    icon: (<OutlineIcon><path d="M7 6L20 19" /></OutlineIcon>),
  },
  {
    id: "polygon",
    label: "Polygon",
    enabled: false,
    icon: (<OutlineIcon><path d="M7.5 6.5H19.5M7.5 6.5L19.5 18.5M19.5 6.5L7.5 18.5M7.5 18.5H19.5" /></OutlineIcon>),
  },
];

export function InPageToolPalette({
  tool,
  onTool,
  isUr = false,
}: {
  tool: StudioToolId;
  isUr?: boolean;
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
      aria-label={isUr ? "اوزار" : "Tools"}
    >
      <style>{`
        [data-studio-tool-enabled="false"] svg[stroke],
        [data-studio-tool-enabled="false"] svg [stroke] { stroke: #808080; }
        [data-studio-tool-enabled="false"] svg [fill]:not([fill="none"]) { fill: #808080; }
      `}</style>
      {TOOLS.map((item, index) => {
        const label = isUr ? URDU_TOOL_LABELS[item.id] ?? item.label : item.label;
        const active = item.enabled && tool === item.id;
        const gapAfter = index === 4 || index === 6 || index === 9 || index === 12;
        return (
          <button
            key={item.id}
            type="button"
            title={item.enabled ? label : (isUr ? "جلد آ رہا ہے" : "Coming soon")}
            aria-label={label}
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
              color: item.enabled ? "#000" : "#808080",
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
