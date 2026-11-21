import { Lead, Section, SectionHeader, Statement } from "@/components/ui/section";
import { event, panels, theme } from "@/content/summit";

export function Theme() {
  return (
    <Section id="theme">
      <SectionHeader id="theme" label="2027 theme">
        <Statement>{event.theme}</Statement>
        <Lead className="mt-4">{theme.subtitle}</Lead>
      </SectionHeader>

      <ol className="mt-12 border-b border-rule lg:mt-18">
        {panels.map((panel) => (
          <li key={panel.numeral} className="grid gap-x-5 gap-y-4 border-t border-rule py-8 lg:grid-cols-12">
            <div className="flex gap-3 lg:col-span-2 lg:flex-col lg:gap-1">
              <span className="text-base font-medium text-fg">{panel.panel}</span>
              <time dateTime={`${event.date}T${panel.time}`} className="text-base text-fg-tertiary tabular-nums">
                {panel.time}
              </time>
            </div>
            <div className="flex flex-col gap-3 lg:col-span-4">
              <h3 className="text-2xl font-medium tracking-tight text-fg lg:text-title">{panel.area}</h3>
              <p className="max-w-sm text-base text-pretty text-fg-secondary">{panel.description}</p>
            </div>
            <p className="text-xl text-pretty text-fg lg:col-span-6 lg:text-row">{panel.title}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
