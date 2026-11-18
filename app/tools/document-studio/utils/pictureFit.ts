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

/**
 * Screen pointer delta into picture-content axes, in millimetres.
 * imageXMm/imageYMm are in the frame's local space. The frame is drawn with
 * CSS rotate(-angle1Deg), so a positive angle is anticlockwise on a y-down screen.
 * Unrotated frames pass the delta through. pxPerMm converts pixels to millimetres.
 */
export function pictureContentDeltaMm(
  dxPx: number,
  dyPx: number,
  angle1Deg: number,
  pxPerMm: number,
): { xMm: number; yMm: number } {
  const theta = ((angle1Deg || 0) * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    xMm: (dxPx * cos - dyPx * sin) / pxPerMm,
    yMm: (dxPx * sin + dyPx * cos) / pxPerMm,
  };
}

/** Longest side of a stored picture, in pixels. Larger sources are scaled down. */
export const PICTURE_MAX_LONG_EDGE = 2000;
/** JPEG quality used when a picture is re-encoded. */
export const PICTURE_JPEG_QUALITY = 0.85;
/** Transparent PNGs at or under this size stay PNG; larger ones become JPEG. */
export const PICTURE_PNG_KEEP_BYTES = 2 * 1024 * 1024;
/** Source files above this size are rejected. Smaller files are downscaled instead. */
export const PICTURE_SOURCE_HARD_CAP_BYTES = 25 * 1024 * 1024;

/**
 * Pixel size after downscale. Does not upscale. Non-positive or non-finite
 * input returns zeros so callers can fail closed.
 */
export function pictureOutputSize(
  width: number,
  height: number,
  maxEdge = PICTURE_MAX_LONG_EDGE
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height) || !(maxEdge > 0) || !Number.isFinite(maxEdge)) {
    return { width: 0, height: 0 };
  }
  const long = Math.max(width, height);
  if (long <= maxEdge) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxEdge / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export type PictureEncoding = "png" | "jpeg";

/** PNG is kept only for a transparent image whose PNG payload still fits. */
export function pictureEncoding(input: { hasTransparency: boolean; pngBytes: number; maxBytes?: number }): PictureEncoding {
  const maxBytes = input.maxBytes ?? PICTURE_PNG_KEEP_BYTES;
  if (input.hasTransparency && input.pngBytes > 0 && input.pngBytes <= maxBytes) return "png";
  return "jpeg";
}
