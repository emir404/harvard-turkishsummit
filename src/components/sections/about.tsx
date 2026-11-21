import Image from "next/image";
import auditoriumPhoto from "@/assets/summit-2026-auditorium.jpg";
import keynotePhoto from "@/assets/summit-2026-keynote.jpg";
import panelPhoto from "@/assets/summit-2026-panel.jpg";
import { Lead, Section, SectionHeader, Statement } from "@/components/ui/section";
import { about, panels } from "@/content/summit";

function FocusAreas() {
  return (
    <div className="max-w-md">
      <h3 className="pb-3 text-sm text-fg-tertiary">2027 focus areas</h3>
      <ul className="border-b border-rule">
        {panels.map((panel) => (
          <li key={panel.numeral} className="flex items-baseline gap-4 border-t border-rule py-3">
            <span className="w-7 shrink-0 text-sm text-fg-tertiary">{panel.numeral}</span>
            <span className="text-base text-fg">{panel.area}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function About() {
  return (
    <Section id="about">
      <SectionHeader id="about" label="About the summit" aside={<FocusAreas />}>
        <Statement>{about.statement}</Statement>
        <div className="mt-10 flex flex-col gap-5">
          {about.body.map((paragraph) => (
            <Lead key={paragraph}>{paragraph}</Lead>
          ))}
        </div>
      </SectionHeader>

      <ul className="mt-16 grid grid-cols-2 gap-x-5 gap-y-10 lg:mt-24 lg:grid-cols-4">
        {about.stats.map((stat) => (
          <li key={stat.label} className="flex flex-col gap-3 border-t border-rule pt-5">
            <span className="text-5xl font-medium tracking-tight text-fg tabular-nums lg:text-7xl">{stat.figure}</span>
            <span className="max-w-64 text-base text-pretty text-fg-secondary">{stat.label}</span>
          </li>
        ))}
      </ul>

      <figure className="mt-16 lg:mt-24">
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="relative aspect-3/2 lg:col-span-8 lg:aspect-auto lg:h-130">
            <Image
              src={auditoriumPhoto}
              alt="Audience facing the stage at the inaugural summit in the David Rubenstein Treehouse"
              fill
              sizes="(min-width: 1024px) 66vw, 100vw"
              placeholder="blur"
              className="object-cover"
            />
          </div>
          <div className="grid grid-cols-2 gap-5 lg:col-span-4 lg:grid-cols-1">
            <div className="relative aspect-3/2 lg:aspect-auto lg:h-62.5">
              <Image
                src={panelPhoto}
                alt="Panel discussion on stage at the inaugural summit"
                fill
                sizes="(min-width: 1024px) 33vw, 50vw"
                placeholder="blur"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-3/2 lg:aspect-auto lg:h-62.5">
              <Image
                src={keynotePhoto}
                alt="Speaker presenting to the audience at the inaugural summit"
                fill
                sizes="(min-width: 1024px) 33vw, 50vw"
                placeholder="blur"
                className="object-cover"
              />
            </div>
          </div>
        </div>
        <figcaption className="mt-4 text-sm text-fg-tertiary">{about.photoCaption}</figcaption>
      </figure>
    </Section>
  );
}
