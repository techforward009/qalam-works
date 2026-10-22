#!/usr/bin/env python3
"""Read-only audit of Qalam foundational corpus ZIP. Outputs aggregates, never source prose.

Python 3.9+, standard library. Does not connect to a network, authenticate or upload.
Not a scholarly source verification or a copyright clearance.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import zipfile
import zlib

MAX_PART = 3 * 1024 * 1024
MAX_RAW = 16 * 1024 * 1024
PRINTED_NUMBER = re.compile(r"^\s*[0-9۰-۹٠-٩]+\s*[ـ–—.\-]")


def unpack_gzip(raw):
    if len(raw) > MAX_PART:
        raise ValueError("compressed-source-too-large")
    inflater = zlib.decompressobj(16 + zlib.MAX_WBITS)
    output = inflater.decompress(raw, MAX_RAW + 1)
    if len(output) > MAX_RAW:
        raise ValueError("decompressed-source-too-large")
    output += inflater.flush(MAX_RAW + 1 - len(output))
    if len(output) > MAX_RAW or not inflater.eof or inflater.unused_data:
        raise ValueError("invalid-gzip-or-size")
    return output


def audit_archive(path):
    result = {"format": "qalam-corpus-audit-v1", "archive_bytes": path.stat().st_size,
              "errors": [], "sources": [], "records": 0, "paragraphs": 0,
              "record_hash_errors": 0, "empty_record_count": 0}
    try:
        with zipfile.ZipFile(path) as archive:
            if "manifest.json" not in archive.namelist():
                raise ValueError("manifest-missing")
            if archive.getinfo("manifest.json").file_size > 256000:
                raise ValueError("manifest-too-large")
            manifest = json.loads(archive.read("manifest.json"))
            if manifest.get("format") != "qalam-foundational-corpus" or manifest.get("version") != 1:
                raise ValueError("unexpected-manifest")
            sources = manifest.get("sources")
            if not isinstance(sources, list) or not sources or len(sources) > 30:
                raise ValueError("invalid-source-list")
            expected = {"manifest.json"}
            for source in sources:
                source_id = source.get("id") if isinstance(source, dict) else None
                if not isinstance(source_id, str) or not re.fullmatch(r"[a-z0-9-]{1,70}", source_id):
                    raise ValueError("invalid-source-id")
                expected.add(source_id + ".json.gz")
            if len(expected) != len(sources) + 1 or set(archive.namelist()) != expected:
                raise ValueError("manifest-archive-members-mismatch")
            result["manifest_record_count"] = manifest.get("recordCount")
            result["manifest_source_count"] = len(sources)
            for source in sources:
                source_id = source["id"]
                records = json.loads(unpack_gzip(archive.read(source_id + ".json.gz")))
                if not isinstance(records, list):
                    raise ValueError("invalid-source-record-list")
                item = {"source_id": source_id, "language": source.get("language"),
                        "records": len(records), "paragraphs": 0,
                        "missing_print_page_records": 0, "missing_kafi_book_title_records": 0,
                        "missing_kafi_chapter_title_records": 0,
                        "numbered_paragraph_starts": 0, "empty_records": 0,
                        "hash_errors": 0, "structure_errors": 0}
                known = set()
                for record in records:
                    if not isinstance(record, dict):
                        item["structure_errors"] += 1
                        continue
                    record_id = record.get("id")
                    paragraphs = record.get("paragraphs")
                    if (not isinstance(record_id, str) or record_id in known
                            or record.get("sourceId") != source_id or not isinstance(paragraphs, list)):
                        item["structure_errors"] += 1
                        continue
                    known.add(record_id)
                    if not all(isinstance(p, dict) and p.get("id") == record_id + ":p" + str(i + 1)
                               and isinstance(p.get("text"), str) for i, p in enumerate(paragraphs)):
                        item["structure_errors"] += 1
                        continue
                    text = "\n".join(p["text"] for p in paragraphs)
                    digest = hashlib.sha256(text.encode()).hexdigest()
                    if record.get("textSha256") != digest:
                        item["hash_errors"] += 1
                    if not text.strip():
                        item["empty_records"] += 1
                    item["paragraphs"] += len(paragraphs)
                    reference = record.get("reference")
                    if not isinstance(reference, dict):
                        item["structure_errors"] += 1
                        continue
                    if reference.get("printPage") is None:
                        item["missing_print_page_records"] += 1
                    if source.get("book") == "kafi":
                        kafi = reference.get("kafi")
                        if not isinstance(kafi, dict):
                            item["structure_errors"] += 1
                            continue
                        item["missing_kafi_book_title_records"] += kafi.get("bookTitle") is None
                        item["missing_kafi_chapter_title_records"] += kafi.get("chapterTitle") is None
                        item["numbered_paragraph_starts"] += sum(
                            bool(PRINTED_NUMBER.match(p["text"])) for p in paragraphs)
                result["records"] += item["records"]
                result["paragraphs"] += item["paragraphs"]
                result["record_hash_errors"] += item["hash_errors"]
                result["empty_record_count"] += item["empty_records"]
                if item["hash_errors"] or item["structure_errors"]:
                    result["errors"].append({"source_id": source_id,
                                             "code": "integrity-check-failed",
                                             "count": item["hash_errors"] + item["structure_errors"]})
                result["sources"].append(item)
            if result["records"] != result["manifest_record_count"]:
                result["errors"].append({"code": "record-count-mismatch"})
    except (ValueError, zipfile.BadZipFile, KeyError, UnicodeDecodeError, json.JSONDecodeError, zlib.error) as exc:
        allowed = {"manifest-missing", "manifest-too-large", "unexpected-manifest",
                   "invalid-source-list", "invalid-source-id", "invalid-source-record-list",
                   "manifest-archive-members-mismatch", "compressed-source-too-large",
                   "decompressed-source-too-large", "invalid-gzip-or-size"}
        result["errors"].append({"code": str(exc) if isinstance(exc, ValueError) and str(exc) in allowed
                                 else "archive-parse-failed"})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    if not args.archive.is_file():
        print('{"errors":[{"code":"file-unavailable"}]}')
        return 2
    report = audit_archive(args.archive)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
