// Phase 3C spike (docs/PHASE-3C-DOCX-SPEC.md §7 step 2). Not part of the
// app — a standalone script to prove the `docx` package's real API shape
// before writing the actual buildDocxDocument.ts adapter. Run with:
//   npx tsx scripts/verification/docx-spike.ts
// then unzip the output .docx and inspect the real OOXML — that's the
// actual verification, not just "the script ran without throwing."

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ExternalHyperlink,
  LevelFormat,
} from "docx";
import { writeFileSync } from "fs";

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "spike-numbered-list",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.START,
          },
        ],
      },
      {
        reference: "spike-bullet-list",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.START,
          },
        ],
      },
    ],
  },
  sections: [
    {
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("Spike Heading")],
        }),
        new Paragraph({
          children: [new TextRun({ text: "Plain bold English text", bold: true })],
        }),
        // RTL paragraph with bold Urdu — testing whether plain bold:true
        // is enough for RTL/complex-script text, or whether a separate
        // "complex script" flag is needed (this is the actual open
        // question the spike needs to answer, not assume).
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "یہ بولڈ اردو متن ہے", bold: true, italics: true })],
        }),
        new Paragraph({
          bidirectional: true,
          children: [
            new ExternalHyperlink({
              link: "https://qalamworks.com",
              children: [new TextRun({ text: "قلم ورکس ویب سائٹ", style: "Hyperlink" })],
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "spike-bullet-list", level: 0 },
          children: [new TextRun("Bullet item one")],
        }),
        new Paragraph({
          numbering: { reference: "spike-numbered-list", level: 0 },
          children: [new TextRun("Numbered item one")],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun("Centered text")],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  writeFileSync("/tmp/docx-spike-output.docx", buffer);
  console.log("Wrote /tmp/docx-spike-output.docx");
});
