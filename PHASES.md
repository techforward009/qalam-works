# Multi-line text box: editing-time TipTap editor

Branch `feat/textbox-pm-editor-phase1`. This is the scoped Option C from `.pm-docs/parity-study-report.md` (C-lite). Option A is already on this branch: `frameParagraphNavigationOffset` / `frameParagraphNavigationSelection` in `utils/frameParagraphNavigation.ts`, called from `StudioTextFrame.handleKeyDown`. A textarea still has one alignment, one indent, and one spacing for the whole box, so it cannot reach the rest of the main story. Option B is out of this plan.

Each phase is shippable on its own. The flag stays **off** by default. With the flag off, screen, QPG, and print stay on today’s path. With the flag on, only a **multi-line** box that is **being edited** mounts ProseMirror. Idle boxes, print/PDF, and the single-line Title Text Box stay as they are.

Stored frame text remains `StudioFrame.text` plus optional `paragraphAligns` and (starting in Phase 2) `paragraphFormats` (`QPG_FRAME_KEYS` in `utils/qpgFile.ts`).

## Flag

New helper `textboxPmEnabled()` in `app/tools/document-studio/utils/textboxPmFlag.ts`. Read it only in client components (`StudioObjectLayer` is already `"use client"`). SSR and the first paint stay on the textarea path.

Precedence:

1. Query `?textboxPm=1` or `?textboxPm=0` on `/tools/document-studio` wins.
2. Else `localStorage["qalam.textboxPm"]` of `"1"` or `"0"`.
3. Else build env `NEXT_PUBLIC_QALAM_TEXTBOX_PM=1`.
4. Else off.

`playwright.config.ts` builds once (`npx next build && npm start`) and may reuse that server, so e2e must use the query or `localStorage`, not the env var. Either of these turns it on:

```js
await page.addInitScript(() => localStorage.setItem("qalam.textboxPm", "1"));
await page.goto("/tools/document-studio?textboxPm=1");
```

`?textboxPm=0` forces the textarea path even when the env or `localStorage` is on.

## Code the phases build on

| Piece | Where |
|---|---|
| Story editor | `DocumentStudioEditor.tsx` `useEditor` (~551): `InpageKeyboard`, `createDocumentStudioExtensions()`, tables, `QalamPagination`, `LatinScriptRuns`, `AllahAutoMarks`. `handleKeyDown` calls `handleStudioDocumentNavigation` first (~581). |
| Schema | `createDocumentStudioExtensions` (`documentSchema.ts` ~804), `ParagraphWithDir`, `StudioTextAlign` (Mod-Alt-L/R/C/J/F), paragraph attrs `lineHeight`, `leading`, `spaceBeforePt`, `spaceAfterPt`, `firstLineIndentMm`, `indentStartMm`, `indentEndMm`. |
| Story caret | `caret-color: transparent` (`DocumentCanvas.tsx` ~702). `StudioCaret` (`StudioObjectLayer.tsx` ~949) calls `caretGeometry`. Empty blocks use the alignment point (~1013–1020). |
| Box today | `StudioTextFrame`: `<textarea>` (multi-line) or `<input>` (`singleLine`). `measure()`, hidden mirror, `ParagraphColumn`, `data-studio-frame-caret`. History: `createFrameHistory` (one step per `beforeinput`, max 100). |
| Frame host | `StudioFrame` type and `updateFrame` (`StudioObjectLayer.tsx` ~32, ~345). Edit when `tool === "text"` (`FrameShape` `editable`). New box focuses via `pendingTextFocus` (~279). Escape clears selection in `clearOnEscape` (~295); it does not delete the frame. |
| Ownership | `installFormattingSafety`: owner `story \| frame \| none`. `claimFrame` only matches `textarea[data-studio-text-frame], input[data-studio-text-frame]`. `canFormat` rejects frame formatting except whole-box font, size, colour, and alignment. |
| Commands | `focusedTextFrame`, `setAlign` → `patchFrame`, `undo`/`redo` → `runFrameHistory`, `selectAll` always calls the **story** (`documentCommands.ts` ~30, ~489–505). Edit-menu enablement uses `editor.can().undo()` (`DocumentStudioEditor.tsx` ~2138). |
| Align math | `resolvedParagraphAligns`, `collapseParagraphAligns`, `realignAfterTextEdit`, `paragraphTextPatch` (`paragraphAlign.ts`). |
| Keyboard | `InpageKeyboard` `handleKeyDown` → `resolveKey` → `handleTextInput`. Layout in `localStorage["qalam.keyboard.layout"]` (`useInpageKeyboard` / `loadKeyboardChoice`). Monotype `KeyA` normal is `ق`. `getKeyboardLayout` in `DocumentStudioEditor` returns null when the processing language is English. |
| Print | `frameParagraphMarkup` / `renderPrintFrame` (`printableFrames.ts`). Leading from `blockLeadingPt`. |

## Phase 1 — Foundation: flagged editor, round-trip, caret, typing

**Goal.** While a multi-line box is edited and the flag is on, typing happens in a TipTap editor. Commit writes the same `text` and `paragraphAligns` the textarea path would. Flag off is unchanged.

**Scope.**

- `utils/textboxPmFlag.ts` — `textboxPmEnabled()`.
- `utils/frameEditorDoc.ts` — `frameToDoc(text, textAlign, paragraphAligns)` and `docToFrame(doc, textAlign)`. One paragraph node per `text.split("\n")` line. `textAlign` on each node comes from `resolvedParagraphAligns`. `docToFrame` joins paragraph text with `\n` and runs `collapseParagraphAligns`. A legacy frame (no `paragraphAligns`) stays without that key when every paragraph still shares `textAlign`. No marks, hard breaks, headings, lists, or images in the doc.
- `utils/frameEditorExtensions.ts` — reduced factory. Keep StarterKit history, `ParagraphWithDir`, `ParagraphAutoDirection`, `StudioTextAlign`, `InpageKeyboard`. Turn off hard break, heading, lists, blockquote, code, link, horizontal rule. Do **not** add `QalamPagination`, tables, `LatinScriptRuns`, `AllahAutoMarks`, `DocumentImage`.
- `components/StudioFrameEditor.tsx` — `useEditor` + `EditorContent`, mounted only for the active multi-line frame. Root attrs: `data-studio-text-frame`, `data-studio-frame-editor`, the same `data-studio-frame-*` dataset `StudioTextFrame` publishes (font, size, colour, align, typography). CSS from the frame: `editorFontFamilyStack`, `bodyFontSizePt`, `blockLeadingPt`, `direction: rtl`, padding 2px, `text-indent: 0`, `overflow: auto`, `scrollbar-width: none`, `caret-color: transparent`.
- `StudioObjectLayer.tsx` — `FrameShape` renders `StudioFrameEditor` only when `textboxPmEnabled()` && `editable` && `!frame.singleLine` && this frame is the editing frame. Pointer down on a multi-line text frame with the Text tool (the focus path ~680) starts editing and keeps the click point. `EditorView.posAtCoords` places the selection after mount. Escape (ignore `isComposing`) and pointerdown outside the frame commit and unmount. `isFormattingSurface` targets (toolbar, menus, dialogs) do not commit. Tool change away from `"text"` commits. `clearOnEscape` still only clears selection; it must not delete the frame. The Text tool stays selected.
- `DocumentStudioEditor.tsx` / `DocumentCanvas.tsx` — pass the existing `getKeyboardLayout` into the layer (one layout source, including Left Ctrl+Space).
- `formattingSafety.ts`, `documentCommands.ts` — treat the box editor DOM as the frame owner so story transactions and `canFormat` do not fire while it is focused. Whole-box font, size, colour, and `setAlign` keep working: alignment goes through the box doc’s `textAlign`, then `docToFrame`. `registerFrameHistory` points at the box editor so `undo` / `redo` do not call the story while the box is focused.
- Sync each doc change to `updateFrame` with `docToFrame` **directly**, not `paragraphTextPatch` (a string diff would fight per-paragraph `textAlign`). Skip the write when `text` and collapsed aligns are unchanged. `setContent` on mount uses `addToHistory: false` (same idea as `setEditorContent(..., "load")`). Do not `setContent` again from the prop echo.

`handleKeyDown` on the box editor calls `handleStudioDocumentNavigation` first, so Ctrl/Cmd+Up/Down/Home/End (± Shift) match the story. Enter splits a paragraph (StarterKit). The new paragraph copies `textAlign` (same inheritance as `realignAfterTextEdit`). Undo uses StarterKit history (typing groups; `createFrameHistory` is not used while this editor is mounted).

Caret: a box-local painter calls `caretGeometry` with `coordsAtPos`, the zoom scale (`[data-studio-zoom-surface]` width / `pageWidthPx`, as `StudioCaret` does), and the frame’s scroll. Empty paragraphs use the block’s alignment point (the `StudioCaret` rule ~1013–1020). Native selection highlight is enough in this phase because the ProseMirror text **is** the layout (the textarea/mirror split in `measure()` is gone while editing). Paint the caret with `data-studio-frame-caret`. Do not drive `StudioCaret`; it is bound to the story editor, pagination, and facing pages.

**Acceptance.**

- Flag off: `textarea` still edits; `tests/e2e/documentStudioTextFrameParagraphNav.spec.ts` still passes; no `.ProseMirror` inside a frame.
- Flag on: idle box has no in-frame ProseMirror. Edit, type, Enter, Escape: `text` matches, and `paragraphAligns` is unchanged when the edit did not change alignment. Mixed aligns `['center', null, 'left', null]` survive an edit in another paragraph. A legacy frame with no `paragraphAligns` still has no key after a text-only edit.
- Caret sits on the clicked glyph at 100% and 200% zoom. Arrow Up/Down stay on that column. Ctrl+Up/Down land on paragraph starts, including an empty paragraph (same offsets as `frameParagraphNavigationOffset`).
- `localStorage["qalam.keyboard.layout"] = "inpageMonotype"`: `KeyA` inserts `ق`. Processing language English inserts Latin `a`.
- Ctrl+Z / Ctrl+Y (and Ctrl+Shift+Z) undo and redo inside the box and do not change the story. A burst of typing is one undo group.
- Click on the story or empty pasteboard commits and leaves the static paint. Toolbar click does not. Single-line Title Text Box still uses `<input>`, blocks Enter, and runs `normalizeSingleLineText`.
- Save during an edit writes the committed `text`. Print HTML from `frameParagraphMarkup` is unchanged.

**Tests.** `tests/textboxPmFlag.test.ts` (precedence, including query `0`). `tests/frameEditorDoc.test.ts` (empty, empty paragraphs, mixed aligns, collapse, legacy omission, dropped marks). `tests/e2e/documentStudioTextFramePm.spec.ts` for the acceptance list. Existing `paragraphAlign`, `qpgFile`, `documentPrintableFrames`, `frameCaret`, `singleLineFrame`, `documentStudioTextFrameInteraction`, `documentStudioTextFrameFormatting`, `documentStudioSingleLineText`, `documentStudioFrameExport` stay green with the flag off.

**Risks.** First-click `posAtCoords` after async `useEditor` mount. IME composition: commit on `compositionend`, not mid-composition. Zoom and internal scroll in the caret maths. `ParagraphAutoDirection` may set `dir` during edit; `docToFrame` must ignore `dir` / `directionMode` so QPG does not grow. Two editors: the story must stay mounted and must not receive the box’s transactions. Picture-box exceptions in `formattingSafety.ts` stay intact.

## Phase 2 — Line spacing, paragraph spacing, indents

**Goal.** The box can use the story paragraph spacing and indent attributes, and they survive save, reopen, and print.

**Scope.** Optional `paragraphFormats` on `StudioFrame` (parallel to paragraphs; null entry = frame defaults). Whitelist it in `QPG_FRAME_KEYS` and `validateQpgDocument`. Extend `frameToDoc` / `docToFrame` for `lineHeight`, `leading`, `spaceBeforePt`, `spaceAfterPt`, `firstLineIndentMm`, `indentStartMm`, `indentEndMm` (`PARAGRAPH_STYLE_ATTRS`). Allow those commands when the frame owner is the box editor: `applyParagraphAttrs`, `applyLineHeight`, `applyLineGap`, and `StudioParagraphDialog` (opened from `DocumentStudioEditor` only after `canFormat()`). `frameParagraphMarkup` / `renderPrintFrame` emit the same CSS the schema’s `renderHTML` emits, with `blockLeadingPt` when leading is unset. Collapse the key away when every entry is empty so old files stay identical.

**Acceptance.** Flag on: a box paragraph can have its own space-before and first-line indent; after Escape the static paint shows them; PDF/print markup matches. A file without `paragraphFormats` prints as today. Flag off: the paragraph dialog still refuses a text box (`formattingSafetyMessage`).

**Tests.** Unit round-trip and “absent key stays absent”. Extend `documentPrintableFrames` / `qpgFile` for the new key and for a legacy frame. One e2e: set space-before, leave edit, reload, print HTML contains `margin-block-start`.

**Risks.** First QPG change. Older builds drop unknown keys on save (downgrade loss). Indent changes line width, so the caret must follow the ProseMirror layout (the textarea mirror cannot). Screen leading and print leading must share `blockLeadingPt`.

## Phase 3 — Allah marks and the remaining story typing commands

**Goal.** Commands that only insert characters or paragraph alignment work in the box editor.

**Scope.** Add `AllahAutoMarks` to the box extension list. Set `--qalam-rtl-font` from the frame’s `defaultRtlFontId` so `isDigitalKhatt` matches the story (the plugin inserts `ّ` / `ٰ` into plain text, which `docToFrame` already keeps). Wire Tab to insert `\t` the way `DocumentStudioEditor` `handleKeyDown` does (~600). Let Mod-Alt-F (full justify) reach `StudioTextAlign` on the box; `formattingSafety` currently whitelists only L/R/C/J (`frameAlignShortcut`). Keep `LatinScriptRuns` out until phase 5 (it writes font marks the phase 1 doc drops).

**Acceptance.** Digital Khatt frame: typing a completed Allah word inserts the same marks as the story, and they are still in `text` after Escape. Another font: no auto marks. Monotype still works. Tab inserts a tab character. Ctrl+Alt+F sets `justify-all` on the caret’s paragraphs only.

**Tests.** Unit: Allah fixture shared with the story extension test, asserted through `docToFrame`. E2e: Monotype plus one Allah word on `digital-khatt-indo-pak`, then Escape and reload.

**Risks.** `AllahAutoMarks` uses `closeHistory` and `setTime(0)`; box undo grouping must match the story. The plugin must not run on `setContent` of an opened file (it already ignores non-input transactions).

## Phase 4 — Select All, clipboard, and Edit-menu scoping

**Goal.** Edit menu and clipboard shortcuts apply to the box when the box editor is the formatting owner.

**Scope.** `selectAll` (`documentCommands.ts` ~503) and `documentMenuActions.ts` `edit.selectAll` (~172). When the owner is the box editor, select inside that doc only. `formattingSafety` key handler (~169) must not claim the story on Ctrl/Cmd+A when the event target is the box. Cut, copy, and paste (`edit.cut` / `edit.copy` / `edit.paste`, and `StudioTextContextMenu`) stay in the box and paste plain paragraphs (no marks yet). Edit-menu undo/redo enablement (`DocumentStudioEditor.tsx` ~2138–2140) reads the box history while the box is owner, and the story history otherwise. `editor.can().undo()` on the story must not disable a box that has steps, and must not enable a story undo that would run while the box is focused.

**Acceptance.** Menu Select All and Ctrl+A select the box text and leave the story selection untouched. Paste of multi-paragraph plain text splits paragraphs and inherits `textAlign`. Menu Undo undoes the box group. Focusing the story and choosing Select All selects the story. Flag off: menu Select All still selects the story (today’s `selectAll`).

**Tests.** E2e for menu and keyboard Select All, paste of two paragraphs, undo enablement. A story-focused control case. Flag-off e2e that menu Select All still hits `.ProseMirror` of the story.

**Risks.** `storyClipboardFocus` in `installFormattingSafety` is easy to desync. Paste that contains HTML must go through the plain-text `transformPasted` path so phase 1’s mark-free doc holds.

## Phase 5 — Per-range formatting

**Goal.** Bold, italic, underline, colour, font, and size can apply to a range inside the box and survive save and print.

**Scope.** This is the first rich stored content. Add an optional `richText` doc on the frame (TipTap JSON, paragraphs only, whitelist of marks). `QPG_FRAME_KEYS` + `validateQpgDocument`. When `richText` is present, `frameToDoc` / `docToFrame` use it and still mirror plain `text` + `paragraphAligns` for older readers. When it is absent, behaviour is phases 1–4. Enable the matching marks in the box schema and route `toggleBold`, `toggleItalic`, `toggleUnderline`, `applyTextColor`, `applyFontFamily`, `applyFontSize` to the box selection when the owner is the frame editor. Whole-box dataset behaviour remains the fallback for a collapsed selection with no marks. `frameParagraphMarkup` renders the marks with the same font stack as the story. `LatinScriptRuns` can join here, once Latin font marks persist. `canFormat` allows these commands for the box editor and still blocks tables, images, headings, and lists.

**Acceptance.** A bold Urdu word in one paragraph of a box reloads bold, prints bold, and does not bold the story. A frame with no `richText` still round-trips as `text` + `paragraphAligns` only. Flag off never writes `richText`.

**Tests.** Unit whitelist (reject table/image/heading nodes). QPG round-trip. Print markup. E2e bold + font size on a selection, reload, and a flag-off save that does not add `richText`.

**Risks.** Dual write of `text` and `richText` drifting. Downgrade drops `richText`. PDF font embedding must use the real face (`docs/QALAM-PAGE-ENGINEERING.md`), not only the screen span.

## Phase 6 — Remove the multi-line textarea editor

**Goal.** Multi-line editing has one path. The flag goes away.

**Scope.** After a soak with the flag on: delete the multi-line branch of `StudioTextFrame` (`measure`, mirror, `ParagraphColumn` editing caret, `createFrameHistory`, `frameParagraphNavigationSelection` in `handleKeyDown`). Keep the non-editing paint (`ParagraphColumn` / `frameParagraphMarkup`) so a box that is not being edited is still static HTML, shared with print. Keep the single-line `<input>` path: `normalizeSingleLineText`, Enter block, `centerSingleLinePadding`, e/w handles, `singleLineOuterHeightMm`. Keep `paragraphAlign.ts`, `frameCaret.ts` (story and any remaining empty-line helper), `studioDocumentNavigation.ts`, and picture tools. Remove `textboxPmEnabled` checks and the default-off flag. Update e2e that locates `textarea` inside a multi-line frame (`documentStudioTextFrameParagraphNav.spec.ts`, interaction and formatting specs) to the box editor.

**Acceptance.** Multi-line edit, caret, Monotype, Enter, undo, Escape, spacing, Allah marks, Select All, and a bold range all work with no flag. Single-line specs pass unchanged. A legacy QPG with no `paragraphAligns` and no `paragraphFormats` / `richText` saves those frames without new keys when the user did not format them. Print snapshots for alignment-only frames stay the same.

**Tests.** Run the phase 1–5 e2e without setting the flag. Full `paragraphAlign`, `qpgFile`, `documentPrintableFrames`, `singleLineFrame`, picture-tool, and formatting-safety suites.

**Risks.** Specs and `claimFrame` still assume a textarea. Remove that selector only in this phase, when every multi-line edit goes through `data-studio-frame-editor`.

## Untouched throughout

Single-line Title Text Box. Muhammadi Quranic font files. Story `StudioCaret` / `caretGeometry` behaviour on the main story. Picture boxes and their `formattingSafety` exceptions. `QPG_FRAME_KEYS` until phase 2, and `richText` until phase 5. Print output for frames that only have `text` and `paragraphAligns`.
