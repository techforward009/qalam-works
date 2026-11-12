"""Fixture-only tests. No private archive, network, or model needed."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "audit-khateeb-corpus.py"


def make_archive(path, tamper=False, omit=False):
    record_id = "kafi-v1-ar:chapter:0"
    text = "عربی کی فرضی آزمائشی عبارت، حدیث نہیں"
    entry = {"id": record_id, "sourceId": "kafi-v1-ar",
             "paragraphs": [{"id": record_id + ":p1", "text": text}],
             "textSha256": "0" * 64 if tamper else hashlib.sha256(text.encode()).hexdigest(),
             "reference": {"printPage": None, "kafi": {"bookTitle": None, "chapterTitle": None}}}
    manifest = {"format": "qalam-foundational-corpus", "version": 1, "recordCount": 1,
                "sources": [{"id": "kafi-v1-ar", "book": "kafi", "language": "ar"}]}
    with ZipFile(path, "w") as archive:
        archive.writestr("manifest.json", json.dumps(manifest))
        if not omit:
            archive.writestr("kafi-v1-ar.json.gz", gzip.compress(json.dumps([entry]).encode()))


def run_audit(path):
    proc = subprocess.run([sys.executable, str(SCRIPT), str(path)], capture_output=True,
                          text=True, check=False, timeout=30)
    return proc.returncode, json.loads(proc.stdout)


class AuditTests(unittest.TestCase):
    def test_healthy_archive_and_missing_reference_metadata(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "valid.zip"
            make_archive(path)
            code, data = run_audit(path)
            self.assertEqual(code, 0)
            self.assertEqual(data["records"], 1)
            self.assertEqual(data["paragraphs"], 1)
            self.assertEqual(data["errors"], [])
            self.assertEqual(data["sources"][0]["missing_print_page_records"], 1)
            self.assertEqual(data["sources"][0]["missing_kafi_book_title_records"], 1)

    def test_modified_text_digest_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "bad.zip"
            make_archive(path, tamper=True)
            code, data = run_audit(path)
            self.assertEqual(code, 1)
            self.assertEqual(data["record_hash_errors"], 1)
            self.assertEqual(data["errors"][0]["code"], "integrity-check-failed")

    def test_missing_member_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "missing.zip"
            make_archive(path, omit=True)
            code, data = run_audit(path)
            self.assertEqual(code, 1)
            self.assertEqual(data["errors"][0]["code"], "manifest-archive-members-mismatch")


if __name__ == "__main__":
    unittest.main()
