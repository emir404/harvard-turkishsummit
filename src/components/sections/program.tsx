import type { ReactNode } from "react";
import { FiArrowRight, FiCalendar, FiDownload } from "react-icons/fi";
import { ActionLink, textLinkClass } from "@/components/ui/action-link";
import { Section, SectionIntro } from "@/components/ui/section";
import { event, gala, links, program, sections, type ProgramItem } from "@/content/summit";
import { cn } from "@/lib/cn";

function Time({ value }: { value: string }) {
  return <time dateTime={`${event.date}T${value}`}>{value}</time>;
}

function Range({ start, end }: { start: string; end: string }) {
  return (
    <span className="tabular-nums">
      <Time value={start} />–<Time value={end} />
    </span>
  );
}

const rowClass =
  "grid scroll-mt-32 grid-cols-[3.75rem_1fr] gap-x-6 border-t border-rule py-5 first:border-t-0 first:pt-0 sm:grid-cols-[5rem_1fr]";

function Session({ item, id }: { item: ProgramItem; id: string }) {
  const { panel } = item;
  return (
    <li id={id} className={rowClass}>
      <span className="pt-0.5 text-[0.9375rem] text-fg-tertiary tabular-nums">
        <Time value={item.start} />
      </span>
      {panel ? (
        <div className="flex flex-col gap-1">
          <p className="text-[0.8125rem] text-fg-tertiary">
            <span className="font-semibold text-accent-fg">{panel.panel}</span> ·{" "}
            <Range start={item.start} end={item.end} />
          </p>
          <h4 className="text-lg leading-[1.3] font-medium tracking-[-0.01em]">{panel.area}</h4>
          <p className="max-w-xl text-[0.9375rem] text-pretty text-fg-secondary">{panel.title}</p>
        </div>
      ) : (
        <h4 className="text-lg leading-[1.35]">{item.title}</h4>
      )}
    </li>
  );
}

/** One part of the day: its name and hours on the left, its sessions on the right. */
function Block({
  id,
  label,
  start,
  end,
  children,
}: {
  id: string;
  label: string;
  start: string;
  end: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-x-5 gap-y-5 border-t border-rule pt-6 pb-10 lg:grid-cols-12">
      <header className="flex items-baseline justify-between gap-4 lg:col-span-4 lg:flex-col lg:justify-start lg:gap-1">
        <h3 id={id} className="text-2xl font-light tracking-[-0.02em]">
          {label}
        </h3>
        <p className="text-sm text-fg-tertiary">
          <Range start={start} end={end} />
        </p>
      </header>
      <ol className="lg:col-span-8">{children}</ol>
    </section>
  );
}

/**
 * The day as a printed programme would set it: morning, afternoon and
 * evening, each with its sessions, the panels with their full titles.
 */
export function Program() {
  // Item ids continue across the blocks; the speaker cards link to them.
  const offsets = program.blocks.map((_, index) =>
    program.blocks.slice(0, index).reduce((sum, block) => sum + block.items.length, 0),
  );

  return (
    <Section id="program">
      <SectionIntro
        id="program"
        {...sections.program}
        title={program.title}
        lead={
          <>
            <time dateTime={event.date} className="text-fg">
              {event.dateLabel}
            </time>
            <br />
            {event.venue}
          </>
        }
        action={
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <ActionLink href={links.calendar} download className={textLinkClass}>
              <FiCalendar aria-hidden="true" className="size-4" />
              Add to calendar
            </ActionLink>
            <ActionLink
              href={links.agendaPdf}
              download
              className={cn(textLinkClass, !links.agendaPdf && "text-fg-tertiary")}
            >
              <FiDownload aria-hidden="true" className="size-4" />
              Agenda (PDF)
            </ActionLink>
          </div>
        }
      />

      <div className="mt-14 lg:mt-20">
        {program.blocks.map((block, blockIndex) => (
          <Block key={block.id} id={`program-${block.id}`} label={block.label} start={block.start} end={block.end}>
            {block.items.map((item, index) => (
              <Session key={item.start} item={item} id={`program-step-${offsets[blockIndex] + index}`} />
            ))}
          </Block>
        ))}

        <Block id="program-evening" label={gala.label} start={gala.start} end={gala.end}>
          <li id="program-step-gala" className={rowClass}>
            <span className="pt-0.5 text-[0.9375rem] text-fg-tertiary tabular-nums">
              <Time value={gala.start} />
            </span>
            <div className="flex flex-col items-start gap-1">
              <p className="text-[0.8125rem] text-fg-tertiary">
                <span className="font-semibold text-accent-fg">{gala.ticketNote}</span> · {gala.note}
              </p>
              <h4 className="text-lg leading-[1.3] font-medium tracking-[-0.01em]">{gala.title}</h4>
              <p className="max-w-xl text-[0.9375rem] text-pretty text-fg-secondary">{gala.text}</p>
              <ActionLink href={links.registerGala} className={cn(textLinkClass, "mt-3 text-[0.9375rem]")}>
                Gala tickets
                <FiArrowRight aria-hidden="true" className="size-4" />
              </ActionLink>
            </div>
          </li>
        </Block>

        <p className="border-t border-rule pt-6 text-sm text-fg-tertiary">{program.note}</p>
      </div>
    </Section>
  );
}
