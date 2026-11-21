"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { IsoDrawing } from "@/components/iso/iso-drawing";
import { portraits, type PortraitModule } from "./portraits";

/** The member's initials as an outline, for a card whose photo has not arrived yet. */
function Monogram({ initials }: { initials: string }) {
  return (
    <svg viewBox="0 0 400 500" aria-hidden="true" className="portrait-monogram absolute inset-0 size-full">
      <text
        x="200"
        y="300"
        textAnchor="middle"
        fontSize="210"
        fontWeight="200"
        letterSpacing="-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      >
        {initials}
      </text>
    </svg>
  );
}

/**
 * A member's portrait: drawn in line, in the page's own style, the first
 * time it comes into view; under the pointer (or when the card's links take
 * focus) the photo develops over the drawing. Until a member has a photo
 * and its drawing (see `portraits.ts`), the drawing is their monogram.
 */
export function TeamPortrait({ id, name, initials }: { id: string; name: string; initials: string }) {
  const portrait = portraits[id];
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<PortraitModule | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !portrait) return;
    let live = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        portrait.load().then((module) => live && setLoaded(module));
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, [portrait]);

  return (
    <div
      ref={ref}
      data-reveal="draw"
      className="portrait relative aspect-[4/5] overflow-hidden rounded-xl bg-[#121214] text-fg"
    >
      {portrait ? (
        loaded ? (
          <IsoDrawing data={loaded.portrait} drawOn="parent" width={320} className="portrait-lines absolute inset-0 size-full" />
        ) : null
      ) : (
        <Monogram initials={initials} />
      )}
      {portrait ? (
        // The reveal is clipped on the frame; inside it the photo is framed by the drawing's crop,
        // so the face lands exactly where it was drawn.
        <div className="portrait-photo absolute inset-0 overflow-hidden">
          <div
            className="absolute"
            style={
              (loaded
                ? {
                    width: `${100 / loaded.crop.width}%`,
                    height: `${100 / loaded.crop.height}%`,
                    left: `${(-loaded.crop.x / loaded.crop.width) * 100}%`,
                    top: `${(-loaded.crop.y / loaded.crop.height) * 100}%`,
                  }
                : { inset: 0 }) as CSSProperties
            }
          >
            <Image src={portrait.photo} alt={name} fill sizes="(min-width: 1024px) 40vw, 80vw" className="object-cover" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
