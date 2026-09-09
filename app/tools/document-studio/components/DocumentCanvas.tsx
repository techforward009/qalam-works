"use client";

import type { Editor } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import { getFontById } from "../utils/fontRegistry";
import { resolveResponsivePagePadding, type ResolvedPageLayout } from "../utils/pageLayout";
import type { DocumentStudioSettings } from "../utils/documentSettings";
import { BLOCK_STYLE_EDITOR_CSS } from "../utils/documentSchema";

export default function DocumentCanvas({
  editor,
  dir,
  isUr,
  isEditorEmpty,
  documentSettings,
  pageLayout,
  onLoadExample,
  onWrapperClick,
}: {
  editor: Editor | null;
  dir: "rtl" | "ltr";
  isUr: boolean;
  isEditorEmpty: boolean;
  documentSettings: DocumentStudioSettings;
  pageLayout: ResolvedPageLayout;
  onLoadExample: () => void;
  onWrapperClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const scale = Math.min(2.6, 860 / pageLayout.widthMm);
  const padding = resolveResponsivePagePadding(pageLayout, dir);

  return (
    <div className="rounded-xl bg-[#E8E4DB] px-2 py-4 sm:px-3 sm:py-5 lg:px-6 lg:py-6">
      <div
        className="relative mx-auto w-full rounded-lg border border-[#1A3A2A]/8 bg-white shadow-[0_8px_30px_rgba(26,58,42,0.10)] focus-within:ring-2 focus-within:ring-[#B8935A]/40"
        style={{
          maxWidth: `${pageLayout.widthMm * scale}px`,
          aspectRatio: `${pageLayout.widthMm} / ${pageLayout.heightMm}`,
          fontSize: `${documentSettings.typography.bodyFontSizePt}pt`,
          lineHeight: documentSettings.typography.lineHeight,
        }}
        dir={dir}
        onClick={onWrapperClick}
        role="textbox"
        aria-label={isUr ? "دستاویز ایڈیٹر" : "Document editor"}
      >
        {isEditorEmpty && editor && (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 py-10"
            aria-hidden={false}
          >
            <p className="mb-2 text-3xl text-[#B8935A]/80 select-none" aria-hidden>
              ✎
            </p>
            <p
              className={`mb-5 text-sm sm:text-base text-gray-500 ${isUr ? "font-naskh" : ""}`}
              dir={dir}
            >
              {isUr ? "یہاں لکھنا شروع کریں…" : "Start writing here…"}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadExample();
              }}
              className={`pointer-events-auto h-10 px-5 rounded-lg text-sm font-semibold border border-[#1A3A2A]/20 bg-white text-[#1A3A2A] hover:bg-[#F7F5EF] shadow-sm ${isUr ? "font-naskh" : ""}`}
            >
              {isUr ? "مثال لوڈ کریں" : "Load Example"}
            </button>
          </div>
        )}

        <div
          className="cursor-text"
          style={{
            width: "100%",
            minHeight: "100%",
            paddingTop: `${padding.topPct}%`,
            paddingBottom: `${padding.bottomPct}%`,
            paddingLeft: `${padding.leftPct}%`,
            paddingRight: `${padding.rightPct}%`,
          }}
        >
          <EditorContent
            editor={editor}
            className={`qalam-editor-content qalam-doc-page focus:outline-none ${
              dir === "rtl" ? "font-nastaliq" : ""
            }`}
            style={
              {
                "--qalam-body-size": `${documentSettings.typography.bodyFontSizePt / 12}rem`,
                "--qalam-line-height": documentSettings.typography.lineHeight,
                "--qalam-rtl-font": `"${getFontById(documentSettings.typography.defaultRtlFontId).editorFamily}"`,
                "--qalam-ltr-font": `"${getFontById(documentSettings.typography.defaultLtrFontId).editorFamily}"`,
                "--qalam-first-line-indent": `${documentSettings.typography.firstLineIndentMm}mm`,
                "--qalam-paragraph-before": `${documentSettings.typography.paragraphBeforePt}pt`,
                "--qalam-paragraph-after": `${documentSettings.typography.paragraphAfterPt}pt`,
              } as React.CSSProperties
            }
          />
        </div>
      </div>
      <style jsx global>{`
        .qalam-editor-content.qalam-doc-page .ProseMirror {
          min-height: 60vh;
          padding: 0.5rem;
          outline: none;
          text-align: start;
          font-size: var(--qalam-body-size, 1.05rem);
          line-height: var(--qalam-line-height, 1.85);
          color: #1a1a1a;
        }
        .qalam-editor-content .ProseMirror[dir="rtl"] {
          direction: rtl;
        }
        .qalam-editor-content .ProseMirror[dir="ltr"] {
          direction: ltr;
        }
        @media (min-width: 640px) {
          .qalam-editor-content.qalam-doc-page .ProseMirror {
            padding: 0.75rem;
            font-size: var(--qalam-body-size, 1.1rem);
            line-height: var(--qalam-line-height, 1.9);
          }
        }
        .qalam-editor-content .ProseMirror p[dir="rtl"],
        .qalam-editor-content .ProseMirror h1[dir="rtl"],
        .qalam-editor-content .ProseMirror h2[dir="rtl"],
        .qalam-editor-content .ProseMirror h3[dir="rtl"],
        .qalam-editor-content .ProseMirror h4[dir="rtl"] {
          direction: rtl;
          unicode-bidi: isolate;
          text-align: start;
          font-family: var(--qalam-rtl-font, "Noto Nastaliq Urdu");
        }
        .qalam-editor-content .ProseMirror p[dir="ltr"],
        .qalam-editor-content .ProseMirror h1[dir="ltr"],
        .qalam-editor-content .ProseMirror h2[dir="ltr"],
        .qalam-editor-content .ProseMirror h3[dir="ltr"],
        .qalam-editor-content .ProseMirror h4[dir="ltr"] {
          direction: ltr;
          unicode-bidi: isolate;
          text-align: start;
          font-family: var(--qalam-ltr-font, "Inter");
        }
        .qalam-editor-content .ProseMirror p:not([dir]),
        .qalam-editor-content .ProseMirror h1:not([dir]),
        .qalam-editor-content .ProseMirror h2:not([dir]),
        .qalam-editor-content .ProseMirror h3:not([dir]),
        .qalam-editor-content .ProseMirror h4:not([dir]) {
          unicode-bidi: plaintext;
          text-align: start;
        }
        ${BLOCK_STYLE_EDITOR_CSS}
        .qalam-editor-content p {
          margin-block-start: var(--qalam-paragraph-before, 0);
          margin-block-end: var(--qalam-paragraph-after, 0.55rem);
          text-indent: var(--qalam-first-line-indent, 0);
          line-height: inherit;
        }
        .qalam-editor-content p:lang(en) {
          line-height: inherit;
        }
        .qalam-editor-content h1 {
          font-size: 1.55rem;
          font-weight: 700;
          margin: 1rem 0 0.55rem;
          line-height: 1.45;
        }
        .qalam-editor-content h2 {
          font-size: 1.28rem;
          font-weight: 700;
          margin: 0.85rem 0 0.45rem;
          line-height: 1.45;
        }
        .qalam-editor-content h3 {
          font-size: 1.12rem;
          font-weight: 700;
          margin: 0.7rem 0 0.4rem;
          line-height: 1.45;
        }
        .qalam-editor-content h4 {
          font-size: 1.02rem;
          font-weight: 700;
          margin: 0.6rem 0 0.35rem;
          line-height: 1.45;
        }
        .qalam-editor-content ul {
          list-style: disc;
          padding-inline-start: 1.5rem;
          margin: 0.35rem 0;
        }
        .qalam-editor-content ol {
          list-style: decimal;
          padding-inline-start: 1.5rem;
          margin: 0.35rem 0;
        }
        .qalam-editor-content li {
          margin: 0.15rem 0;
          unicode-bidi: plaintext;
          text-align: start;
        }
        .qalam-editor-content blockquote {
          border-inline-start: 3px solid #d97706;
          padding-inline-start: 1rem;
          color: #57534e;
          font-style: italic;
          margin: 0.5rem 0;
          unicode-bidi: plaintext;
          text-align: start;
        }
        .qalam-editor-content a {
          color: #b45309;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
