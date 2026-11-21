import { FiArrowRight } from "react-icons/fi";
import { ActionLink, textLinkClass } from "@/components/ui/action-link";
import { Lead, Section, SectionHeader, Statement } from "@/components/ui/section";
import { speakers } from "@/content/summit";
import { cn } from "@/lib/cn";

export function Speakers() {
  return (
    <Section id="speakers">
      <SectionHeader id="speakers" label="Speakers">
        <Statement>{speakers.title}</Statement>
        <Lead className="mt-4">{speakers.subtitle}</Lead>
        <ActionLink href="/#contact" className={cn(textLinkClass, "mt-8")}>
          Speaker inquiries
          <FiArrowRight aria-hidden="true" className="size-4" />
        </ActionLink>
      </SectionHeader>

      <ul className="mt-12 grid border-t border-l border-rule sm:grid-cols-2 lg:mt-18 lg:grid-cols-5">
        {speakers.slots.map((slot) => (
          <li
            key={slot.tag}
            className="flex min-h-40 flex-col justify-between gap-8 border-r border-b border-rule p-5 lg:h-70"
          >
            <span className="text-sm text-fg-tertiary">{slot.tag}</span>
            <span className="flex flex-col gap-2">
              <span className="text-row font-medium text-fg">{slot.role}</span>
              <span className="text-sm text-fg-tertiary">To be announced</span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
