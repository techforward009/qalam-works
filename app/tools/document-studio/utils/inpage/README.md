# InPage text import (stage 1)

`parseInPage(ArrayBuffer | Uint8Array)` returns `{ version: 2 | 3, stories: string[][] }`.
It has no filesystem, UI, network, or document-editor dependencies.

- `cfb` reads the OLE2 container. `DocumentInfo` and exactly one root main stream
  (`InPage100`, `InPage200`, or `InPage300`) are required. The stream's u16 at
  offset 2 determines the encoding.
- Unicode text is decoded only from complete paragraph-length tables terminated
  by `0xffffffff`. Each story has its own zero-terminated list. Each declared
  paragraph must end exactly at a UTF-16 CR; bytes following the declared text
  are ignored. The parser never searches for Urdu/Arabic-looking content.
- Legacy records use u32 byte lengths and CR terminators. The copied MIT table
  handles `04 XX` glyphs and composites; tabs and spaces are retained. Visual
  digit runs are reversed into logical Unicode order. Unsupported glyphs are
  rejected instead of replaced with guessed letters.
- Container size and parsing work are bounded. Complete long tables are decoded
  once rather than repeatedly decoding each suffix.

The character map's upstream MIT notice is in `LICENSE.inpage-format.txt`.
`cfb` is Apache-2.0. Layout, styles, images, and frame positions are not imported.
For later layout stages, InPage units are 1/2000 point (`INPAGE_UNITS_PER_POINT`).

## Experimental, read-only InPage300 object metadata (2026-10-29)

`parseInPageObjectMetadata(buffer)` is an **optional, fail-soft** recognizer for a
very specific, native InPage300 object descriptor profile. It does NOT import,
persist, render or reflow text boxes. The normal text importer is unchanged.

- Requires a valid OLE2 container, `DocumentInfo`, exactly one `InPage300`
  main stream, and the observed InPage300 header.
- Matches the measured 8-byte descriptor prefix, bounded 46/50-byte body
  lengths and four sequential little-endian `00 7E`–`03 7E` geometry tags.
  Units are 1/2000 point; coordinates are relative to the logical stream.
- `0F 7E 01 00` = **explicit ON** and `0F 7E 00 00` = **explicit OFF**
  in the two tested InPage 3.1 ON/OFF pairs.
  Missing flag = **omitted**, NOT universally ON. Unknown explicit values
  remain **unknown**, never silently coerced.
- Coordinates/size are diagnostic candidates, not a verified association with
  a particular story, text run, stacking order, or image. Other InPage profiles
  may have different descriptors.
- Parsing is bounded, read-only and optional; invalid/unsupported data cannot
  prevent normal story import. The UI shows an expandable, dismissible metadata
  notice only when candidates are found. It does NOT place boxes or promise
  faithful visual import.
- Synthetic tests are committed. The owner's four original native .INP samples
  were checked **locally but are NOT committed**; there is no multi-object,
  mixed image/text or independent native save/reopen guarantee yet.

Do not make this record scanner a general-purpose INP specification, and do
not turn on visual Run Around or PDF wrapping from this evidence alone.

## Experimental story-reference association (2026-10-29, NOT final import)

In five locally inspected native InPage300 text-box samples, a bounded
46/50-byte object descriptor contains `82 00 07 00` at descriptor+18.
The native story list has 8 entries, and zero-based index 7 points at the
text typed into the box in all five. The four controlled RunAround ON/OFF
files also have a different, longer main story; the independent box-only
sample's longest story is itself #8. **Never duplicate the longest story
into a frame.** This is a strong correlation, not yet a proven general
foreign-key format (all box-bearing specimens use the same index).

`associateOneInPageBoxStory` therefore fails closed when there is no
unique candidate, an absent/invalid reference, no distinct nonempty secondary
story, or a potential duplicate of the main story. Its output is displayed
ONLY after a user explicitly chooses "Show experimental placement".
The dashed blue visual overlay is `studio-no-print`, pointer-events-none,
ephemeral, and nonpersistent. It is not a StudioFrame, never changes the
TipTap document, frames storage, Run Around/reflow, or PDF. It may use a
different font/line wrap from native InPage; it is a placement experiment.

Further proof before editable frame import: supply TWO differently-worded
boxes in one native source and a second source with those boxes moved/swapped.
Confirm different `0x82` references and object indices; then test native
text/body fidelity, z-order, multi-page behavior, layouts and PDFs. Without
those records, **do not automatically import editable frames**.
