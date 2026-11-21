import { ScrollScene } from "@/components/motion/scroll-scene";
import { BosphorusScene } from "@/components/sections/bosphorus-scene";
import { SectionIntro } from "@/components/ui/section";
import { mission, sections } from "@/content/summit";

/**
 * Mission & vision over the Bosphorus at night: the bridge between Europe and
 * Asia is drawn from one shore to the other as the section scrolls in, then
 * its windows and lamps come on. Like the hero's house, the scene has no
 * frame: it runs past the page and melts into it at every edge.
 */
export function Mission() {
  return (
    <section id="mission" aria-labelledby="mission-title" className="scheme-ink relative">
      <div className="relative mx-auto max-w-page px-5 pt-20 md:px-10 lg:pt-28 xl:px-16">
        <SectionIntro id="mission" {...sections.mission} title={mission.title} lead={mission.lead} />
      </div>

      <ScrollScene mode="enter" rate={8} className="relative mt-2 overflow-x-clip lg:-mt-10">
        {/* Wider than the screen on phones, so the bridge stays large; the edges crop and fade. */}
        <div className="bos-mask relative left-1/2 w-[210vw] max-w-[132rem] -translate-x-1/2 sm:w-[160vw] lg:w-[min(128vw,132rem)]">
          <BosphorusScene label={mission.drawingLabel} shores={{ europe: "Europe", asia: "Asia" }} />
        </div>
      </ScrollScene>

      <div className="relative mx-auto max-w-page px-5 pb-20 md:px-10 lg:pb-28 xl:px-16">
        <div className="grid gap-x-5 gap-y-10 md:grid-cols-2 lg:grid-cols-12">
          {mission.items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-4 border-t border-rule pt-5 lg:col-span-5 lg:even:col-start-7"
            >
              <h3 className="text-sm font-semibold text-accent-fg">{item.label}</h3>
              <p className="text-2xl leading-[1.25] font-light tracking-[-0.015em] text-balance lg:text-[2rem]">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
