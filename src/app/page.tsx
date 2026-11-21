import { About } from "@/components/sections/about";
import { Hero } from "@/components/sections/hero";
import { MailingList } from "@/components/sections/mailing-list";
import { Mission } from "@/components/sections/mission";
import { Organizers } from "@/components/sections/organizers";
import { Program } from "@/components/sections/program";
import { Speakers } from "@/components/sections/speakers";
import { Sponsors } from "@/components/sections/sponsors";
import { Theme } from "@/components/sections/theme";
import { Tickets } from "@/components/sections/tickets";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export default function Home() {
  return (
    // The hero's street lines run past the page width, so the overflow is clipped out here.
    <div className="overflow-x-clip">
      <div className="mx-auto max-w-page">
        <SiteNav />
        <main>
          <Hero />
          <About />
          <Mission />
          <Theme />
          <Speakers />
          <Program />
          <Tickets />
          <Organizers />
          <Sponsors />
          <MailingList />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
