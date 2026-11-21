"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import summitEmblem from "@/assets/phone/summit-emblem.png";
import wallpaper from "@/assets/phone/bosphorus-wallpaper.jpg";
import { LockScreen, Notification, Phone } from "@/components/stageshow/phone";
import { cn } from "@/lib/cn";

export type PhoneNote = { title: string; body: string; time: string };

/** The kit's iPhone 18 Pro in points: the screen plus its band and glass on each side. */
const PHONE = { w: 402 + 26, h: 874 + 26 };
/** How much of the phone's height stays on the stage; the rest runs off its foot. */
const SHOWN = 0.78;

/** The summit's emblem on a crimson tile: the notifications' app icon. */
function AppIcon() {
  return (
    <span className="flex size-full items-center justify-center rounded-[9px] bg-[#a51c30]">
      <Image src={summitEmblem} alt="" className="w-[72%]" />
    </span>
  );
}

/**
 * What pre-registering gets you, on a phone (the Stageshow kit's iPhone,
 * lock screen and notifications) standing on a crimson stage: one even
 * gutter above and to either side, and its foot run off the bottom, so the
 * ground frames it on three sides. The wallpaper is the page's own
 * Bosphorus at night. When the phone comes into view the news that tickets
 * are open arrives on top of the confirmation, opening its own room. The
 * server renders the end of the story, so without JavaScript, with reduced
 * motion or in a screenshot both notifications show.
 */
export function NotifyPhone({ notes, className }: { notes: PhoneNote[]; className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [arrived, setArrived] = useState(notes.length);
  const [fit, setFit] = useState<{ width: number; inset: number; height: number } | null>(null);

  // The phone takes most of the stage's width (capped), stands one gutter in, and the stage is cut to show 78% of it.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const wide = window.matchMedia("(min-width: 64rem)");
    const measure = () => {
      const stageWidth = stage.clientWidth;
      const width = Math.round(Math.min(400, stageWidth * (wide.matches ? 0.72 : 0.84)));
      const inset = Math.round((stageWidth - width) / 2);
      const height = Math.round(inset + ((width * PHONE.h) / PHONE.w) * SHOWN);
      setFit((current) =>
        current && current.width === width && current.inset === inset && current.height === height
          ? current
          : { width, inset, height },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    wide.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      wide.removeEventListener("change", measure);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen: leave the finished picture alone.
    if (stage.getBoundingClientRect().top < window.innerHeight * 0.85) return;

    const timers: number[] = [];
    // Only the newest is still to come; the confirmation is already on the lock screen.
    timers.push(window.setTimeout(() => setArrived(notes.length - 1), 0));
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        timers.push(window.setTimeout(() => setArrived(notes.length), 900));
      },
      { threshold: 0.5 },
    );
    io.observe(stage);
    return () => {
      io.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [notes]);

  return (
    <div
      ref={stageRef}
      // Until it is measured (and without JavaScript) the stage keeps the wide layout's proportions.
      className={cn("notify-phone scheme-crimson relative overflow-hidden rounded-3xl", !fit && "aspect-[3/4]", className)}
      style={fit ? { height: fit.height } : undefined}
    >
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: fit ? fit.inset : "14%" }}>
        <Phone
          width={fit?.width ?? 340}
          dark
          wallpaper={`url(${wallpaper.src}) center top / cover no-repeat, #0b0b0d`}
          className="notify-phone__device"
        >
          {/* Notifications sit just under the clock, so the stage's edge never comes near them. */}
          <LockScreen date="Monday" time="9:41" size="satellite" stack="top">
            {/* Newest on top: an arrival opens its room and the one below moves down with it. */}
            {notes
              .map((note, index) => ({ note, index }))
              .reverse()
              .map(({ note, index }) => (
                <div key={index} className="notify-arrive" data-in={index < arrived || undefined}>
                  <div>
                    <Notification icon={<AppIcon />} title={note.title} body={note.body} time={note.time} />
                  </div>
                </div>
              ))}
          </LockScreen>
        </Phone>
      </div>
    </div>
  );
}
