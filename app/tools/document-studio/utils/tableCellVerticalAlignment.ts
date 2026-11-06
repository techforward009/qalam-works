/** Centres each cell font line box using CSS font ascent/descent, not glyph ink. */
export const TABLE_CELL_VERTICAL_ALIGNMENT = "middle" as const;

/** Nastaliq ink sits high in that line box (tall descent below the baseline).
 *  PDF cells have no extra screen border, so the same metrics put glyphs on the
 *  top rule. This start inset is added only in PDF HTML, on top of any
 *  paragraph space-before, to match the editor/InPage visual centre. */
export const TABLE_CELL_PDF_INK_START_INSET = "0.25em";
