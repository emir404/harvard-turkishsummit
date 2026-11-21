import { FloatingNav } from "@/components/floating-nav";
import { MotionRuntime } from "@/components/motion/motion-runtime";
import { About } from "@/components/sections/about";
import { Hero } from "@/components/sections/hero";
import { MailingList } from "@/components/sections/mailing-list";
import { Mission } from "@/components/sections/mission";
import { Partners } from "@/components/sections/partners";
import { Program } from "@/components/sections/program";
import { Speakers } from "@/components/sections/speakers";
import { Team } from "@/components/sections/team";
import { ThemeMarquee } from "@/components/sections/theme-marquee";
import { Tickets } from "@/components/sections/tickets";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { ViewTransition } from "react";
import { pageTransition } from "@/lib/page-transition";

export default function Home() {
  return (
    // The whole page enters and leaves with the page transition (src/lib/page-transition.ts).
    <ViewTransition {...pageTransition}>
      {/* The hero's drawing runs past the page width, so the overflow is clipped
        here. `clip` rather than `hidden`, so the pinned sections still stick. */}
      <div className="overflow-x-clip">
        <div className="mx-auto max-w-page">
          <SiteNav />
        </div>
        <FloatingNav />
        <main>
          <div className="mx-auto max-w-page">
            <Hero />
          </div>
          {/* Everything after the hero paints over its drawing as it falls behind. */}
          <div className="relative z-10">
            <ThemeMarquee />
            <About />
            <Mission />
            <Speakers />
            <Program />
            <Tickets />
            <Team />
            <Partners />
            <MailingList />
          </div>
        </main>
        <SiteFooter />
        {/* Last, so it starts once everything above has hydrated and never touches a node React has yet to claim. */}
        <MotionRuntime />
      </div>
    </ViewTransition>
  );
}
