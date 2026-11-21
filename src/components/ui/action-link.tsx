import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ActionLinkProps = {
  /** Left undefined while the destination is unknown; renders as plain text. */
  href?: string;
  children: ReactNode;
  className?: string;
  download?: boolean;
  "aria-label"?: string;
  "aria-current"?: "page";
};

/** One link element for routes, anchors, files and mail addresses. */
export function ActionLink({ href, children, className, ...rest }: ActionLinkProps) {
  if (!href) {
    return (
      <span aria-disabled="true" className={className} aria-label={rest["aria-label"]}>
        {children}
      </span>
    );
  }

  const isRoute = href.startsWith("/") && !/\.[a-z0-9]+$/i.test(href);
  if (isRoute) {
    return (
      <Link href={href} className={className} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  );
}

export function buttonClass(variant: "primary" | "outline" | "inverse" = "primary", className?: string) {
  return cn(
    "inline-flex h-13 shrink-0 items-center justify-center gap-2.5 rounded-xs px-7 text-base font-medium",
    variant === "primary" && "bg-accent text-fg hover:bg-accent/90",
    variant === "outline" && "border border-field px-6 text-fg hover:border-fg",
    variant === "inverse" && "bg-fg text-ground hover:bg-fg/90",
    className,
  );
}

export const textLinkClass =
  "inline-flex w-fit items-center gap-2 text-base font-medium text-fg underline-offset-4 hover:underline";
