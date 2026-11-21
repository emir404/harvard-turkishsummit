"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Photo = { src: StaticImageData; alt: string };

const INTERVAL = 6000;
const WIPE = 1100;
const EASE_MOVE = "cubic-bezier(0.77, 0, 0.175, 1)";

/**
 * Photos from the inaugural summit. Each new photo is wiped in from the
 * right over the last one, which slides back a little and dims as it is
 * covered, so the change reads as one movement rather than two pictures
 * ghosting through each other. It advances only while on screen and not
 * under the pointer, and holds still for reduced motion; the bars choose.
 */
export function PhotoCarousel({ photos, className }: { photos: Photo[]; className?: string }) {
  const [active, setActive] = useState(0);
  const [running, setRunning] = useState(false);
  const [hover, setHover] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const previous = useRef(0);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running || hover) return;
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % photos.length), INTERVAL);
    return () => window.clearTimeout(timer);
  }, [running, hover, active, photos.length]);

  // The wipe: the incoming slide on top, revealed from the right; the outgoing one under it, sliding back.
  useEffect(() => {
    const from = previous.current;
    previous.current = active;
    if (from === active) return;
    const incoming = slides.current[active];
    const outgoing = slides.current[from];
    if (!incoming || !outgoing) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    slides.current.forEach((slide, index) => {
      if (slide) slide.style.zIndex = index === active ? "2" : index === from ? "1" : "0";
    });
    if (reduced) return;
    // A slide keeps the last state its animations left it in; clear them before it moves again.
    for (const el of [incoming, outgoing, incoming.firstElementChild, outgoing.firstElementChild]) {
      el?.getAnimations().forEach((animation) => animation.cancel());
    }
    incoming.animate([{ clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 0%)" }], {
      duration: WIPE,
      easing: EASE_MOVE,
      fill: "both",
    });
    incoming.firstElementChild?.animate([{ transform: "translateX(8%) scale(1.04)" }, { transform: "translateX(0) scale(1)" }], {
      duration: WIPE,
      easing: EASE_MOVE,
      fill: "both",
    });
    outgoing.firstElementChild?.animate(
      [
        { transform: "translateX(0)", filter: "brightness(1)" },
        { transform: "translateX(-6%)", filter: "brightness(0.55)" },
      ],
      { duration: WIPE, easing: EASE_MOVE, fill: "both" },
    );
  }, [active]);

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        ref={frameRef}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className="group relative aspect-3/2 overflow-hidden rounded-2xl bg-ink lg:aspect-auto lg:h-full lg:min-h-120"
      >
        {photos.map((photo, index) => (
          <div
            key={photo.src.src}
            ref={(el) => {
              slides.current[index] = el;
            }}
            aria-hidden={index === active ? undefined : true}
            className="absolute inset-0 overflow-hidden"
            style={{ zIndex: index === 0 ? 2 : 0 }}
          >
            <div className="absolute inset-0">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                placeholder="blur"
                // A slow push in under the pointer, inside the frame.
                className="object-cover transition-[scale] duration-700 ease-(--ease-snap) group-hover:scale-[1.03]"
              />
            </div>
          </div>
        ))}
        {/* A soft floor so the bars read on any photo. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-3 h-24 bg-linear-to-t from-black/45 to-transparent" />
        <div className="absolute bottom-4 left-5 z-4 flex w-40 gap-1.5" role="group" aria-label="Choose a photo">
          {photos.map((photo, index) => (
            <button
              key={photo.src.src}
              type="button"
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
              className="relative h-6 flex-1 cursor-pointer"
            >
              <span className="absolute inset-x-0 top-1/2 block h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/30">
                <span
                  key={index === active ? `on-${active}` : "off"}
                  className={cn(
                    "absolute inset-y-0 left-0 block w-full origin-left rounded-full bg-white",
                    index === active
                      ? running && !hover
                        ? "animate-[bar-fill_var(--interval)_linear_both]"
                        : "scale-x-100"
                      : "scale-x-0",
                  )}
                  style={{ "--interval": `${INTERVAL}ms` } as React.CSSProperties}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
