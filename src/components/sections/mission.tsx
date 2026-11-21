import { Lead, Section, SectionHeader, Statement } from "@/components/ui/section";
import { mission } from "@/content/summit";

export function Mission() {
  return (
    <Section id="mission">
      <SectionHeader id="mission" label="Mission & vision">
        <Statement>{mission.statement}</Statement>
      </SectionHeader>

      <div className="mt-16 grid gap-x-5 gap-y-12 lg:mt-24 lg:grid-cols-2">
        {mission.blocks.map((block) => (
          <article key={block.label} className="flex flex-col border-t border-rule pt-5">
            <h3 className="text-sm text-fg-tertiary">{block.label}</h3>
            <p className="mt-10 max-w-xl text-2xl font-medium tracking-tight text-balance text-fg lg:mt-14 lg:text-title">
              {block.heading}
            </p>
            <Lead className="mt-4">{block.text}</Lead>
          </article>
        ))}
      </div>

      <div className="mt-16 lg:mt-24">
        <h3 className="pb-5 text-sm text-fg-tertiary">Why now</h3>
        <ul className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {mission.whyNow.map((item) => (
            <li key={item.title} className="flex flex-col gap-3 border-t border-rule pt-5">
              <span className="text-row font-medium text-fg">{item.title}</span>
              <span className="max-w-xs text-base text-pretty text-fg-secondary">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
