/**
 * Pure helper for scaling a picture to FIT inside a box keeping aspect ratio, centered.
 *
 * @param boxW Box width (e.g. in mm)
 * @param boxH Box height (e.g. in mm)
 * @param imgW Image natural width (e.g. in px)
 * @param imgH Image natural height (e.g. in px)
 * @returns { x, y, w, h } placement in same units as box, relative to top-left of box
 */
export function fitPictureInBox(
  boxW: number,
  boxH: number,
  imgW: number,
  imgH: number
): { x: number; y: number; w: number; h: number } {
  if (boxW <= 0 || boxH <= 0 || imgW <= 0 || imgH <= 0 || !Number.isFinite(boxW) || !Number.isFinite(boxH) || !Number.isFinite(imgW) || !Number.isFinite(imgH)) {
    return {
      x: 0,
      y: 0,
      w: Math.max(0, Number.isFinite(boxW) ? boxW : 0),
      h: Math.max(0, Number.isFinite(boxH) ? boxH : 0),
    };
  }

  const boxAspect = boxW / boxH;
  const imgAspect = imgW / imgH;

  if (boxAspect > imgAspect) {
    // Box is wider than image aspect ratio: fit height, center horizontally
    const scale = boxH / imgH;
    const w = imgW * scale;
    const h = boxH;
    const x = (boxW - w) / 2;
    const y = 0;
    return { x, y, w, h };
  } else {
    // Box is taller than (or equal to) image aspect ratio: fit width, center vertically
    const scale = boxW / imgW;
    const w = boxW;
    const h = imgH * scale;
    const x = 0;
    const y = (boxH - h) / 2;
    return { x, y, w, h };
  }
}
