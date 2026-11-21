import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Scheme = "ink" | "paper" | "crimson";

const schemes: Record<Scheme, string> = {
  ink: "scheme-ink",
  paper: "scheme-paper",
  crimson: "scheme-crimson",
};

/**
 * A full-bleed band in one of the three schemes, so moving from one section
 * to the next is a change of colour, with the content held to the page width.
 */
export function Section({
  id,
  scheme = "ink",
  className,
  innerClassName,
  children,
}: {
  id: string;
  scheme?: Scheme;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn(schemes[scheme], "relative", className)}>
      <div className={cn("relative mx-auto max-w-page px-5 py-20 md:px-10 lg:py-28 xl:px-16", innerClassName)}>
        {children}
      </div>
    </section>
  );
}

/** The section's name, small and quiet above its title. */
export function SectionTag({ label, className }: { index?: string; label: string; className?: string }) {
  return <p className={cn("text-sm font-medium text-fg-secondary", className)}>{label}</p>;
}

export const titleClass =
  "text-[2.625rem] leading-[1.04] font-light tracking-[-0.03em] text-balance sm:text-6xl lg:text-7xl xl:text-headline";

/**
 * Opens a section: its name, a large title and an optional short lead and
 * action set to the right. Nothing here animates; the sections' own moments do.
 */
export function SectionIntro({
  id,
  index,
  label,
  title,
  lead,
  action,
  className,
}: {
  id: string;
  index?: string;
  label: string;
  title: string;
  lead?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("grid gap-x-5 gap-y-8 lg:grid-cols-12 lg:items-end", className)}>
      {/* Without a lead beside it, the title has the full width. */}
      <div className={lead || action ? "lg:col-span-8" : "lg:col-span-12"}>
        <SectionTag index={index} label={label} />
        <h2 id={`${id}-title`} className={cn("mt-5", lead || action ? "max-w-4xl" : "max-w-6xl", titleClass)}>
          {title}
        </h2>
      </div>
      {lead || action ? (
        <div className="flex flex-col items-start gap-6 lg:col-span-4 lg:pb-2">
          {lead ? <p className="max-w-md text-lg text-pretty text-fg-secondary">{lead}</p> : null}
          {action}
        </div>
      ) : null}
    </header>
  );
}
