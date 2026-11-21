import type { StaticImageData } from "next/image";
import type { IsoDrawingData } from "@/components/iso/types";

/**
 * Each organizer's portrait: the photo, shown on hover, and the line drawing
 * made from it, shown at rest. To add someone:
 *
 * 1. Put their headshot in `src/assets/team/<id>.jpg` (id: the slug of their
 *    name, as `memberId` makes it).
 * 2. Draw it: `blender -b --factory-startup --python scripts/portraits/outline.py -- src/assets/team/<id>.jpg <id>`,
 *    which writes `src/components/team/portraits/<id>.ts`.
 * 3. Add a line for them below.
 *
 * Without an entry, the card shows the member's monogram, drawn in the same line.
 */
/** The part of the photo the drawing covers, as fractions of the photo's width and height. */
export type PortraitCrop = { x: number; y: number; width: number; height: number };

/** What `outline.py` writes for each member. */
export type PortraitModule = { portrait: IsoDrawingData; crop: PortraitCrop };

export type Portrait = {
  photo: StaticImageData;
  load: () => Promise<PortraitModule>;
};

export const portraits: Record<string, Portrait> = {
  // "elif-lara-okyay": {
  //   photo: elifLaraOkyay, // import elifLaraOkyay from "@/assets/team/elif-lara-okyay.jpg";
  //   load: () => import("./portraits/elif-lara-okyay"),
  // },
};

export function memberId(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
