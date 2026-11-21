import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Small label with the crimson mark that names every section. */
export function SectionLabel({
  id,
  as: Tag = "h2",
  children,
}: {
  id?: string;
  as?: "h2" | "h3";
  children: ReactNode;
}) {
  return (
    <Tag id={id} className="flex items-center gap-2.5 text-sm text-fg">
      <span aria-hidden="true" className="size-1.5 bg-accent" />
      {children}
    </Tag>
  );
}

/** A page section: side padding, a hairline on top, generous space below. */
export function Section({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-label`} className={cn("px-5 pb-20 md:px-10 lg:pb-30", className)}>
      <div className="border-t border-rule pt-6">{children}</div>
    </section>
  );
}

/** Label on the left, statement starting at the middle column. */
export function SectionHeader({
  id,
  label,
  aside,
  children,
}: {
  id: string;
  label: string;
  /** Sits at the bottom of the label column, level with the end of the statement. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    // Source order is label, statement, aside, so the statement comes first on a phone.
    <div className="grid gap-x-5 gap-y-8 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <SectionLabel id={`${id}-label`}>{label}</SectionLabel>
      </div>
      <div className="lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1">{children}</div>
      {aside ? <div className="lg:col-span-6 lg:row-start-2 lg:self-end">{aside}</div> : null}
    </div>
  );
}

export function Statement({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-3xl font-medium tracking-tight text-balance md:text-4xl xl:text-statement", className)}>
      {children}
    </p>
  );
}

export function Lead({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("max-w-xl text-lg text-pretty text-fg-secondary", className)}>{children}</p>;
}
