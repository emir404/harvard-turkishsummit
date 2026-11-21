import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The theme adds its own type and container steps; tailwind-merge has to know
// them so `text-statement` is not mistaken for a text colour.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "statement", "title", "row"],
      container: ["page"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
