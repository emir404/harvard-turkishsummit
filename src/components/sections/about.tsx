import auditoriumPhoto from "@/assets/summit-2026-auditorium.jpg";
import keynotePhoto from "@/assets/summit-2026-keynote.jpg";
import panelPhoto from "@/assets/summit-2026-panel.jpg";
import { CountUp } from "@/components/motion/count-up";
import { PhotoCarousel } from "@/components/sections/photo-carousel";
import { Section, SectionIntro } from "@/components/ui/section";
import { about, sections } from "@/content/summit";

const photoFiles = { auditorium: auditoriumPhoto, panel: panelPhoto, keynote: keynotePhoto };

export function About() {
  const photos = about.photos.map((photo) => ({ src: photoFiles[photo.id], alt: photo.alt }));

  return (
    <Section id="about" scheme="paper">
      <SectionIntro id="about" {...sections.about} title={about.title} lead={about.text} />

      <div className="mt-14 grid gap-x-16 gap-y-12 lg:mt-20 lg:grid-cols-12 xl:gap-x-24">
        <PhotoCarousel photos={photos} className="lg:col-span-7" />

        <dl className="grid grid-cols-2 gap-x-8 gap-y-10 lg:col-span-5 lg:grid-cols-1 lg:content-between lg:gap-y-0">
          {about.stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-2 border-t border-rule pt-4">
              <dt className="order-2 text-sm text-pretty text-fg-secondary">{stat.label}</dt>
              <dd className="order-1 text-[2.5rem] leading-none font-light tracking-[-0.03em] tabular-nums sm:text-5xl xl:text-6xl">
                <CountUp figure={stat.figure} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
