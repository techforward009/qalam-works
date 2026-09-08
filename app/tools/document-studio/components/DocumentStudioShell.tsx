"use client";

/**
 * Google-Docs-style application chrome around the existing canvas.
 * Layout only — no document commands, no export, no schema.
 */
export default function DocumentStudioShell({
  isUr,
  topBar,
  menuBar,
  toolbar,
  findBar,
  leftSidebar,
  rightSidebar,
  statusBar,
  children,
}: {
  isUr: boolean;
  topBar: React.ReactNode;
  menuBar: React.ReactNode;
  toolbar: React.ReactNode;
  findBar?: React.ReactNode;
  leftSidebar?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  statusBar: React.ReactNode;
  children: React.ReactNode;
}) {
  const leftOpen = Boolean(leftSidebar);
  const rightOpen = Boolean(rightSidebar);

  return (
    <div
      className="flex min-h-[78vh] flex-col overflow-hidden rounded-2xl border border-[#1A3A2A]/10 bg-[#F4F1EA] shadow-[0_2px_20px_rgba(26,58,42,0.06)]"
      data-studio-shell="true"
      dir={isUr ? "rtl" : "ltr"}
    >
      <div className="shrink-0 border-b border-[#1A3A2A]/10 bg-white">{topBar}</div>
      <div className="shrink-0 border-b border-[#1A3A2A]/10 bg-white">{menuBar}</div>
      <div className="shrink-0 border-b border-[#1A3A2A]/10 bg-[#FAF8F3]">{toolbar}</div>
      {findBar ? <div className="shrink-0 border-b border-[#1A3A2A]/10 bg-white px-3 py-2">{findBar}</div> : null}

      <div className="relative flex min-h-0 min-w-0 flex-1">
        {leftOpen && (
          <div
            className="absolute inset-y-0 z-20 w-[min(100%,18rem)] border-[#1A3A2A]/10 bg-white shadow-md md:static md:z-0 md:w-64 md:shrink-0 md:shadow-none"
            style={{ [isUr ? "right" : "left"]: 0, borderInlineEndWidth: 1 }}
            data-studio-left-sidebar="true"
          >
            {leftSidebar}
          </div>
        )}

        <div className="min-w-0 flex-1 overflow-auto bg-[#E8E4DB]">{children}</div>

        {rightOpen && (
          <div
            className="absolute inset-y-0 z-20 w-[min(100%,22rem)] overflow-y-auto border-[#1A3A2A]/10 bg-white shadow-md md:static md:z-0 md:w-80 md:shrink-0 md:shadow-none"
            style={{ [isUr ? "left" : "right"]: 0, borderInlineStartWidth: 1 }}
            data-studio-right-sidebar="true"
          >
            {rightSidebar}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[#1A3A2A]/10 bg-white">{statusBar}</div>
    </div>
  );
}
