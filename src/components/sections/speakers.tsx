import type { CSSProperties } from "react";
import { FiArrowRight, FiArrowUpRight } from "react-icons/fi";
import { LazyIsoDrawing } from "@/components/iso/lazy-iso";
import { ActionLink, textLinkClass } from "@/components/ui/action-link";
import { Section, SectionIntro } from "@/components/ui/section";
import { program, sections, speakers } from "@/content/summit";
import { cn } from "@/lib/cn";

/** The agenda item each card leads to, by its start time. */
function agendaAnchor(time: string) {
  const items = program.blocks.flatMap((block) => [...block.items]);
  const index = items.findIndex((item) => item.start === time);
  return index >= 0 ? `/#program-step-${index}` : "/#program";
}

/**
 * The speakers, before they are announced: the keynote as the large card and
 * the four panels beside it, each a night scene of its subject. Copy sits in
 * the bottom-left corner, the scene hangs from the top-right and fades out at
 * its foot. The scenes draw themselves in once, keynote first, when the grid
 * comes into view; each card leads to its session in the agenda.
 */
export function Speakers() {
  return (
    <Section id="speakers" scheme="paper">
      <SectionIntro
        id="speakers"
        {...sections.speakers}
        title={speakers.title}
        lead={speakers.text}
        action={
          <ActionLink href="/#contact" className={textLinkClass}>
            {speakers.inquiry}
            <FiArrowRight aria-hidden="true" className="size-4" />
          </ActionLink>
        }
      />

      {/* One 20px gap both ways; from lg two fixed rows, so the keynote spans exactly the height of two panels and the gap between them. */}
      <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:grid-rows-[repeat(2,20rem)]">
        {speakers.cards.map((card, index) => {
          const lead = index === 0;
          return (
            <li key={card.tag} className={cn(lead && "sm:col-span-2 lg:row-span-2")}>
              <a
                href={agendaAnchor(card.time)}
                className={cn(
                  "speaker-card scheme-ink group relative flex h-full flex-col justify-end overflow-hidden rounded-2xl p-5 md:p-6",
                  // The minimum heights are for the stacked layout; from lg the rows set the size.
                  lead ? "max-lg:min-h-[28rem] sm:max-lg:min-h-[30rem]" : "max-lg:min-h-[21rem]",
                )}
              >
                {/* The scene, wholly inside the card in its top-right, melting into it on every side. */}
                <div
                  aria-hidden="true"
                  className={cn(
                    "speaker-scene pointer-events-none absolute aspect-square",
                    lead ? "top-[5%] right-[5%] w-[min(80%,34rem)]" : "top-[4%] right-[4%] w-[66%]",
                  )}
                >
                  <div className="transition-[scale] duration-700 ease-(--ease-snap) group-hover:scale-[1.03]">
                    <LazyIsoDrawing
                      name={card.icon}
                      width={lead ? 560 : 300}
                      style={{ "--delay": `${index * 140}ms`, "--draw-span": lead ? "1.8s" : "1.4s" } as CSSProperties}
                    />
                  </div>
                </div>

                <div className="relative flex items-end justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[0.8125rem] text-fg-tertiary tabular-nums">
                      <span className="font-semibold text-fg">{card.tag}</span> · {card.time}
                    </p>
                    <h3
                      className={cn(
                        "font-light tracking-[-0.02em] text-balance",
                        lead ? "text-4xl leading-[1.05] md:text-5xl" : "text-[1.375rem] leading-[1.2]",
                      )}
                    >
                      {lead ? "Opening keynote" : card.role}
                    </h3>
                    <p className="mt-1 text-[0.8125rem] text-fg-tertiary">{speakers.status}</p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-white/15 transition-[background-color,color] duration-200 group-hover:bg-fg group-hover:text-ground"
                  >
                    <FiArrowUpRight className="size-4" />
                  </span>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
