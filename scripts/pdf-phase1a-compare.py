#!/usr/bin/env python3
"""Synthetic PDF baseline comparison. Evidence only; not a parity oracle."""
import json, re, subprocess, os, statistics, difflib
from pathlib import Path
from xml.etree import ElementTree as ET
from PIL import Image, ImageChops

BASE=Path("artifacts/pdf-phase1a")
report=json.loads((BASE/"baseline.json").read_text())
def lines(xmlname):
    if not xmlname.exists(): return []
    try:
        root=ET.fromstring(xmlname.read_text())
        result=[]
        for el in root.iter():
            if el.tag.rsplit("}",1)[-1]=="line":
                words=[n for n in el.iter() if n.tag.rsplit("}",1)[-1]=="word"]
                text=" ".join((n.text or "") for n in words)
                result.append(dict(text=text,top=float(el.attrib.get("yMin",0)),left=float(el.attrib.get("xMin",0))))
        return result
    except Exception: return []
def diff_images(a,b,tag):
    try:
        subprocess.run(["pdftoppm","-f","1","-l","1","-singlefile","-r","96","-png",str(a),str(BASE/(tag+"-browser-p1"))],check=True,capture_output=True,timeout=90)
        subprocess.run(["pdftoppm","-f","1","-l","1","-singlefile","-r","96","-png",str(b),str(BASE/(tag+"-server-p1"))],check=True,capture_output=True,timeout=90)
        im1=Image.open(BASE/(tag+"-browser-p1.png")).convert("RGB")
        im2=Image.open(BASE/(tag+"-server-p1.png")).convert("RGB")
        size=(max(im1.width,im2.width),max(im1.height,im2.height))
        p=Image.new("RGB",size,"white");p.paste(im1,(0,0));q=Image.new("RGB",size,"white");q.paste(im2,(0,0))
        d=ImageChops.difference(p,q)
        mask=d.convert("L").point(lambda x:255 if x>=24 else 0)
        bbox=mask.getbbox()
        count=sum(1 for x in mask.getdata() if x>0)
        d.save(BASE/(tag+"-absolute-pixel-difference.png"))
        return {"resolutionDpi":96,"pixelsDifferingOver24":count,"percentDifferentOver24":round(count/(size[0]*size[1])*100,3),"differenceBoundingBoxPx":bbox,"imageSizePx":size}
    except Exception as e: return {"status":"NOT VERIFIED","error":str(e)}
out={}
for s in report["samples"]:
    name=s["id"]; a=BASE/(name+"-browser-print.pdf");b=BASE/(name+"-server-download.pdf")
    if not (a.exists() and b.exists()):
        out[name]={"status":"NOT VERIFIED","reason":"Both PDFs not available: "+str(s.get("warnings",[]))}
        continue
    ll=lines(Path(str(a)+".bbox.html")); rr=lines(Path(str(b)+".bbox.html"))
    n=min(len(ll),len(rr))
    dy=[abs(ll[i]["top"]-rr[i]["top"]) for i in range(n)]
    ta=Path(str(a)+".txt").read_text(errors="replace") if Path(str(a)+".txt").exists() else ""
    tb=Path(str(b)+".txt").read_text(errors="replace") if Path(str(b)+".txt").exists() else ""
    ca=" ".join(ta.split());cb=" ".join(tb.split())
    widths=[s["pdfs"][key]["pageSizesPt"][0]["w"] for key in ["browser","server"]]
    out[name]={
        "status":"MEASURED",
        "pageCountA":s["pdfs"]["browser"]["pageCount"],
        "pageCountB":s["pdfs"]["server"]["pageCount"],
        "pageWidthDifferencePt":round(abs(widths[0]-widths[1]),4),
        "printedTextSimilarity":round(difflib.SequenceMatcher(None,ca,cb,autojunk=False).ratio(),5),
        "noteText":"Similarity compares pdftotext extractions, not original stored Unicode; shaping and extraction order can distort it.",
        "page1Raster":diff_images(a,b,name),
        "lineCountA":len(ll),"lineCountB":len(rr),
        "lineMatchedByIndex":n,
        "lineTopAbsoluteDifferenceMedianPt":round(statistics.median(dy),3) if dy else None,
        "lineTopAbsoluteDifferenceMaxPt":round(max(dy),3) if dy else None,
        "noteLines":"Line positions matched by index, not identical textual identity. Only a coarse disparity indicator."
    }
(BASE/"comparison.json").write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps(out,ensure_ascii=False,indent=2))
