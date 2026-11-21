import { FiLinkedin, FiMail, FiPlus } from "react-icons/fi";
import { TeamPortrait } from "@/components/team/team-portrait";
import { memberId } from "@/components/team/portraits";
import { ActionLink } from "@/components/ui/action-link";
import { Section, SectionIntro } from "@/components/ui/section";
import { sections, team } from "@/content/summit";
import { cn } from "@/lib/cn";

function initials(name: string) {
  const parts = name.split(" ");
  return `${parts[0][0]}${parts[parts.length - 1][0]}`;
}

const iconLink =
  "flex size-9 items-center justify-center rounded-full text-fg-secondary ring-1 ring-white/12 transition-[background-color,color,scale] duration-150 ease-(--ease-snap) hover:bg-fg hover:text-ground active:scale-[0.94]";

/**
 * The organizing team: a portrait for each, drawn in line, with the photo
 * under the pointer; the name and role below, and how to reach them.
 */
export function Team() {
  return (
    <Section id="team">
      <SectionIntro id="team" {...sections.team} title={team.title} lead={team.text} />

      <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 lg:mt-16 lg:grid-cols-4 lg:gap-x-5">
        {team.members.map((member) => (
          <li key={member.name} className="team-card group flex flex-col gap-4">
            <TeamPortrait id={memberId(member.name)} name={member.name} initials={initials(member.name)} />
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-lg leading-[1.25] font-light tracking-[-0.01em] sm:text-xl">{member.name}</h3>
                <p className="text-sm text-fg-tertiary">{member.role}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <ActionLink
                  href={member.email ? `mailto:${member.email}` : undefined}
                  aria-label={`Email ${member.name}`}
                  className={cn(iconLink, !member.email && "pointer-events-none opacity-35")}
                >
                  <FiMail aria-hidden="true" className="size-4" />
                </ActionLink>
                <ActionLink
                  href={member.linkedin}
                  aria-label={`${member.name} on LinkedIn`}
                  className={cn(iconLink, !member.linkedin && "pointer-events-none opacity-35")}
                >
                  <FiLinkedin aria-hidden="true" className="size-4" />
                </ActionLink>
              </div>
            </div>
          </li>
        ))}
        <li className="flex flex-col gap-4">
          <div className="relative flex aspect-[4/5] items-center justify-center rounded-xl border border-dashed border-white/18">
            <span className="flex size-12 items-center justify-center rounded-full ring-1 ring-white/18 text-fg-secondary">
              <FiPlus aria-hidden="true" className="size-5" />
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="text-lg leading-[1.25] font-light tracking-[-0.01em] sm:text-xl">{team.more.title}</h3>
            <p className="text-sm text-fg-tertiary">{team.more.note}</p>
          </div>
        </li>
      </ul>
    </Section>
  );
}
