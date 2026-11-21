import type { ViewTransitionClass } from "react";

/**
 * Page transitions (React's <ViewTransition>, styled in globals.css).
 * Registration is a step deeper than the site, so links say which way they go:
 *
 * - `nav-forward`: into registration. The page moves left as the next arrives from the right.
 * - `nav-back`: back to the site. The reverse.
 * - `ticket-switch`: between the two registration pages. The form crossfades under a header that stays put.
 *
 * Anything else (the browser's back button, form actions) does not animate.
 */
export type PageTransitionType = "nav-forward" | "nav-back" | "ticket-switch";

export const forward: PageTransitionType[] = ["nav-forward"];
export const back: PageTransitionType[] = ["nav-back"];
export const ticketSwitch: PageTransitionType[] = ["ticket-switch"];

const byType: ViewTransitionClass = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  "ticket-switch": "page-swap",
  default: "none",
};

/** Props for the <ViewTransition> that wraps a page's content (in the page, not a layout, which never enters or exits). */
export const pageTransition = { enter: byType, exit: byType, default: "none" } as const;
