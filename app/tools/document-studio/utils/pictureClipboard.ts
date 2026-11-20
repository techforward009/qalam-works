import type { StudioFrame } from "../components/StudioObjectLayer";
import { fitPictureInBox } from "./pictureFit";

export function copyFramesToClipboard(frames: readonly StudioFrame[]): StudioFrame[] {
  return frames.map((frame) => ({
    ...frame,
    ...(frame.paragraphAligns ? { paragraphAligns: [...frame.paragraphAligns] } : {}),
  }));
}

export function pasteImageFromCopiedFrames(
  target: StudioFrame,
  copied: readonly StudioFrame[],
): StudioFrame | null {
  const source = copied.find((frame) => Boolean(frame.imageSrc));
  if (!source?.imageSrc) return null;
  const fit =
    source.imageNaturalW && source.imageNaturalH
      ? fitPictureInBox(target.wMm, target.hMm, source.imageNaturalW, source.imageNaturalH)
      : {
          x: source.imageXMm ?? 0,
          y: source.imageYMm ?? 0,
          w: source.imageWMm ?? target.wMm,
          h: source.imageHMm ?? target.hMm,
        };
  return {
    ...target,
    imageSrc: source.imageSrc,
    imageNaturalW: source.imageNaturalW,
    imageNaturalH: source.imageNaturalH,
    imageXMm: fit.x,
    imageYMm: fit.y,
    imageWMm: fit.w,
    imageHMm: fit.h,
  };
}

export function clearPictureFromFrame(target: StudioFrame): StudioFrame {
  const {
    imageSrc: _imageSrc,
    imageNaturalW: _imageNaturalW,
    imageNaturalH: _imageNaturalH,
    imageXMm: _imageXMm,
    imageYMm: _imageYMm,
    imageWMm: _imageWMm,
    imageHMm: _imageHMm,
    angle2Deg: _angle2Deg,
    ...rest
  } = target;
  return rest;
}

export function cloneCopiedFramesForPaste(
  copied: readonly StudioFrame[],
  createId: () => string,
  offsetMm = 5,
): StudioFrame[] {
  return copied.map((frame) => ({
    ...frame,
    ...(frame.paragraphAligns ? { paragraphAligns: [...frame.paragraphAligns] } : {}),
    id: createId(),
    xMm: frame.xMm + offsetMm,
    yMm: frame.yMm + offsetMm,
  }));
}
