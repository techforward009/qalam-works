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
