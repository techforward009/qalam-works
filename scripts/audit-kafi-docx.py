"""Audit supplied Kafi volumes without changing text or assigning canonical numbers."""
import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def normalize_heading(text):
    return "".join(c for c in text if unicodedata.category(c) != "Mn").strip()


def audit(path):
    with ZipFile(path) as archive:
        document = ElementTree.fromstring(archive.read("word/document.xml"))
    paragraphs = [
        "".join(node.text or "" for node in paragraph.findall(".//w:t", NS))
        for paragraph in document.findall("w:body/w:p", NS)
    ]
    books, chapters, numbered = [], [], []
    for index, text in enumerate(paragraphs, 1):
        normalized = normalize_heading(text)
        if len(text) < 300 and normalized.startswith("كتاب "):
            books.append(index)
        elif len(text) < 300 and re.match(r"^باب(?:\s|$)", normalized):
            chapters.append(index)
        match = re.match(r"^\s*(\d+)\s*[ـ–—.\-]", text)
        if match:
            numbered.append({"paragraph": index, "printedNumber": int(match[1])})
    warnings = []
    if not books:
        warnings.append("no-explicit-book-heading: do not infer a book title")
    if not chapters:
        warnings.append("no-explicit-chapter-heading: use volume and verified printed number")
    if any(len(text) > 8000 for text in paragraphs):
        warnings.append("contains-paragraphs-exceeding-former-search-cutoff")
    return {
        "filename": path.name,
        "sourceSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "paragraphTextSha256": hashlib.sha256("\n".join(paragraphs).encode()).hexdigest(),
        "paragraphCount": len(paragraphs),
        "characterCount": sum(map(len, paragraphs)),
        "maxParagraphCharacters": max(map(len, paragraphs), default=0),
        "bookHeadingParagraphs": books,
        "chapterHeadingParagraphs": chapters,
        "numberedParagraphStarts": numbered,
        "warnings": warnings,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_directory", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    paths = [args.source_directory / f"al-kafi-vol{volume}-arabic.docx" for volume in range(1, 9)]
    missing = [path.name for path in paths if not path.is_file()]
    if missing:
        parser.error("Missing volumes: " + ", ".join(missing))
    report = {"format": "qalam-kafi-source-audit", "version": 1, "volumes": [audit(path) for path in paths]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"volumes": len(paths), "paragraphs": sum(v["paragraphCount"] for v in report["volumes"]), "output": str(args.output)}))


if __name__ == "__main__":
    main()
