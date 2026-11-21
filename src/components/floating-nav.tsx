"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import summitWordmark from "@/assets/summit-wordmark.png";
import { event, hero, navigation } from "@/content/summit";
import { cn } from "@/lib/cn";

/** Which link each section belongs to; sections without a link of their own mark none. */
const owner: Record<string, string> = {
  about: "/#about",
  mission: "/#about",
  speakers: "/#speakers",
  program: "/#program",
  tickets: "/#tickets",
  team: "/#team",
  partners: "/#partners",
};

/**
 * A compact bar that drops in once the hero has scrolled away, so the page
 * can be navigated from anywhere, and marks the part of the page in view.
 */
export function FloatingNav() {
  const [shown, setShown] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // The section crossing the middle of the screen is the one being read.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of Object.keys(owner)) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  const current = active ? owner[active] : undefined;

  return (
    <div
      inert={!shown}
      className={cn(
        "fixed inset-x-0 top-3 z-50 flex justify-center px-3 transition-[opacity,translate] duration-500 ease-out-soft motion-reduce:transition-none",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0",
      )}
    >
      <nav
        aria-label="Sections"
        className="flex items-center gap-1 rounded-full bg-[#0c0c0c]/80 p-1.5 pl-4 text-white shadow-[0_12px_32px_-12px_rgb(0_0_0/0.5)] ring-1 ring-white/12 backdrop-blur-xl"
      >
        <Link href="/" aria-label={`${event.name} 2027, back to the top`} className="mr-2 shrink-0">
          <Image src={summitWordmark} alt="" className="h-7 w-auto" />
        </Link>
        <ul className="hidden items-center md:flex">
          {navigation.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current === item.href ? "location" : undefined}
                className={cn(
                  "flex h-9 items-center rounded-full px-3.5 text-sm transition-colors",
                  current === item.href ? "bg-white/14 text-white" : "text-white/72 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={hero.cta.href}
          aria-current={current === hero.cta.href ? "location" : undefined}
          className={cn(
            "ml-1 flex h-9 shrink-0 items-center rounded-full bg-white px-4 text-sm font-medium text-[#0c0c0c] transition-[background-color,box-shadow] hover:bg-white/88",
            current === hero.cta.href && "ring-2 ring-accent ring-offset-2 ring-offset-[#0c0c0c]",
          )}
        >
          {hero.cta.label}
        </Link>
      </nav>
    </div>
  );
}
