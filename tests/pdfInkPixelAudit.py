"""Compare printed body pixels with the same vectors with the page clip removed.

Diagnostic PDFs only: this never alters the PDF returned by the export route.
Requires the optional local PDFium/Pillow/pypdf and Poppler test runtimes.
"""
import argparse
import collections
import json
from pathlib import Path
import subprocess
import unicodedata

import pypdfium2 as pdfium
from PIL import Image, ImageChops
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, RectangleObject

parser = argparse.ArgumentParser()
parser.add_argument("pdf", type=Path, nargs="?")
parser.add_argument("request", type=Path, nargs="?")
parser.add_argument("poppler", type=Path, nargs="?")
parser.add_argument("print_lines", type=Path, nargs="?")
parser.add_argument("--expect-clipping", action="store_true")
parser.add_argument("--self-test", action="store_true")
args = parser.parse_args()
mm = lambda value: float(str(value).removesuffix("mm")) * 72 / 25.4

def multiply(a, b):
    return (a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1],
            a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3],
            a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5])

def point(m, x, y):
    return (m[0]*x+m[2]*y+m[4], m[1]*x+m[3]*y+m[5])

def find_printable_clip(operations, expected, page_top, tolerance=1):
    ctm, stack, candidates = (1,0,0,1,0,0), [], []
    for i, (values, op) in enumerate(operations):
        if op == b"q": stack.append(ctm)
        elif op == b"Q":
            assert stack, "Unbalanced PDF graphics-state restore"
            ctm = stack.pop()
        elif op == b"cm": ctm = multiply(ctm, tuple(map(float, values)))
        elif op == b"re" and i + 2 < len(operations) and operations[i+1][1] in (b"W", b"W*") and operations[i+2][1] == b"n":
            x,y,w,h = map(float, values)
            corners = [point(ctm,x,y),point(ctm,x+w,y),point(ctm,x,y+h),point(ctm,x+w,y+h)]
            box = (min(p[0] for p in corners), min(p[1] for p in corners), max(p[0] for p in corners), max(p[1] for p in corners), page_top)
            if all(abs(actual - wanted) <= tolerance for actual, wanted in zip(box[:4], expected)):
                candidates.append((i+1, box))
    assert len(candidates) == 1, f"Expected exactly one exact-position printable clip, found {len(candidates)}"
    return candidates[0]

def clip_contract_self_test():
    expected = (72, 54, 540, 738)
    def clip(left=72, bottom=54):
        return [([left, bottom, 468, 684], b"re"), ([], b"W"), ([], b"n")]
    assert find_printable_clip(clip(), expected, 792)[1][:4] == expected
    transformed = [([], b"q"), ([1,0,0,1,72,54], b"cm"), ([0,0,468,684], b"re"), ([], b"W*"), ([], b"n"), ([], b"Q")]
    assert find_printable_clip(transformed, expected, 792)[1][:4] == expected
    for shifted in [clip(70,54), clip(74,54), clip(72,52), clip(72,56)]:
        try: find_printable_clip(shifted, expected, 792)
        except AssertionError: pass
        else: raise AssertionError("Translated same-size clip must fail")
    for invalid in [clip() + clip(), []]:
        try: find_printable_clip(invalid, expected, 792)
        except AssertionError: pass
        else: raise AssertionError("Ambiguous or missing clip must fail")
    print("clip-position-contract: 6 passed")

if args.self_test:
    clip_contract_self_test()
    raise SystemExit(0)

assert args.pdf and args.request and args.poppler and args.print_lines, "PDF, request, Poppler, and print-lines paths are required"
root = args.pdf.parent / (args.pdf.stem + "-ink-audit")
root.mkdir(exist_ok=True)
clip_boxes = []
clip_indexes = []
options_path = args.pdf.with_name(args.pdf.stem + "-options.json")
assert options_path.exists(), "Missing Puppeteer print options for clip validation"
print_options = json.loads(options_path.read_text(encoding="utf8"))
paper_width, paper_height = mm(print_options["width"]), mm(print_options["height"])
margin_left, margin_right = mm(print_options["margin"]["left"]), mm(print_options["margin"]["right"])
margin_top, margin_bottom = mm(print_options["margin"]["top"]), mm(print_options["margin"]["bottom"])

for page in PdfReader(args.pdf).pages:
    operations = ContentStream(page.get_contents(), page.pdf).operations
    page_left, page_bottom = float(page.mediabox.left), float(page.mediabox.bottom)
    expected = (page_left + margin_left, page_bottom + margin_bottom,
                page_left + paper_width - margin_right, page_bottom + paper_height - margin_top)
    clip_index, clip_box = find_printable_clip(operations, expected, float(page.mediabox.top))
    clip_indexes.append(clip_index); clip_boxes.append(clip_box)

for unclipped in [False, True]:
    reader = PdfReader(args.pdf)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    for page_index, page in enumerate(writer.pages):
        content = ContentStream(page.get_contents(), writer)
        body, depth, started = [], 0, False
        # Chromium prints body in the first top-level graphics state, followed
        # by a separate header/footer state. Keep only that body for comparison.
        for operation_index, (operands, operator) in enumerate(content.operations):
            if operator == b"q":
                depth += 1
                started = True
            if not (unclipped and operation_index == clip_indexes[page_index]):
                body.append((operands, operator))
            if operator == b"Q":
                depth -= 1
                if started and depth == 0:
                    break
        assert started and depth == 0, "Unexpected Chromium graphics-state layout"
        content.operations = body
        page.replace_contents(content)
        # Reveal ink outside the original paper, too. Both references use the
        # identical enlarged canvas, preserving vector coordinates and scale.
        page.mediabox = RectangleObject([-200, -200, float(page.mediabox.right) + 200, float(page.mediabox.top) + 200])
        page.cropbox = page.mediabox
    with (root / ("unclipped.pdf" if unclipped else "clipped.pdf")).open("wb") as output:
        writer.write(output)

clipped = pdfium.PdfDocument(root / "clipped.pdf")
unclipped = pdfium.PdfDocument(root / "unclipped.pdf")
original = pdfium.PdfDocument(args.pdf)
def walk(node):
    if node.get("type") == "hardBreak":
        return "\n"
    return node.get("text", "") + "".join(walk(child) for child in node.get("content", []))

expected_text = walk(json.loads(args.request.read_text(encoding="utf8"))["doc"])
actual_pages = [page.get_textpage().get_text_range() for page in clipped]
actual_text = "".join(actual_pages)
print_lines = json.loads(args.print_lines.read_text(encoding="utf8"))
# PDF text extractors return RTL glyph runs in visual order. The paginator's
# in-browser guard compares the original logical text byte-for-byte before
# printing; the final-PDF audit verifies character and punctuation preservation
# without imposing an invalid LTR ordering assumption on PDFium extraction.
visible = lambda text: collections.Counter(char for char in unicodedata.normalize("NFKC", text) if char.isalnum() or unicodedata.category(char).startswith("P"))
expected = visible(expected_text)
actual = visible(actual_text)
assigned_ids = [line["id"] for page in print_lines for line in page]
assert assigned_ids == list(range(len(assigned_ids))), "Visual-line IDs are duplicated, omitted, reordered, or assigned to multiple pages"
result = {"pages": len(original), "missing": dict(expected - actual), "extra": dict(actual - expected), "logical_text_guard": "in-browser exact source order, punctuation, and whitespace", "pdf_extraction_order_limitation": "Chromium emits positioned Nastaliq glyph fragments in visual/content-stream order; PDFium inserts boundaries between positioned glyphs. ToUnicode proves exact per-page character and punctuation inventory, while unique ordered visual-line ownership proves source/page order. Raw extraction cannot scientifically recover the original mixed-bidi logical sequence without external bidi metadata that PDF does not contain.", "visual_line_ownership": {"count": len(assigned_ids), "unique": len(set(assigned_ids)), "ordered": True}, "page_text": [], "blank_body_pages": [], "pdfium_edges": [], "poppler_edges": []}

def classify(first, second, box):
    delta = ImageChops.difference(first.convert("RGB"), second.convert("RGB"))
    left, bottom, right, top, page_top = box
    left_px, right_px = round((left + 200) * 2), round((right + 200) * 2)
    top_px, bottom_px = round((page_top + 200 - top) * 2), round((page_top + 200 - bottom) * 2)
    counts = {"top": 0, "bottom": 0, "left": 0, "right": 0, "interior": 0}
    pixels = delta.load()
    for y in range(delta.height):
        for x in range(delta.width):
            if max(pixels[x, y]) <= 16:
                continue
            outside = []
            if y < top_px: outside.append((top_px - y, "top"))
            if y >= bottom_px: outside.append((y - bottom_px + 1, "bottom"))
            if x < left_px: outside.append((left_px - x, "left"))
            if x >= right_px: outside.append((x - right_px + 1, "right"))
            counts[max(outside)[1] if outside else "interior"] += 1
    return counts

for index in range(len(original)):
    a = clipped[index].render(scale=2).to_pil()
    b = unclipped[index].render(scale=2).to_pil()
    result["pdfium_edges"].append(classify(a, b, clip_boxes[index]))
    if not ImageChops.invert(a.convert("RGB")).getbbox():
        result["blank_body_pages"].append(index + 1)
    if index < 3:
        original[index].render(scale=2).to_pil().save(root / f"pdfium-page-{index + 1}.png")
    for name in ["clipped", "unclipped"]:
        subprocess.run([str(args.poppler), "-f", str(index + 1), "-l", str(index + 1), "-singlefile", "-r", "144", "-png", str(root / f"{name}.pdf"), str(root / f"{name}-{index + 1}")], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    result["poppler_edges"].append(classify(Image.open(root / f"clipped-{index + 1}.png"), Image.open(root / f"unclipped-{index + 1}.png"), clip_boxes[index]))
    expected_page = "".join(line["text"] for line in print_lines[index])
    page_missing = visible(expected_page) - visible(actual_pages[index])
    page_extra = visible(actual_pages[index]) - visible(expected_page)
    result["page_text"].append({"page": index + 1, "visual_lines": print_lines[index], "expected": expected_page, "extracted": actual_pages[index], "missing": dict(page_missing), "extra": dict(page_extra)})
    if index < 3:
        subprocess.run([str(args.poppler), "-f", str(index + 1), "-l", str(index + 1), "-singlefile", "-r", "144", "-png", str(args.pdf), str(root / f"poppler-page-{index + 1}")], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

(root / "result.json").write_text(json.dumps(result, indent=2), encoding="utf8")
print(json.dumps(result, ensure_ascii=True))
lost = sum(v[edge] for renderer in [result["pdfium_edges"], result["poppler_edges"]] for v in renderer for edge in ["top", "bottom", "left", "right"])
if args.expect_clipping:
    assert lost > 0, "The original regression fixture must demonstrate clipped ink"
else:
    assert not result["missing"] and not result["extra"], "Body text was lost, duplicated, or punctuated incorrectly"
    assert all(not page["missing"] and not page["extra"] for page in result["page_text"]), "PDF page text does not match its assigned visual lines"
    assert not result["blank_body_pages"], "Unexpected blank body page"
    assert lost == 0, "Printed page clipping hides glyph ink"
