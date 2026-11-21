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
 * - A link to the section already in the URL scrolls there again. The router
 *   sees no change and does nothing, where a plain anchor would scroll; the
 *   CSS `scroll-behavior` decides whether it glides.
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

    // Runs after the router's own click handling, which has already called preventDefault on its links.
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
      // A different section is taken care of by the router or the browser.
      if (!url.hash || url.hash !== window.location.hash) return;
      const id = decodeURIComponent(url.hash.slice(1));
      const target = id === "top" ? document.body : document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ block: "start" });
    };
    document.addEventListener("click", onClick);

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
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(pending);
      mutations.disconnect();
      reveal.disconnect();
      scale.disconnect();
    };
  }, []);

  return null;
}
