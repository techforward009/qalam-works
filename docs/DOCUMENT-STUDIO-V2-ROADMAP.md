# Document Studio v2 Roadmap

Document Studio v2 moves incrementally toward a Google Docs-class editing
experience while retaining Qalam Works' multilingual, RTL/LTR-first foundation.
This roadmap is directional and not a promise to deliver every milestone at once.

## Complete: v2.1 Tables

Real structured TipTap tables, table editing commands, persistence, basic DOCX
and PDF export, and Urdu/English cell-content support.

## Current: v2.2 Images

Structured raster image nodes with local PNG/JPEG/WebP insertion, bounded
IndexedDB-backed persistence, basic resize/alignment/alt text, and DOCX/PDF
export. Advanced wrapping, cropping, annotations, and DOCX image import remain
deferred.

## Later milestones

- v2.3 Page and section features
- v2.4 Comments and Suggesting
- v2.5 Version history
- v2.6 Accounts, cloud sync, and sharing
- v2.7 Real-time collaboration
- v2.8 Advanced objects and offline maturity

DOCX import remains intentionally unchanged in v2.1: the existing Mammoth
pipeline may flatten imported tables to text and does not claim table-preserving
round-trip import.
