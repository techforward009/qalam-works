"""Append all eight supplied Kafi volumes to the existing foundational archive."""
import argparse
import gzip
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile, ZIP_STORED

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def normalize(text):
    return "".join(c for c in text if unicodedata.category(c) != "Mn").strip()


def read_paragraphs(path):
    with ZipFile(path) as archive:
        root = ElementTree.fromstring(archive.read("word/document.xml"))
    if root.findall(".//w:tbl", NS) or root.findall(".//w:tab", NS) or root.findall(".//w:br", NS):
        raise ValueError(f"Unsupported structural content in {path.name}; review before conversion")
    return ["".join(node.text or "" for node in paragraph.findall(".//w:t", NS)) for paragraph in root.findall("w:body/w:p", NS)]


def build_volume(path, volume):
    paragraphs = read_paragraphs(path)
    source_id = f"kafi-v{volume}-ar"
    source = {"id": source_id, "book": "kafi", "language": "ar", "filename": path.name, "sha256": sha(path.read_bytes()), "translator": None}
    records, selected, positions = [], [], []
    book_title = chapter_title = section_title = None
    kind = "front-matter"

    def flush():
        if not positions:
            return
        ordinal = len(records) + 1
        record_id = f"{source_id}:{kind}:{ordinal}"
        record = {
            "id": record_id, "sourceId": source_id, "book": "kafi", "language": "ar", "kind": kind,
            "number": ordinal, "title": chapter_title or section_title or book_title or "مقدمة",
            "reference": {"sourceId": source_id, "section": kind, "number": ordinal,
                          "locator": f"word/document.xml paragraphs {positions[0]}-{positions[-1]}", "printPage": None,
                          "kafi": {"volume": volume, "bookTitle": book_title, "chapterTitle": chapter_title,
                                   "sectionTitle": section_title, "sourceParagraphs": positions.copy()}},
            "paragraphs": [{"id": f"{record_id}:p{index}", "text": text} for index, text in enumerate(selected, 1)],
            "textSha256": sha("\n".join(selected).encode()),
        }
        records.append(record)

    for position, text in enumerate(paragraphs, 1):
        normalized = normalize(text)
        heading = None
        if len(text) <= 300:
            if normalized.startswith("كتاب "):
                heading = "book"
            elif re.match(r"^باب(?:\s|$)", normalized):
                heading = "chapter"
            elif normalized.startswith("القسم "):
                heading = "section"
        if heading:
            flush()
            selected, positions = [], []
            if heading == "book":
                book_title, chapter_title, section_title, kind = text, None, None, "chapter"
            elif heading == "chapter":
                chapter_title, section_title, kind = text, None, "chapter"
            else:
                section_title, chapter_title, kind = text, None, "section"
        selected.append(text)
        positions.append(position)
    flush()
    restored = [paragraph["text"] for record in records for paragraph in record["paragraphs"]]
    if restored != paragraphs:
        raise ValueError(f"Paragraph preservation failed for {path.name}")
    return source, records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_archive", type=Path)
    parser.add_argument("source_directory", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--json-directory", type=Path)
    args = parser.parse_args()
    with ZipFile(args.base_archive) as archive:
        manifest = json.loads(archive.read("manifest.json"))
        expected = {"nahj-ar", "nahj-ur", "sahifa-ar", "sahifa-ur", "sahifa-en", "nahj-sermons-en", "nahj-letters-sayings-en"}
        if manifest.get("format") != "qalam-foundational-corpus" or manifest.get("version") != 1 or {s["id"] for s in manifest["sources"]} != expected:
            raise ValueError("The base must be the original complete seven-source archive")
        members = {source["id"]: archive.read(source["id"] + ".json.gz") for source in manifest["sources"]}
    base_count = sum(len(json.loads(gzip.decompress(raw))) for raw in members.values())
    if base_count != manifest["recordCount"]:
        raise ValueError("Base record count mismatch")
    for volume in range(1, 9):
        source, records = build_volume(args.source_directory / f"al-kafi-vol{volume}-arabic.docx", volume)
        manifest["sources"].append(source)
        manifest["recordCount"] += len(records)
        members[source["id"]] = gzip.compress(json.dumps(records, ensure_ascii=False, separators=(",", ":")).encode(), mtime=0)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(args.output, "w", compression=ZIP_STORED) as archive:
        archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False))
        for source_id, raw in members.items():
            archive.writestr(source_id + ".json.gz", raw)
    if args.json_directory:
        args.json_directory.mkdir(parents=True, exist_ok=True)
        (args.json_directory / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
        for source_id, raw in members.items():
            (args.json_directory / (source_id + ".json")).write_bytes(gzip.decompress(raw))
    print(json.dumps({"sources": len(manifest["sources"]), "records": manifest["recordCount"], "bytes": args.output.stat().st_size, "output": str(args.output)}))


if __name__ == "__main__":
    main()
