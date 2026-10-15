#!/usr/bin/env python3
"""Private, read-only Kafi reference review queue and sidecar structural validator.

Standard library only. Never uploads a book, prints prose, or changes source records.
An evidence URL is an editor's claim, NOT automatic verification of a print edition.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit
from zipfile import ZipFile

MAX_ARCHIVE = 8 * 1024 * 1024
MAX_PART = 3 * 1024 * 1024
MAX_RAW = 16 * 1024 * 1024
PRINTED = re.compile(r"^\s*([0-9۰-۹٠-٩]+)\s*[ـ–—.\-]")
EXPECTED = {f"kafi-v{v}-ar" for v in range(1, 9)}
FIELDS = {"book_title", "chapter_title", "print_page", "printed_local_number"}


def number(text):
    match = PRINTED.match(text)
    if not match:
        return None
    return int(match.group(1).translate(str.maketrans(
        "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")))


def source_records(path):
    if not path.is_file() or path.stat().st_size > MAX_ARCHIVE:
        raise ValueError("invalid-archive-size")
    raw_archive = path.read_bytes()
    result = {}
    with ZipFile(path) as z:
        if z.getinfo("manifest.json").file_size > 256_000:
            raise ValueError("manifest-too-large")
        manifest = json.loads(z.read("manifest.json"))
        sources = manifest.get("sources", [])
        if manifest.get("format") != "qalam-foundational-corpus" or manifest.get("version") != 1:
            raise ValueError("invalid-manifest")
        found = {s["id"] for s in sources if s.get("book") == "kafi"}
        if found != EXPECTED:
            raise ValueError("kafi-sources-incomplete")
        for s in sources:
            if s["id"] not in EXPECTED:
                continue
            name = s["id"] + ".json.gz"
            if z.getinfo(name).file_size > MAX_PART:
                raise ValueError("compressed-part-too-large")
            # Bound the uncompressed payload before allocating large outputs.
            decompressor = __import__("zlib").decompressobj(16 + __import__("zlib").MAX_WBITS)
            data = decompressor.decompress(z.read(name), MAX_RAW + 1)
            if len(data) > MAX_RAW or not decompressor.eof or decompressor.unused_data:
                raise ValueError("decompression-limit-or-corruption")
            records = json.loads(data)
            if not isinstance(records, list) or len(records) > 3000:
                raise ValueError("invalid-record-list")
            per_source = {}
            for record in records:
                identifier = record["id"]
                if identifier in per_source or record.get("sourceId") != s["id"]:
                    raise ValueError("record-identity")
                paragraphs = record["paragraphs"]
                if not isinstance(paragraphs, list) or not all(
                    p["id"] == identifier + ":p" + str(i + 1) and isinstance(p["text"], str)
                    for i, p in enumerate(paragraphs)
                ):
                    raise ValueError("paragraph-identity")
                digest = hashlib.sha256("\n".join(p["text"] for p in paragraphs).encode()).hexdigest()
                if digest != record["textSha256"]:
                    raise ValueError("record-integrity")
                per_source[identifier] = record
            result[s["id"]] = {"sha": s["sha256"], "records": per_source}
    return hashlib.sha256(raw_archive).hexdigest(), result


def new_entry(source_id, source, record, paragraph):
    k = record["reference"]["kafi"]
    return {
        "source_id": source_id,
        "source_sha256": source["sha"],
        "record_id": record["id"],
        "record_sha256": record["textSha256"],
        "paragraph_id": paragraph["id"],
        "volume": k["volume"],
        "missing_book_title": k["bookTitle"] is None,
        "missing_chapter_title": k["chapterTitle"] is None,
        "status": "pending",
        "edition": None,
        "evidence_url": None,
        "book_title": None,
        "chapter_title": None,
        "print_page": None,
        "printed_local_number": None,
    }


def create_queue(archive_sha, corpus, per_volume):
    entries = []
    for source_id, source in sorted(corpus.items()):
        all_records = [r for r in source["records"].values() if r["kind"] != "front-matter"]
        choices = all_records if source_id == "kafi-v8-ar" else all_records[:per_volume]
        for record in choices:
            ps = record["paragraphs"]
            if not ps:
                continue
            paragraph = next((p for p in ps if number(p["text"]) is not None), ps[0])
            entries.append(new_entry(source_id, source, record, paragraph))
    return {"format": "qalam-kafi-reference-sidecar", "version": 1,
            "archive_sha256": archive_sha, "entries": entries}


def valid_evidence(value):
    if not isinstance(value, str) or len(value) > 1024:
        return False
    p = urlsplit(value)
    return p.scheme == "https" and p.hostname in {
        "lib.eshia.ir", "ar.lib.eshia.ir", "al-islam.org", "www.al-islam.org"
    } and not p.username and not p.password


def validate(sidecar, archive_sha, corpus):
    errors = []
    if not isinstance(sidecar, dict) or sidecar.get("format") != "qalam-kafi-reference-sidecar" or sidecar.get("version") != 1:
        return {"status": "invalid", "errors": ["invalid-sidecar-format"]}
    if sidecar.get("archive_sha256") != archive_sha:
        return {"status": "invalid", "errors": ["archive-fingerprint-mismatch"]}
    entries = sidecar.get("entries")
    if not isinstance(entries, list) or len(entries) > 3000:
        return {"status": "invalid", "errors": ["invalid-entry-count"]}
    seen = set()
    reviewed = 0
    pending = 0
    for i, e in enumerate(entries):
        if not isinstance(e, dict):
            errors.append({"row": i + 1, "code": "invalid-entry"})
            continue
        sid, rid, pid = e.get("source_id"), e.get("record_id"), e.get("paragraph_id")
        key = (sid, rid, pid)
        if key in seen:
            errors.append({"row": i + 1, "code": "duplicate"})
        seen.add(key)
        source = corpus.get(sid)
        record = source and source["records"].get(rid)
        para = next((p for p in record["paragraphs"] if p["id"] == pid), None) if record else None
        if (not source or not record or not para
                or e.get("source_sha256") != source["sha"]
                or e.get("record_sha256") != record["textSha256"]
                or e.get("volume") != record["reference"]["kafi"]["volume"]):
            errors.append({"row": i + 1, "code": "source-anchor-mismatch"})
            continue
        k = record["reference"]["kafi"]
        if (e.get("missing_book_title") is not (k["bookTitle"] is None)
                or e.get("missing_chapter_title") is not (k["chapterTitle"] is None)):
            errors.append({"row": i + 1, "code": "metadata-anchor-mismatch"})
        status = e.get("status")
        if status == "pending":
            pending += 1
            if any(e.get(f) is not None for f in FIELDS) or e.get("edition") is not None or e.get("evidence_url") is not None:
                errors.append({"row": i + 1, "code": "unreviewed-field"})
            continue
        if status != "reviewed":
            errors.append({"row": i + 1, "code": "unknown-review-status"})
            continue
        reviewed += 1
        if (not isinstance(e.get("edition"), str) or not 8 <= len(e["edition"].strip()) <= 250
                or not valid_evidence(e.get("evidence_url"))):
            errors.append({"row": i + 1, "code": "evidence-or-edition-missing"})
        if not any(e.get(f) is not None for f in FIELDS):
            errors.append({"row": i + 1, "code": "no-reviewed-field"})
        for f, original in (("book_title", k["bookTitle"]), ("chapter_title", k["chapterTitle"])):
            value = e.get(f)
            if value is not None and (not isinstance(value, str) or not 2 <= len(value.strip()) <= 300):
                errors.append({"row": i + 1, "code": "invalid-heading-field"})
            if value is not None and original is not None and value != original:
                errors.append({"row": i + 1, "code": "original-heading-conflict"})
        page = e.get("print_page")
        if page is not None and (isinstance(page, bool) or not isinstance(page, int) or not 1 <= page <= 99999):
            errors.append({"row": i + 1, "code": "invalid-print-page"})
        elif page is not None and valid_evidence(e.get("evidence_url")):
            # An online page-number assertion must point to that same volume/page,
            # not merely to an unrelated page on a trusted host. This is still a
            # structural consistency check, NOT a textual/scholarly verification.
            parsed_url = urlsplit(e["evidence_url"])
            if parsed_url.hostname not in {"lib.eshia.ir", "ar.lib.eshia.ir"}:
                errors.append({"row": i + 1, "code": "print-page-needs-page-specific-source"})
            else:
                parts = parsed_url.path.strip("/").split("/")
                if (len(parts) != 3 or not all(part.isascii() and part.isdecimal() for part in parts)
                        or int(parts[1]) != e["volume"] or int(parts[2]) != page):
                    errors.append({"row": i + 1, "code": "edition-url-page-mismatch"})
        printed_num = e.get("printed_local_number")
        if printed_num is not None and (isinstance(printed_num, bool) or printed_num != number(para["text"])):
            errors.append({"row": i + 1, "code": "printed-number-mismatch"})
    return {"status": "valid-structure" if not errors else "invalid",
            "entries": len(entries), "pending": pending, "reviewed": reviewed,
            "errors": errors[:30], "error_count": len(errors),
            "note": "Evidence URL and metadata are not independently checked against a printed edition."}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("archive", type=Path)
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument("--queue", type=Path, help="Write private pending JSON (DO NOT commit)")
    group.add_argument("--check", type=Path, help="Validate a prepared JSON sidecar")
    p.add_argument("--per-volume", type=int, default=4)
    a = p.parse_args()
    try:
        if not 1 <= a.per_volume <= 20:
            raise ValueError("per-volume-out-of-range")
        fingerprint, corpus = source_records(a.archive)
        if a.queue:
            queue = create_queue(fingerprint, corpus, a.per_volume)
            if a.queue.exists():
                raise ValueError("output-exists")
            a.queue.write_text(json.dumps(queue, ensure_ascii=False, indent=2), encoding="utf-8")
            result = {"status": "pending-review-queue-created", "entries": len(queue["entries"]),
                      "destination": "local-path-supplied-by-caller", "contains_source_prose": False}
        else:
            if a.check.stat().st_size > 2_000_000:
                raise ValueError("sidecar-too-large")
            result = validate(json.loads(a.check.read_text(encoding="utf-8")), fingerprint, corpus)
        print(json.dumps(result, ensure_ascii=False))
        return 1 if result["status"] == "invalid" else 0
    except (ValueError, KeyError, TypeError, OSError, json.JSONDecodeError, __import__("zipfile").BadZipFile) as err:
        print(json.dumps({"status": "invalid", "reason": str(err)[:120]}, ensure_ascii=False))
        return 2


if __name__ == "__main__":
    sys.exit(main())
