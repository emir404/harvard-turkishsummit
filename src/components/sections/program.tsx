import { FiCalendar, FiDownload } from "react-icons/fi";
import { ActionLink, textLinkClass } from "@/components/ui/action-link";
import { Lead, Section, SectionHeader, Statement } from "@/components/ui/section";
import { event, gala, links, programNotes, schedule } from "@/content/summit";

function TimeRange({ start, end }: { start: string; end: string }) {
  return (
    <span className="tabular-nums">
      <time dateTime={`${event.date}T${start}`}>{start}</time>–<time dateTime={`${event.date}T${end}`}>{end}</time>
    </span>
  );
}

function ProgramActions() {
  return (
    <div className="flex flex-col gap-3">
      <ActionLink href={links.calendar} download className={textLinkClass}>
        <FiCalendar aria-hidden="true" className="size-4" />
        Add to calendar
      </ActionLink>
      <ActionLink href={links.agendaPdf} download className={textLinkClass}>
        <FiDownload aria-hidden="true" className="size-4" />
        Download agenda (PDF)
      </ActionLink>
    </div>
  );
}

export function Program() {
  return (
    <Section id="program">
      <SectionHeader id="program" label="Program" aside={<ProgramActions />}>
        <Statement>
          <time dateTime={event.date}>{event.dateLabel}</time>
        </Statement>
        <Lead className="mt-4 max-w-none">
          {event.venue} · {event.addressShort}
        </Lead>
        <dl className="mt-10 border-b border-rule">
          <div className="flex justify-between border-t border-rule py-3.5 text-base text-fg">
            <dt>Summit</dt>
            <dd className="tabular-nums">{event.summitHours}</dd>
          </div>
          <div className="flex justify-between border-t border-rule py-3.5 text-base text-fg">
            <dt>Gala</dt>
            <dd className="tabular-nums">{event.galaHours}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-fg-tertiary">
          {programNotes.ticketing}
          <br />
          {programNotes.status}
        </p>
      </SectionHeader>

      <div className="mt-12 lg:mt-18">
        <div aria-hidden="true" className="hidden grid-cols-12 gap-x-5 pb-3 text-sm text-fg-tertiary sm:grid">
          <span className="col-span-3 lg:col-span-2">Time</span>
          <span className="col-span-7 lg:col-span-8">Session</span>
          <span className="col-span-2 text-right">Format</span>
        </div>
        <ol>
          {schedule.map((entry) =>
            entry.kind === "break" ? (
              <li
                key={entry.start}
                className="grid grid-cols-1 gap-x-5 border-t border-rule py-3 text-base text-fg-tertiary sm:grid-cols-12"
              >
                <span className="sm:col-span-3 lg:col-span-2">
                  <TimeRange start={entry.start} end={entry.end} />
                </span>
                <span className="sm:col-span-9 lg:col-span-10">{entry.title}</span>
              </li>
            ) : (
              <li key={entry.start} className="grid grid-cols-1 gap-x-5 gap-y-1 border-t border-rule py-5 sm:grid-cols-12">
                <span className="text-lg text-fg sm:col-span-3 lg:col-span-2">
                  <TimeRange start={entry.start} end={entry.end} />
                </span>
                <span className="flex flex-col gap-1 sm:col-span-7 lg:col-span-8">
                  <span className="text-xl text-pretty text-fg lg:text-row">{entry.title}</span>
                  {entry.track ? <span className="text-sm text-fg-tertiary">{entry.track}</span> : null}
                </span>
                <span className="text-sm text-fg-secondary sm:col-span-2 sm:text-right">{entry.format}</span>
              </li>
            ),
          )}
        </ol>

        <h3 className="border-t border-rule pt-12 pb-3 text-sm text-fg-tertiary">Evening</h3>
        <div className="grid grid-cols-1 gap-x-5 gap-y-1 border-t border-b border-rule py-5 sm:grid-cols-12">
          <span className="text-lg text-fg sm:col-span-3 lg:col-span-2">
            <TimeRange start={gala.start} end={gala.end} />
          </span>
          <span className="flex flex-col gap-1 sm:col-span-7 lg:col-span-8">
            <span className="text-xl text-pretty text-fg lg:text-row">{gala.title}</span>
            <span className="text-sm text-fg-tertiary">{gala.note}</span>
          </span>
          <span className="text-sm text-accent-fg sm:col-span-2 sm:text-right">{gala.ticketNote}</span>
        </div>
      </div>
    </Section>
  );
}
