import Image from "next/image";
import type { ReactNode } from "react";
import { FiArrowUpRight, FiDownload } from "react-icons/fi";
import investmentOfficeLogo from "@/assets/investment-office-logo.png";
import { ActionLink, buttonClass, textLinkClass } from "@/components/ui/action-link";
import { Lead, Section, SectionHeader, SectionLabel, Statement } from "@/components/ui/section";
import { links, sponsors } from "@/content/summit";
import { cn } from "@/lib/cn";

const slotGrid: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

const slotHeight: Record<number, string> = {
  2: "h-30",
  3: "h-25",
  4: "h-21",
};

function Tier({ name, note, children }: { name: string; note: string; children: ReactNode }) {
  return (
    <li className="grid gap-x-5 gap-y-5 border-t border-rule py-8 lg:grid-cols-12">
      <div className="flex flex-col gap-1 lg:col-span-3">
        <h3 className="text-row font-medium text-fg">{name}</h3>
        <p className="text-sm text-fg-tertiary">{note}</p>
      </div>
      <div className="lg:col-span-9">{children}</div>
    </li>
  );
}

export function Sponsors() {
  return (
    <Section id="sponsors">
      <SectionHeader id="sponsors" label="Sponsors">
        <Statement>{sponsors.title}</Statement>
        <Lead className="mt-4">{sponsors.intro}</Lead>
      </SectionHeader>

      <ul className="mt-12 border-b border-rule lg:mt-18">
        <Tier name={sponsors.mainPartner.name} note={sponsors.mainPartner.note}>
          <div className="flex h-45 items-center justify-center border border-rule px-6">
            <Image
              src={investmentOfficeLogo}
              alt="Investment and Finance Office of the Presidency of the Republic of Türkiye, Invest in Türkiye"
              className="h-auto max-h-22.5 w-auto"
            />
          </div>
        </Tier>
        {sponsors.openTiers.map((tier) => (
          <Tier key={tier.name} name={tier.name} note={tier.note}>
            <ul className={cn("grid gap-5", slotGrid[tier.slots])}>
              {Array.from({ length: tier.slots }, (_, index) => (
                <li
                  key={index}
                  className={cn(
                    "flex items-center justify-center border border-rule text-sm text-fg-tertiary",
                    slotHeight[tier.slots],
                  )}
                >
                  {sponsors.slotText}
                </li>
              ))}
            </ul>
          </Tier>
        ))}
      </ul>

      <div
        id="become-a-sponsor"
        className="mt-16 grid gap-x-5 gap-y-10 border-t border-rule pt-6 lg:mt-24 lg:grid-cols-2"
      >
        <div className="flex flex-col">
          <SectionLabel as="h3">Become a sponsor</SectionLabel>
          <p className="mt-10 max-w-lg text-3xl font-medium tracking-tight text-balance text-fg lg:mt-14 lg:text-4xl">
            {sponsors.become.title}
          </p>
        </div>
        <div className="flex flex-col justify-end">
          <Lead>{sponsors.become.body}</Lead>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <ActionLink href={links.sponsorshipPackage} download className={buttonClass("primary")}>
              <FiDownload aria-hidden="true" className="size-4" />
              Download sponsorship package
            </ActionLink>
            <ActionLink href="/#contact" className={textLinkClass}>
              Contact the team
              <FiArrowUpRight aria-hidden="true" className="size-4" />
            </ActionLink>
          </div>
        </div>
      </div>
    </Section>
  );
}
