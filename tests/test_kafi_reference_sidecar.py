"""All tests use synthetic Arabic strings and fake source identities; no private book text."""
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "kafi-reference-sidecar.py"
spec = importlib.util.spec_from_file_location("kafi_ref_audit", SCRIPT)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def build_zip(path):
    sources = []
    with ZipFile(path, "w") as z:
        for volume in range(1, 9):
            source_id = f"kafi-v{volume}-ar"
            sources.append({"id": source_id, "book": "kafi", "language": "ar",
                            "sha256": hashlib.sha256(source_id.encode()).hexdigest()})
            rid = f"{source_id}:chapter:1"
            p = {"id": f"{rid}:p1", "text": "۱ ـ هذا نص عربي افتراضي للاختبار فقط"}
            record = {
                "id": rid, "sourceId": source_id, "kind": "chapter",
                "paragraphs": [p], "textSha256": hashlib.sha256(p["text"].encode()).hexdigest(),
                "reference": {"printPage": None, "kafi": {"volume": volume, "bookTitle": None,
                                "chapterTitle": None, "sourceParagraphs": [1]}}
            }
            z.writestr(source_id + ".json.gz",
                       gzip.compress(json.dumps([record], ensure_ascii=False).encode()))
        z.writestr("manifest.json", json.dumps({
            "format": "qalam-foundational-corpus", "version": 1,
            "sources": sources, "recordCount": 8
        }))


class SidecarTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.path = Path(self.tempdir.name) / "synthetic.zip"
        build_zip(self.path)
        self.fingerprint, self.corpus = audit.source_records(self.path)
        self.sidecar = audit.create_queue(self.fingerprint, self.corpus, 4)

    def tearDown(self):
        self.tempdir.cleanup()

    def test_queue_has_all_volumes_and_no_prose_or_fake_references(self):
        self.assertEqual(len(self.sidecar["entries"]), 8)
        self.assertEqual({r["volume"] for r in self.sidecar["entries"]}, set(range(1, 9)))
        payload = json.dumps(self.sidecar, ensure_ascii=False)
        self.assertNotIn("افتراضي", payload)
        self.assertTrue(all(r["print_page"] is None and r["book_title"] is None
                            and r["status"] == "pending" for r in self.sidecar["entries"]))
        self.assertEqual(audit.validate(self.sidecar, self.fingerprint, self.corpus)["status"], "valid-structure")

    def test_rejects_wrong_archive_or_source_identity(self):
        copy = json.loads(json.dumps(self.sidecar))
        copy["archive_sha256"] = "0" * 64
        self.assertEqual(audit.validate(copy, self.fingerprint, self.corpus)["errors"], ["archive-fingerprint-mismatch"])
        copy = json.loads(json.dumps(self.sidecar))
        copy["entries"][0]["record_sha256"] = "0" * 64
        self.assertEqual(audit.validate(copy, self.fingerprint, self.corpus)["status"], "invalid")

    def test_rejects_missing_edition_and_invented_page_claim(self):
        entry = self.sidecar["entries"][0]
        entry.update({"status": "reviewed", "print_page": 42})
        codes = [x["code"] for x in audit.validate(self.sidecar, self.fingerprint, self.corpus)["errors"]]
        self.assertIn("evidence-or-edition-missing", codes)
        entry.update({"edition": "Verified printed edition name",
                      "evidence_url": "https://example.org/unsupported"})
        codes = [x["code"] for x in audit.validate(self.sidecar, self.fingerprint, self.corpus)["errors"]]
        self.assertIn("evidence-or-edition-missing", codes)

    def test_rejects_unmatched_local_number(self):
        entry = self.sidecar["entries"][0]
        entry.update({"status": "reviewed", "printed_local_number": 77,
                      "edition": "Printed Arabic edition, volume 1",
                      "evidence_url": "https://lib.eshia.ir/12345/1/1"})
        codes = [x["code"] for x in audit.validate(self.sidecar, self.fingerprint, self.corpus)["errors"]]
        self.assertIn("printed-number-mismatch", codes)

    def test_accepts_structurally_anchored_review_but_does_not_certify_edition(self):
        entry = self.sidecar["entries"][0]
        entry.update({"status": "reviewed", "printed_local_number": 1,
                      "edition": "Printed Arabic edition, volume 1",
                      "evidence_url": "https://ar.lib.eshia.ir/12345/1/1"})
        report = audit.validate(self.sidecar, self.fingerprint, self.corpus)
        self.assertEqual(report["status"], "valid-structure")
        self.assertEqual(report["reviewed"], 1)
        self.assertIn("not independently checked", report["note"])


if __name__ == "__main__":
    unittest.main()
