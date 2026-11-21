"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import wallpaper from "@/assets/phone/bosphorus-wallpaper.jpg";
import summitWordmark from "@/assets/summit-wordmark.png";
import { LockScreen, Notification, Phone } from "@/components/stageshow/phone";
import { cn } from "@/lib/cn";

export type PhoneNote = { title: string; body: string; time: string };

/** The summit's mark as the notifications' app icon: an iOS icon tile in ink with the wordmark on it. */
function AppIcon() {
  return (
    <span className="flex size-full items-center justify-center rounded-[9px] bg-[#0c0c0c] ring-1 ring-white/10">
      <Image src={summitWordmark} alt="" className="w-[78%]" />
    </span>
  );
}

/**
 * What pre-registering gets you, told on a phone (the Stageshow kit's iPhone,
 * lock screen and notifications) over a wallpaper of the Bosphorus from the
 * page's own drawing: the confirmation is there; when the phone comes into
 * view, the news that tickets are open arrives on top of it, opening its own
 * room. The server renders the end of the story, so without JavaScript, with
 * reduced motion or in a screenshot both notifications show.
 */
export function NotifyPhone({ notes, className }: { notes: PhoneNote[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [arrived, setArrived] = useState(notes.length);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen: leave the finished picture alone.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;

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
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [notes]);

  return (
    <div ref={ref} className={cn("notify-phone", className)}>
      <Phone width={320} dark wallpaper={`url(${wallpaper.src}) center top / cover no-repeat, #0c0c0c`}>
        {/* The panel crops the phone below its clock, so notifications sit under it. The date is a weekday only: a full date would promise when tickets open. */}
        <LockScreen date="Monday" time="9:41" stack="top" controls={false}>
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
  );
}
