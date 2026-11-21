import Image from "next/image";
import { FiArrowUpRight, FiDownload } from "react-icons/fi";
import investmentOfficeLogo from "@/assets/investment-office-logo.png";
import nexusOfTheWorld from "@/assets/partners/nexus-of-the-world.png";
import { ActionLink, buttonClass, textLinkClass } from "@/components/ui/action-link";
import { Section, SectionIntro } from "@/components/ui/section";
import { links, partners, sections } from "@/content/summit";
import { cn } from "@/lib/cn";

const logos = {
  ifo: { src: investmentOfficeLogo, className: "h-14 md:h-16" },
  nexus: { src: nexusOfTheWorld, className: "h-11 md:h-13" },
};

/**
 * The partners as one strip of marks, each under its role and divided by a
 * hairline, then a plain line inviting sponsors.
 */
export function Partners() {
  return (
    <Section id="partners" scheme="paper">
      <SectionIntro id="partners" {...sections.partners} title={partners.title} />

      <ul className="mt-14 flex flex-wrap items-start gap-x-12 gap-y-10 lg:mt-20 lg:gap-x-16">
        {partners.list.map((partner, index) => (
          <li
            key={partner.id}
            className={cn("flex flex-col gap-5", index > 0 && "sm:border-l sm:border-rule sm:pl-12 lg:pl-16")}
          >
            <p className="text-[0.8125rem] font-semibold text-fg-secondary">{partner.role}</p>
            {/* One box for every mark, so the roles above them line up and the marks share a centre line. */}
            <div className="flex h-14 items-center md:h-16">
              <Image
                src={logos[partner.id].src}
                alt={partner.name}
                // The marks are white artwork; on paper they show as one ink.
                className={cn("w-auto object-contain object-left opacity-90 brightness-0", logos[partner.id].className)}
              />
            </div>
          </li>
        ))}
      </ul>

      <div
        id="become-a-sponsor"
        className="mt-16 flex scroll-mt-24 flex-wrap items-end justify-between gap-x-12 gap-y-8 border-t border-rule pt-10 lg:mt-20"
      >
        <div className="max-w-xl">
          <h3 className="text-3xl leading-[1.1] font-light tracking-[-0.025em] md:text-4xl">{partners.become.title}</h3>
          <p className="mt-4 text-lg text-pretty text-fg-secondary">{partners.become.text}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
          <ActionLink href={links.sponsorshipPackage} download className={buttonClass("primary")}>
            <FiDownload aria-hidden="true" className="size-4" />
            Sponsorship package
          </ActionLink>
          <ActionLink href="/#contact" className={textLinkClass}>
            Contact the team
            <FiArrowUpRight aria-hidden="true" className="size-4" />
          </ActionLink>
        </div>
      </div>
    </Section>
  );
}
