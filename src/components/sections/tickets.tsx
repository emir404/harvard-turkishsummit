import Image from "next/image";
import type { ReactNode } from "react";
import { FiArrowRight } from "react-icons/fi";
import summitWordmark from "@/assets/summit-wordmark.png";
import { LazyIsoDrawing, type DrawingName } from "@/components/iso/lazy-iso";
import { NotifyPhone } from "@/components/sections/notify-phone";
import { PreRegistrationForm } from "@/components/sections/pre-registration-form";
import { ActionLink } from "@/components/ui/action-link";
import { Section, SectionIntro } from "@/components/ui/section";
import { event, preRegistration, sections, tickets } from "@/content/summit";
import { cn } from "@/lib/cn";

type Ticket = (typeof tickets.options)[number];

/** The pass's picture: its own night scene, bleeding off the pass's top and sides, fading at its foot. */
// Placed by the scene's own size (translate) rather than the pass's height, so the crop holds at every width.
const art: Record<Ticket["id"], { name: DrawingName; className: string }> = {
  summit: { name: "treehouse", className: "top-0 -right-[8%] w-[92%] -translate-y-[22%]" },
  gala: { name: "gala", className: "top-0 right-[2%] w-[62%] -translate-y-[26%]" },
};

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[0.75rem] text-fg-tertiary">{label}</dt>
      <dd className="text-[0.9375rem]">{children}</dd>
    </div>
  );
}

/**
 * A pass, printed like one: the event's name over its night scene, the
 * details set out as a ticket sets them, a perforation with notches cut into
 * its edges, and a stub with the price and the way in. It lifts 2px under
 * the pointer and its scene settles closer.
 */
function TicketCard({ ticket, scheme }: { ticket: Ticket; scheme: "ink" | "crimson" }) {
  const picture = art[ticket.id];
  return (
    <article className="ticket group">
      <div
        className={cn(
          "ticket-shape relative flex h-full flex-col overflow-hidden rounded-2xl",
          scheme === "ink" ? "scheme-ink" : "scheme-crimson",
        )}
      >
        <div
          aria-hidden="true"
          // Fades at its foot and its left, so the scene's ground never ends in a hard line on the pass.
          className={cn(
            "pointer-events-none absolute [mask-composite:intersect] [mask-image:linear-gradient(to_bottom,#000_45%,transparent_92%),linear-gradient(to_right,transparent,#000_30%)]",
            picture.className,
          )}
        >
          <div className="transition-[scale,translate] duration-700 ease-(--ease-snap) group-hover:-translate-y-1 group-hover:scale-[1.02]">
            <LazyIsoDrawing name={picture.name} width={520} />
          </div>
        </div>

        <div className="relative flex flex-1 flex-col p-6 md:p-8">
          <div className="flex items-center justify-between">
            <Image src={summitWordmark} alt="" className="h-8 w-auto opacity-90" />
            <span className="rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ring-1 ring-current/25">{ticket.kicker}</span>
          </div>
          {/* Its top padding follows the pass's width, as the scene above it does. */}
          <h3 className="mt-auto pt-[34%] text-5xl leading-none font-light tracking-[-0.035em] md:text-6xl">{ticket.title}</h3>
          <dl className="mt-7 grid grid-cols-3 gap-x-4 border-t border-current/15 pt-5">
            <Detail label="Date">
              <time dateTime={event.date}>May 1, 2027</time>
            </Detail>
            <Detail label="Hours">
              <span className="tabular-nums">{ticket.hours}</span>
            </Detail>
            <Detail label="Venue">{ticket.id === "summit" ? "Treehouse" : "To be announced"}</Detail>
          </dl>
          <p className="mt-5 text-sm text-fg-secondary">{ticket.includes.join(" · ")}</p>
        </div>

        {/* The stub, behind a perforation. */}
        <div className="relative flex h-(--stub) items-center justify-between gap-4 px-6 md:px-8">
          <span aria-hidden="true" className="absolute inset-x-6 top-0 border-t-2 border-dotted border-current/30" />
          <p className="flex flex-col">
            <span className="text-[0.75rem] text-fg-tertiary">Price</span>
            <span className="text-lg">{ticket.price}</span>
          </p>
          <ActionLink
            href={ticket.href}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-fg pr-1.5 pl-5 text-[0.9375rem] font-medium text-ground transition-[scale] duration-150 ease-(--ease-snap) active:scale-[0.97]"
          >
            {ticket.action}
            <span className="flex size-8 items-center justify-center rounded-full bg-ground">
              <FiArrowRight
                aria-hidden="true"
                className="size-4 text-fg transition-transform duration-300 ease-(--ease-snap) group-hover:translate-x-0.5"
              />
            </span>
          </ActionLink>
        </div>
      </div>
    </article>
  );
}

export function Tickets() {
  return (
    <Section id="tickets" scheme="paper">
      <SectionIntro id="tickets" {...sections.tickets} title={tickets.title} lead={tickets.intro} />

      <div className="mt-14 grid gap-5 lg:mt-16 lg:grid-cols-2">
        {tickets.options.map((ticket, index) => (
          <TicketCard key={ticket.id} ticket={ticket} scheme={index === 0 ? "ink" : "crimson"} />
        ))}
      </div>

      <div
        id="pre-register"
        className="mt-5 grid scroll-mt-8 gap-x-12 gap-y-10 overflow-hidden rounded-3xl bg-raised shadow-panel lg:grid-cols-12"
      >
        <div className="flex flex-col p-6 md:p-10 lg:col-span-5 lg:p-12 lg:pr-0">
          <h3 className="text-4xl leading-[1.05] font-light tracking-[-0.03em] md:text-5xl">{preRegistration.title}</h3>
          <p className="mt-5 max-w-sm text-lg text-pretty text-fg-secondary">{preRegistration.body}</p>
          {/* The phone stands on the panel's foot, cut by its edge; on phones, where the form follows, it fades out instead. */}
          <div className="relative mt-10 flex h-[24rem] justify-center overflow-hidden [mask-image:linear-gradient(to_bottom,#000_70%,transparent)] lg:-mb-12 lg:mt-auto lg:h-[26rem] lg:[mask-image:none]">
            <NotifyPhone notes={preRegistration.phone} className="pt-2" />
          </div>
        </div>
        {/* Inside the raised panel the fields sit a step darker. */}
        <div className="p-6 pt-0 [--color-raised:var(--color-ground)] md:p-10 md:pt-0 lg:col-span-7 lg:p-12 lg:pl-0">
          <PreRegistrationForm />
        </div>
      </div>
    </Section>
  );
}
