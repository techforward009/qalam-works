"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { StudioFrame } from "./StudioObjectLayer";
import { formatGeometryLength, parseGeometryLength } from "../utils/objectAttributes";
import { resolvedRunAroundClearance } from "../utils/runAround";
import { studioOverlayRoot } from "../utils/inpageToolbar";
import { ClassicSpinner, ClassicTitle, at, classicButton, useInPage2009Dialog } from "./inpage2009DialogChrome";

const MAX_MM = 2000;

type ClearanceKey = "runAroundLeftMm" | "runAroundRightMm" | "runAroundTopMm" | "runAroundBottomMm";

function readClearance(raw: string): number | null {
  const value = parseGeometryLength(raw);
  if (!Number.isFinite(value) || value < 0 || value > MAX_MM) return null;
  return value;
}

export function StudioRunAroundDialog({
  frame,
  onClose,
  onApply,
}: {
  frame: StudioFrame;
  onClose: () => void;
  onApply: (patch: Pick<StudioFrame, ClearanceKey>) => void;
}) {
  const clearance = resolvedRunAroundClearance(frame);
  const [top, setTop] = useState(formatGeometryLength(clearance.topMm));
  const [left, setLeft] = useState(formatGeometryLength(clearance.leftMm));
  const [right, setRight] = useState(formatGeometryLength(clearance.rightMm));
  const [bottom, setBottom] = useState(formatGeometryLength(clearance.bottomMm));
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const drag = useInPage2009Dialog<HTMLFormElement>(292, 188, 20);

  useEffect(() => {
    drag.dialogRef.current?.querySelector<HTMLInputElement>('[aria-label="Top"]')?.focus();
  }, [drag.dialogRef]);

  const apply = () => {
    const values = {
      runAroundTopMm: readClearance(top),
      runAroundLeftMm: readClearance(left),
      runAroundRightMm: readClearance(right),
      runAroundBottomMm: readClearance(bottom),
    };
    if (Object.values(values).some(value => value === null)) {
      setError("Enter a clearance from 0 to 2000 mm.");
      return;
    }
    onApply(values as Pick<StudioFrame, ClearanceKey>);
  };

  const key = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return createPortal(
    <div data-studio-dialog="en" data-studio-zoom-scope className="fixed inset-0 z-[120] grid place-items-center bg-black/30 p-3" onKeyDown={key} onMouseDown={event => event.stopPropagation()}>
      <form ref={drag.dialogRef} role="dialog" aria-modal="true" aria-label="Runaround" data-studio-runaround-dialog="true" data-inpage2009-dialog="true" dir="ltr" onSubmit={event => { event.preventDefault(); apply(); }} style={drag.style}>
        <ClassicTitle title="Runaround" onHelp={() => setHelp(true)} onClose={onClose} handleProps={drag.handleProps} />
        <fieldset role="group" aria-label="Outset" style={{ ...at(8, 36, 176, 112), margin: 0, padding: 0, border: "1px solid #a6a6a6", borderRightColor: "#fff", borderBottomColor: "#fff" }}>
          <legend style={{ marginLeft: 8, padding: "0 3px", background: "#f5f5f5" }}>Outset</legend>
        </fieldset>
        <span style={at(18, 52)}>Top:</span>
        <ClassicSpinner label="Top" box={[62, 48, 78, 20]} value={top} onChange={setTop} min={0} max={MAX_MM} step={0.01} unit="mm" selectOnFocus />
        <span style={at(18, 76)}>Left:</span>
        <ClassicSpinner label="Left" box={[62, 72, 78, 20]} value={left} onChange={setLeft} min={0} max={MAX_MM} step={0.01} unit="mm" selectOnFocus />
        <span style={at(18, 100)}>Right:</span>
        <ClassicSpinner label="Right" box={[62, 96, 78, 20]} value={right} onChange={setRight} min={0} max={MAX_MM} step={0.01} unit="mm" selectOnFocus />
        <span style={at(18, 124)}>Bottom:</span>
        <ClassicSpinner label="Bottom" box={[62, 120, 78, 20]} value={bottom} onChange={setBottom} min={0} max={MAX_MM} step={0.01} unit="mm" selectOnFocus />
        <button type="submit" style={{ ...classicButton, ...at(200, 48, 78, 23) }}>OK</button>
        <button type="button" onClick={onClose} style={{ ...classicButton, ...at(200, 78, 78, 23) }}>Cancel</button>
        <button type="button" onClick={() => setHelp(true)} style={{ ...classicButton, ...at(200, 108, 78, 23) }}>Help</button>
        {error ? <p role="alert" style={{ ...at(8, 156, 276, 28), margin: 0, color: "#800" }}>{error}</p> : null}
        {help && !error ? <p role="status" style={{ ...at(8, 156, 276, 28), margin: 0 }}>Empty band around the box, in millimetres. Format Object turns Run Around on or off.</p> : null}
      </form>
    </div>,
    studioOverlayRoot(),
  );
}
