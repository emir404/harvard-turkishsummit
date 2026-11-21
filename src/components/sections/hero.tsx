import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { FiArrowRight } from "react-icons/fi";
import investmentFinanceOffice from "@/assets/partners/investment-finance-office.png";
import nexusOfTheWorld from "@/assets/partners/nexus-of-the-world.png";
import { HarvardHouse } from "@/components/harvard-house/harvard-house";
import { ScrollScene } from "@/components/motion/scroll-scene";
import { hero } from "@/content/summit";
import { cn } from "@/lib/cn";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

export function Hero() {
  return (
    // `--p` runs 0–1 as the hero scrolls away: the drawing falls behind and
    // the building turns (see the house scene); the scroll cue fades.
    <ScrollScene
      as="section"
      mode="exit"
      rate={10}
      aria-labelledby="hero-title"
      className="relative flex flex-col px-5 pt-12 pb-16 md:px-10 lg:min-h-[max(50.75rem,calc(100svh-5.5rem))] lg:pt-32 lg:pb-22 xl:px-16"
    >
      {/* Copy sits above the drawing; only its controls take the pointer, so the building can be dragged around them. */}
      <div className="pointer-events-none relative z-10">
        <div className="flex flex-col items-start">
          <p
            className="rise-in flex h-7 items-center rounded-full bg-white px-3 text-[0.8125rem] font-semibold text-[#1e1e1e]"
            style={delay(100)}
          >
            {hero.badge}
          </p>
          <h1
            id="hero-title"
            className="mt-7 text-[2.75rem] leading-[1.02] font-light tracking-[-0.025em] text-white sm:text-6xl md:text-7xl lg:text-6xl xl:text-display xl:leading-[1.02]"
          >
            {hero.title.map((line, index) => (
              <span key={line} className="rise-in block sm:whitespace-nowrap" style={delay(220 + index * 120)}>
                {line}
              </span>
            ))}
          </h1>
          <Link
            href={hero.cta.href}
            className="rise-in group pointer-events-auto mt-11 flex h-13 items-center gap-10 rounded-full border border-white/70 pr-1.5 pl-5.5 text-[0.9375rem] leading-[1.5] text-white transition-colors hover:border-white"
            style={delay(480)}
          >
            {hero.cta.label}
            <span className="flex size-10 items-center justify-center rounded-full bg-white">
              <FiArrowRight
                aria-hidden="true"
                className="size-4.5 text-accent transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        </div>
      </div>

      <HarvardHouse
        className={cn(
          "-mx-5 mt-6 h-[min(92vw,30rem)] md:-mx-10",
          "[--house-fill:0.94] [--house-x:0.5] [--house-y:0.5]",
          // From lg the drawing takes the right of the hero, behind the copy, and runs a little past the page edge.
          "lg:absolute lg:-top-22 lg:right-[max(calc((100%-100vw)/2),-8rem)] lg:bottom-0 lg:left-[42%] lg:m-0 lg:h-auto",
          "lg:[--house-fill:0.86] lg:[--house-x:0.52] lg:[--house-y:0.6]",
          "xl:left-[37%] xl:[--house-fill:0.86] xl:[--house-x:0.53] xl:[--house-y:0.59]",
          // It falls behind the page a little as the hero scrolls away.
          "motion-safe:[translate:0_calc(var(--p,0)*20%)]",
          // The ground grid fades out at the canvas edges instead of stopping at them.
          "[mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)]",
          "lg:[mask-image:linear-gradient(to_right,transparent,black_10%),linear-gradient(to_top,transparent,black_9%)] lg:[mask-composite:intersect]",
        )}
        hintClassName="mt-1 text-center lg:absolute lg:right-10 lg:bottom-22 lg:mt-0 xl:right-16"
      />

      <div className="pointer-events-none relative z-10 mt-8 lg:mt-15">
        <div className="rise-in flex flex-col items-start" style={delay(640)}>
          <div className="flex max-w-90 flex-col gap-3.5">
            <h2 className="text-[0.9375rem] leading-[1.5] font-medium text-white">{hero.about.title}</h2>
            <p className="text-sm leading-[1.55] text-white/86">{hero.about.text}</p>
          </div>
          <div className="mt-15 flex flex-col gap-3.5">
            <p className="text-[0.8125rem] text-white/84">{hero.partnersLabel}</p>
            <div className="flex items-center gap-8">
              <Image
                src={investmentFinanceOffice}
                alt="Investment and Finance Office of the Presidency of the Republic of Türkiye"
                className="h-11 w-auto"
              />
              <Image src={nexusOfTheWorld} alt="Nexus of the World" className="h-8.5 w-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll cue: a bead running down a hairline, which takes you on to About. */}
      <a
        href="#about"
        aria-label="Scroll to About"
        // At the foot of the first screen, even when the hero runs taller than the window.
        className="hero-drift group absolute inset-x-0 top-[min(calc(100%-5.75rem),calc(100svh-11.25rem))] z-10 mx-auto hidden h-16 w-11 items-center justify-center rounded-full lg:flex"
      >
        <span className="relative block h-12 w-px overflow-hidden bg-white/18 transition-colors duration-200 group-hover:bg-white/40">
          <span className="scroll-cue-dot absolute inset-x-0 top-0 block h-1/2 bg-white" />
        </span>
      </a>
    </ScrollScene>
  );
}
