"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { observeProgress, type ProgressMode } from "@/lib/scroll-progress";

type ScrollSceneProps = {
  as?: "div" | "section";
  mode: ProgressMode;
  /** How quickly `--p` catches up with the scroll position, per second. */
  rate?: number;
  id?: string;
  className?: string;
  style?: CSSProperties;
  "aria-labelledby"?: string;
  "aria-label"?: string;
  children: ReactNode;
};

/**
 * An element that carries its scroll progress as `--p` (0–1), for
 * scroll-linked CSS on it and anything inside. Children can stay Server
 * Components.
 */
export function ScrollScene({ as: Tag = "div", mode, rate, style, children, ...rest }: ScrollSceneProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return observeProgress(el, { mode, rate });
  }, [mode, rate]);

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      style={{ "--p": 0, ...style } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}
