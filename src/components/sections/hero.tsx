import Image from "next/image";
import type { ReactNode } from "react";
import { FiArrowRight } from "react-icons/fi";
import investmentOfficeLogo from "@/assets/investment-office-logo.png";
import { TreehouseDrawing } from "@/components/treehouse/treehouse-drawing";
import { ActionLink, buttonClass, textLinkClass } from "@/components/ui/action-link";
import { event } from "@/content/summit";
import { cn } from "@/lib/cn";

function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <dt className="text-sm text-fg-tertiary">{label}</dt>
      <dd className="text-base text-fg">{children}</dd>
    </div>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title">
      {/* From xl up the copy and the drawing share one grid cell, so the building sits under the headline. */}
      <div className="xl:grid">
        <div className="relative z-10 px-5 pt-9 md:px-10 xl:col-start-1 xl:row-start-1">
          <p className="text-base text-fg-secondary">
            {event.name} · {event.edition} · {event.dateLabel}
          </p>
          <h1
            id="hero-title"
            className="mt-3.5 text-5xl font-medium tracking-tight text-balance sm:text-6xl lg:text-7xl xl:text-display xl:whitespace-nowrap"
          >
            {event.theme}
          </h1>
          <p className="mt-3.5 text-2xl tracking-tight text-fg-secondary sm:text-3xl">{event.subtheme}</p>
          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <ActionLink href="/#pre-register" className={buttonClass("primary")}>
              Pre-register
            </ActionLink>
            <ActionLink href="/#program" className={textLinkClass}>
              View program
              <FiArrowRight aria-hidden="true" className="size-4" />
            </ActionLink>
          </div>
          <p className="mt-4.5 text-sm text-fg-tertiary">
            Summit and Gala tickets open soon.
            <br />
            Pre-registered guests hear first.
          </p>
        </div>
        <div className="pointer-events-none hidden xl:col-start-1 xl:row-start-1 xl:block xl:pt-51">
          <TreehouseDrawing framing="wide" className="overflow-visible" />
        </div>
        <div className="mt-12 px-5 md:px-10 xl:hidden">
          <TreehouseDrawing framing="tight" />
        </div>
      </div>
      <dl className="mx-5 mt-10 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-rule pt-3.5 pb-7 md:mx-10 lg:grid-cols-12 xl:mt-1">
        <Fact label="Venue" className="col-span-2 lg:col-span-4">
          {event.venue}
        </Fact>
        <Fact label="Address" className="col-span-2 sm:col-span-1 lg:col-span-2">
          <span className="xl:whitespace-nowrap">{event.address}</span>
        </Fact>
        <Fact label="Summit" className="lg:col-span-2">
          <span className="tabular-nums">{event.summitHours}</span>
        </Fact>
        <Fact label="Gala" className="lg:col-span-2">
          <span className="tabular-nums">{event.galaHours}</span>
        </Fact>
        <Fact label="Main partner" className="col-span-2 sm:col-span-1 lg:col-span-2">
          <Image
            src={investmentOfficeLogo}
            alt="Investment and Finance Office of the Presidency of the Republic of Türkiye, Invest in Türkiye"
            className="h-7.5 w-auto"
          />
        </Fact>
      </dl>
    </section>
  );
}
