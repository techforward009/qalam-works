"use client";

import type { ReactNode } from "react";
import { INPAGE_TOOLBOX_PX } from "../utils/windowRuler";

export type StudioToolId =
  | "select"
  | "text"
  | "rotate"
  | "link"
  | "unlink"
  | "textbox"
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

function OutlineIcon({ children }: { children: ReactNode }) {
  return <svg width="27" height="22" viewBox="0 0 27 22" aria-hidden="true" fill="none" stroke="#000" strokeWidth="1" strokeLinecap="butt" strokeLinejoin="miter" shapeRendering="crispEdges">{children}</svg>;
}

const PIXEL_ICONS = {
  select: [
    "...........................",
    "........ooo................",
    "........o#oo...............",
    "........o##oo..............",
    "........o###oo.............",
    "........o####oo............",
    "........o#####oo...........",
    "........o######oo..........",
    "........o#######oo.........",
    "........o########oo........",
    "........o#########oo.......",
    "........o##########o.......",
    "........o######ooooo.......",
    "........o###o###o..........",
    "........o##oo###oo.........",
    "........o#oooo###o.........",
    "........ooo..o###oo........",
    ".............oo###o........",
    "..............o###o........",
    "..............ooooo........",
    "...........................",
    "...........................",
  ],
  text: [
    "...........................",
    "...........................",
    "...........................",
    "...........................",
    "....#...#......##..........",
    "....##.##..##.#..###.......",
    ".....###..#..##..#..#......",
    "......#...#..##..#..###....",
    "......#....#.##..#..#..#...",
    "......#.##.#.##..#..#..#...",
    "......#.#.#.........#..#...",
    "......#.#..##..........#...",
    "......#..#.............#...",
    "......#..##............#...",
    "......#..##...........#....",
    "......#...##..........#....",
    ".....###...#.........#.....",
    "....##.##..##.......##.....",
    "....#...#...##......#......",
    ".............#......#......",
    "...........................",
    "...........................",
  ],
  rotate: [
    "...........................",
    "...........................",
    "...........................",
    "............#..............",
    "...........##..............",
    "..........#####............",
    "..........###.###..........",
    "...........##...##.........",
    ".................##........",
    ".................##........",
    "..................##.......",
    "..................##.......",
    "......#...........##.......",
    "......##..........##.......",
    ".......#.........##........",
    ".......##.......###........",
    "........##......##.........",
    ".........########..........",
    "...........####............",
    "...........................",
    "...........................",
    "...........................",
  ],
  link: [
    "...........................",
    "...........................",
    "...........................",
    "...........................",
    "...........................",
    "...........................",
    "...........................",
    "...........................",
    ".......####....####........",
    "......######..######.......",
    ".....###..######..###......",
    ".....##....####....##......",
    ".....###..######..###......",
    "......######..######.......",
    ".......####....####........",
    "...........................",
    "...........................",
    "...........................",
    "...........................",
    "...........................",
    "...........................",
    "...........................",
  ],
  unlink: [
    "...........................",
    "...........................",
    "...........................",
    "...........................",
    ".......##.........##.......",
    "........##.......##........",
    ".........##.....##.........",
    "...........................",
    ".......####.....####.......",
    "......######...######......",
    ".....###..###.###..###.....",
    ".....##....##.##....##.....",
    ".....###..###.###..###.....",
    "......######...######......",
    ".......####.....####.......",
    "...........................",
    ".........##.....##.........",
    "........##.......##........",
    ".......##.........##.......",
    "...........................",
    "...........................",
    "...........................",
  ],
} as const;

function PixelIcon({ name }: { name: keyof typeof PIXEL_ICONS }) {
  return (
    <svg width="27" height="22" viewBox="0 0 27 22" aria-hidden="true" shapeRendering="crispEdges">
      {PIXEL_ICONS[name].flatMap((row, y) => [...row].map((pixel, x) =>
        pixel === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" style={{ fill: pixel === "#" ? "#000" : "#fff" }} />,
      ))}
    </svg>
  );
}

const URDU_TOOL_LABELS: Partial<Record<StudioToolId, string>> = {
  select: "انتخاب", text: "متن", textbox: "متن کا خانہ", rect: "مستطیل",
  ellipse: "بیضوی", "round-rect": "گول کونوں والا مستطیل", line: "لکیر",
};

const TOOLS: ToolSpec[] = [
  { id: "select", label: "Select", enabled: true, icon: (
    <PixelIcon name="select" />
  ) },
  { id: "text", label: "Text", enabled: true, icon: (
    <PixelIcon name="text" />
  ) },
  { id: "rotate", label: "Rotate", enabled: false, icon: (
    <PixelIcon name="rotate" />
  ) },
  { id: "link", label: "Link text", enabled: false, icon: (
    <PixelIcon name="link" />
  ) },
  { id: "unlink", label: "Unlink text", enabled: false, icon: (
    <PixelIcon name="unlink" />
  ) },
  { id: "textbox", label: "Textbox Tool", enabled: true, icon: (
    <OutlineIcon><rect x="7.5" y="4.5" width="12" height="13" /><path d="M14.5 7.5C12.5 6.5 10.5 8.5 12.5 9.5L14.5 10.5C11.5 10.5 10.5 12.5 11.5 14.5C12.5 16.5 15.5 15.5 16.5 14.5" /></OutlineIcon>
  ) },
  { id: "image-frame", label: "Picture box", enabled: false, icon: (
    <OutlineIcon><path d="M7.5 10.5V4.5H19.5V10.5" /><path d="M7.5 11.5V12.5M7.5 13.5V14.5M7.5 16.5V17.5M19.5 11.5V12.5M19.5 13.5V14.5M19.5 16.5V17.5M8.5 17.5H9.5M10.5 17.5H11.5M13.5 17.5H14.5M15.5 17.5H16.5M18.5 17.5H19.5" /><path d="M14.5 7.5C12.5 6.5 10.5 8.5 12.5 9.5L14.5 10.5C11.5 10.5 10.5 12.5 11.5 14.5C12.5 16.5 15.5 15.5 16.5 14.5" /></OutlineIcon>
  ) },
  { id: "cross-square", label: "Crossed square", enabled: false, icon: (
    <OutlineIcon><rect x="7.5" y="4.5" width="12" height="12" /><path d="M8.5 5.5L18.5 15.5M18.5 5.5L8.5 15.5" /></OutlineIcon>
  ) },
  { id: "cross-circle", label: "Crossed circle", enabled: false, icon: (
    <OutlineIcon><path d="M11.5 4.5H15.5L19.5 8.5V12.5L15.5 16.5H11.5L7.5 12.5V8.5ZM9.5 6.5L17.5 14.5M17.5 6.5L9.5 14.5" /></OutlineIcon>
  ) },
  { id: "cross-round", label: "Crossed rounded square", enabled: false, icon: (
    <OutlineIcon><path d="M9.5 4.5H17.5L19.5 6.5V14.5L17.5 16.5H9.5L7.5 14.5V6.5ZM9.5 6.5L17.5 14.5M17.5 6.5L9.5 14.5" /></OutlineIcon>
  ) },
  { id: "rect", label: "Rectangle", enabled: true, icon: (
    <OutlineIcon><rect x="7.5" y="4.5" width="12" height="12" /></OutlineIcon>
  ) },
  { id: "ellipse", label: "Ellipse", enabled: true, icon: (
    <OutlineIcon><path d="M11.5 4.5H15.5L19.5 8.5V12.5L15.5 16.5H11.5L7.5 12.5V8.5Z" /></OutlineIcon>
  ) },
  { id: "round-rect", label: "Rounded rectangle", enabled: true, icon: (
    <OutlineIcon><path d="M9.5 4.5H17.5L19.5 6.5V14.5L17.5 16.5H9.5L7.5 14.5V6.5Z" /></OutlineIcon>
  ) },
  { id: "line", label: "Line", enabled: true, icon: (
    <OutlineIcon><path d="M7.5 4.5L19.5 16.5" /></OutlineIcon>
  ) },
  { id: "polygon", label: "Polygon", enabled: false, icon: (
    <OutlineIcon><path d="M7.5 4.5H19.5L7.5 16.5H19.5Z" /></OutlineIcon>
  ) },
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
              color: "#000",
              opacity: 1,
              background: "#f0f0f0",
              outline: active ? "1px solid #000" : undefined,
              outlineOffset: -1,
              border: "none",
              boxShadow: active
                ? "inset 1px 1px 0 #555, inset 2px 2px 0 #999, inset -1px -1px 0 #fff, inset -2px -2px 0 #ddd"
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
