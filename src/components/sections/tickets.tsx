import { FiArrowRight } from "react-icons/fi";
import { PreRegistrationForm } from "@/components/sections/pre-registration-form";
import { ActionLink, buttonClass } from "@/components/ui/action-link";
import { Lead, Section, SectionHeader, SectionLabel, Statement } from "@/components/ui/section";
import { preRegistration, tickets } from "@/content/summit";

export function Tickets() {
  return (
    <Section id="tickets">
      <SectionHeader id="tickets" label="Tickets">
        <Statement>{tickets.title}</Statement>
        <Lead className="mt-4">{tickets.intro}</Lead>
      </SectionHeader>

      <div className="mt-12 grid gap-x-5 gap-y-16 lg:mt-18 lg:grid-cols-2">
        {tickets.options.map((ticket) => (
          <article key={ticket.id} className="flex flex-col border-t border-rule pt-5">
            <p className="flex justify-between text-sm text-fg-tertiary">
              <span>{ticket.kicker}</span>
              <span className="tabular-nums">{ticket.hours}</span>
            </p>
            <h3 className="mt-10 text-3xl font-medium tracking-tight text-fg lg:mt-14 lg:text-4xl">{ticket.title}</h3>
            <p className="mt-3 text-base text-fg-secondary">{ticket.meta}</p>
            <ul className="mt-8 border-b border-rule">
              {ticket.includes.map((line) => (
                <li key={line} className="border-t border-rule py-3.5 text-base text-fg">
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
              <p className="flex flex-col gap-1">
                <span className="text-sm text-fg-tertiary">Price</span>
                <span className="text-xl text-fg">{ticket.price}</span>
              </p>
              <ActionLink href={ticket.href} className={buttonClass("outline")}>
                {ticket.action}
                <FiArrowRight aria-hidden="true" className="size-4" />
              </ActionLink>
            </div>
          </article>
        ))}
      </div>

      <div
        id="pre-register"
        className="mt-16 grid gap-x-5 gap-y-12 border-t border-rule pt-6 lg:mt-24 lg:grid-cols-2"
      >
        <div className="flex flex-col">
          <SectionLabel as="h3">Pre-registration</SectionLabel>
          <p className="mt-10 text-3xl font-medium tracking-tight text-fg lg:mt-14 lg:text-4xl">
            {preRegistration.title}
          </p>
          <Lead className="mt-4 max-w-lg">{preRegistration.body}</Lead>
          <ol className="mt-10 max-w-lg border-b border-rule">
            {preRegistration.steps.map((step, index) => (
              <li key={step} className="flex gap-4 border-t border-rule py-3.5 text-base">
                <span className="w-5 shrink-0 text-fg-tertiary tabular-nums">{index + 1}</span>
                <span className="text-fg">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <PreRegistrationForm />
      </div>
    </Section>
  );
}
