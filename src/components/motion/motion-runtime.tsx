"use client";

import { useEffect } from "react";

/**
 * One small runtime for the whole site, so sections can stay Server
 * Components and opt in with attributes:
 *
 * - `data-reveal` elements (the drawings and portraits) get `data-shown` the
 *   first time they come into view; globals.css draws them in from that.
 * - `svg[data-iso]` line drawings get `--iso-px` (viewBox units per CSS
 *   pixel), so their strokes stay hairlines at any size.
 *
 * Render it once, as the last child of a page: its effect then runs after
 * the page has hydrated, so it never changes a node React has yet to claim.
 * It also watches for elements added later.
 */
export function MotionRuntime() {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-motion", "");

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-shown", "");
          reveal.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    const scale = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const svg = entry.target as SVGSVGElement;
        const { width, height } = entry.contentRect;
        const viewBox = svg.viewBox.baseVal;
        if (width > 0 && height > 0 && viewBox && viewBox.width > 0) {
          // Fitted inside its box ("meet") the tighter side sets the scale; covering it ("slice"), the looser one.
          const sx = viewBox.width / width;
          const sy = viewBox.height / height;
          const cover = svg.getAttribute("preserveAspectRatio")?.includes("slice");
          svg.style.setProperty("--iso-px", (cover ? Math.min(sx, sy) : Math.max(sx, sy)).toFixed(4));
        }
      }
    });

    const watched = new WeakSet<Element>();
    const scan = () => {
      for (const el of document.querySelectorAll("[data-reveal]:not([data-shown])")) {
        if (watched.has(el)) continue;
        watched.add(el);
        reveal.observe(el);
      }
      for (const el of document.querySelectorAll("svg[data-iso]")) {
        if (watched.has(el)) continue;
        watched.add(el);
        scale.observe(el);
      }
    };
    scan();

    let pending = 0;
    const mutations = new MutationObserver(() => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        scan();
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(pending);
      mutations.disconnect();
      reveal.disconnect();
      scale.disconnect();
    };
  }, []);

  return null;
}
