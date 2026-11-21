import Image from "next/image";
import { FiLinkedin, FiMail } from "react-icons/fi";
import investmentOfficeLogo from "@/assets/investment-office-logo.png";
import summitLogo from "@/assets/summit-logo.png";
import { ActionLink } from "@/components/ui/action-link";
import { Lead, Section, SectionHeader, Statement } from "@/components/ui/section";
import { organizers } from "@/content/summit";

export function Organizers() {
  const blocks = [
    { ...organizers.committee, logo: summitLogo, logoAlt: "Harvard Türkiye Summit" },
    {
      ...organizers.partner,
      logo: investmentOfficeLogo,
      logoAlt: "Investment and Finance Office of the Presidency of the Republic of Türkiye, Invest in Türkiye",
    },
  ];

  return (
    <Section id="organizers">
      <SectionHeader id="organizers" label="Organizers">
        <Statement>{organizers.title}</Statement>
        <Lead className="mt-4">{organizers.intro}</Lead>
      </SectionHeader>

      <div className="mt-12 grid gap-x-5 gap-y-12 lg:mt-18 lg:grid-cols-2">
        {blocks.map((block) => (
          <article key={block.name} className="flex flex-col border-t border-rule pt-6">
            <Image src={block.logo} alt={block.logoAlt} className="h-18 w-auto self-start" />
            <p className="mt-10 text-sm text-fg-tertiary lg:mt-14">{block.kicker}</p>
            <h3 className="mt-2 max-w-xl text-2xl font-medium tracking-tight text-balance text-fg lg:text-title">
              {block.name}
            </h3>
            <Lead className="mt-4">{block.description}</Lead>
          </article>
        ))}
      </div>

      <div className="mt-16 lg:mt-24">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2 pb-5">
          <h3 className="text-2xl font-medium tracking-tight text-fg lg:text-title">{organizers.teamTitle}</h3>
          <p className="text-sm text-fg-tertiary">{organizers.teamNote}</p>
        </div>
        <ul className="border-b border-rule">
          {organizers.team.map((member) => (
            <li
              key={member.name}
              className="grid grid-cols-2 items-center gap-x-5 gap-y-1 border-t border-rule py-5 sm:grid-cols-12"
            >
              <span className="col-span-2 text-xl text-fg sm:col-span-6 lg:text-row">{member.name}</span>
              <span className="text-base text-fg-secondary sm:col-span-4">{member.role}</span>
              <span className="flex justify-end gap-5 sm:col-span-2">
                <ActionLink
                  href={member.email ? `mailto:${member.email}` : undefined}
                  aria-label={`Email ${member.name}`}
                  className="text-fg"
                >
                  <FiMail aria-hidden="true" className="size-4.5" />
                </ActionLink>
                <ActionLink href={member.linkedin} aria-label={`${member.name} on LinkedIn`} className="text-fg">
                  <FiLinkedin aria-hidden="true" className="size-4.5" />
                </ActionLink>
              </span>
            </li>
          ))}
          <li className="grid grid-cols-1 gap-x-5 gap-y-1 border-t border-rule py-5 text-fg-tertiary sm:grid-cols-2">
            <span className="text-xl lg:text-row">{organizers.teamPlaceholder.title}</span>
            <span className="text-base">{organizers.teamPlaceholder.note}</span>
          </li>
        </ul>
      </div>
    </Section>
  );
}
