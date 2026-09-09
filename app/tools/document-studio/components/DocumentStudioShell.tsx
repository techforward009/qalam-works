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
      <div className="studio-no-print shrink-0 border-b border-[#1A3A2A]/10 bg-white" data-studio-chrome="top">{topBar}</div>
      <div className="studio-no-print shrink-0 border-b border-[#1A3A2A]/10 bg-white" data-studio-chrome="menu">{menuBar}</div>
      <div className="studio-no-print shrink-0 border-b border-[#1A3A2A]/10 bg-[#FAF8F3]" data-studio-chrome="toolbar">{toolbar}</div>
      {findBar ? <div className="studio-no-print shrink-0 border-b border-[#1A3A2A]/10 bg-white px-3 py-2">{findBar}</div> : null}

      <div className="relative flex min-h-0 min-w-0 flex-1" data-studio-workspace-wrap="true">
        {leftOpen && (
          <div
            className="absolute inset-y-0 z-20 w-[min(100%,18rem)] border-[#1A3A2A]/10 bg-white shadow-md lg:static lg:z-0 lg:w-56 lg:shrink-0 lg:shadow-none"
            style={{ [isUr ? "right" : "left"]: 0, borderInlineEndWidth: 1 }}
            data-studio-left-sidebar="true"
          >
            {leftSidebar}
          </div>
        )}

        <div className="min-w-0 flex-1 overflow-auto bg-[#E8E4DB]">{children}</div>

        {rightOpen && (
          <div
            className="absolute inset-y-0 z-20 w-[min(100%,24rem)] min-w-0 overflow-x-hidden overflow-y-auto border-[#1A3A2A]/10 bg-white shadow-md lg:static lg:z-0 lg:w-[24rem] lg:max-w-[28rem] lg:shrink-0 lg:shadow-none xl:w-[26rem]"
            style={{ [isUr ? "left" : "right"]: 0, borderInlineStartWidth: 1 }}
            data-studio-right-sidebar="true"
          >
            {rightSidebar}
          </div>
        )}
      </div>

      <div className="studio-no-print shrink-0 border-t border-[#1A3A2A]/10 bg-white" data-studio-chrome="status">{statusBar}</div>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          [data-studio-print-root],
          [data-studio-print-root] * { visibility: visible; }
          [data-studio-print-root] {
            position: absolute;
            inset: 0;
            width: 100%;
            background: white;
            box-shadow: none;
            padding: 0;
          }
          .studio-no-print,
          [data-studio-left-sidebar],
          [data-studio-right-sidebar],
          [data-studio-ruler],
          [data-studio-chrome] { display: none !important; }
          [data-studio-zoom-surface] {
            transform: none !important;
            width: 100% !important;
            height: auto !important;
          }
          [data-studio-page-sheet] {
            box-shadow: none !important;
            break-after: page;
          }
        }
      `}</style>
    </div>
  );
}
