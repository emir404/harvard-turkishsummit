"use client";

import { Form } from "@base-ui/react/form";
import { useState, type ReactNode } from "react";
import { FiArrowRight, FiLock } from "react-icons/fi";
import { ActionLink, buttonClass, textLinkClass } from "@/components/ui/action-link";
import { back, ticketSwitch } from "@/lib/page-transition";
import {
  CheckboxCards,
  CheckboxField,
  ChoiceChips,
  FormStatus,
  QuantityField,
  RadioCards,
  TextAreaField,
  TextField,
} from "@/components/ui/form-fields";
import { attendeeTypes, dietaryOptions, event, links, panels } from "@/content/summit";
import { useServerForm } from "@/lib/use-server-form";

export type Ticket = "summit" | "gala";

const copy = {
  summit: {
    form: "summit-registration",
    kicker: "Summit pass",
    name: "Harvard Türkiye Summit",
    line: "Summit Pass",
    hours: event.summitHours,
    venue: event.venueShort,
    dietaryTitle: "Lunch and accessibility",
    crossSell: {
      kicker: `Gala · ${event.galaHours}`,
      title: "Joining us in the evening too? The Gala is ticketed separately.",
      action: "Register for the Gala",
      href: links.registerGala,
    },
  },
  gala: {
    form: "gala-registration",
    kicker: "Gala",
    name: "The Summit Gala",
    line: "Gala ticket",
    hours: event.galaHours,
    venue: "Venue to be announced",
    dietaryTitle: "Reception and accessibility",
    crossSell: {
      kicker: `Summit pass · ${event.summitHours}`,
      title: "Attending the daytime program too? The Summit Pass is ticketed separately.",
      action: "Register for the Summit",
      href: links.registerSummit,
    },
  },
} as const;

const panelOptions = panels.map((panel) => ({ value: panel.area, title: panel.area, prefix: panel.numeral }));

const summitAttendanceOptions = [
  { value: "yes", title: "Yes", meta: "I have a Summit Pass" },
  { value: "not-yet", title: "Not yet", meta: "Remind me to register" },
  { value: "gala-only", title: "Gala only", meta: "Evening program only" },
];

function FormSection({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-12 flex flex-col gap-6 border-t border-rule pt-6">
      <div className="flex flex-wrap items-baseline gap-x-4">
        <span className="w-5 shrink-0 text-sm text-fg-tertiary tabular-nums">{number}</span>
        <h2 className="text-2xl font-medium tracking-tight text-fg">{title}</h2>
        {hint ? <span className="text-sm text-fg-tertiary">{hint}</span> : null}
      </div>
      <div className="flex flex-col gap-6 sm:pl-9">{children}</div>
    </section>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-t border-rule py-3 text-sm">
      <dt className="text-fg-tertiary">{label}</dt>
      <dd className="text-right text-fg">{children}</dd>
    </div>
  );
}

export function RegistrationForm({ ticket, intro }: { ticket: Ticket; intro: ReactNode }) {
  const content = copy[ticket];
  const { state, formAction, pending, onSubmit } = useServerForm(content.form);
  const [quantity, setQuantity] = useState(1);

  return (
    <Form
      action={formAction}
      onSubmit={onSubmit}
      errors={state.errors}
      className="grid gap-x-5 gap-y-16 lg:grid-cols-12"
    >
      <div className="flex flex-col lg:col-span-8 lg:pr-28">
        {intro}
        <FormSection number={1} title="Attendee type">
          <ChoiceChips
            name="attendeeType"
            legend="Attendee type"
            hideLegend
            options={attendeeTypes}
            defaultValue="Student"
          />
        </FormSection>

        <FormSection number={2} title="Your details">
          <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
            <TextField name="firstName" label="First name" placeholder="Ayşe" autoComplete="given-name" required />
            <TextField name="lastName" label="Last name" placeholder="Yılmaz" autoComplete="family-name" required />
            <TextField
              name="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <TextField
              name="phone"
              type="tel"
              label="Phone (optional)"
              placeholder="+1 617 000 0000"
              autoComplete="tel"
            />
            <TextField
              name="organization"
              label="University or organization"
              placeholder="Harvard University"
              autoComplete="organization"
              required
            />
            <TextField
              name="role"
              label="Role or title"
              placeholder="Student, Class of 2028"
              autoComplete="organization-title"
            />
          </div>
        </FormSection>

        {ticket === "summit" ? (
          <FormSection number={3} title="Panels you are most interested in" hint="Optional, choose any">
            <CheckboxCards
              name="panels"
              legend="Panels you are most interested in"
              hideLegend
              options={panelOptions}
            />
          </FormSection>
        ) : (
          <FormSection number={3} title="Are you also attending the Summit?">
            <RadioCards
              name="summitAttendance"
              legend="Are you also attending the Summit?"
              hideLegend
              options={summitAttendanceOptions}
              required
            />
          </FormSection>
        )}

        <FormSection number={4} title={content.dietaryTitle}>
          <ChoiceChips
            name="dietary"
            legend="Dietary requirements"
            hideLegend
            options={dietaryOptions}
            defaultValue="No requirements"
          />
          <TextAreaField
            name="accessibility"
            label="Accessibility needs (optional)"
            placeholder="Let us know about any accommodations we can arrange."
          />
        </FormSection>

        <div className="mt-12 flex flex-col gap-3.5 border-t border-rule pt-6">
          <CheckboxField name="terms" required>
            I agree to the Terms of Service and Privacy Policy.
          </CheckboxField>
          <CheckboxField name="media" required>
            I understand photos and video may be taken during the event.
          </CheckboxField>
          <CheckboxField name="mailingList">Add me to the mailing list for future summit news.</CheckboxField>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            Continue to payment
            <FiArrowRight aria-hidden="true" className="size-4" />
          </button>
          <ActionLink href="/#tickets" transitionTypes={back} className={textLinkClass}>
            Back to tickets
          </ActionLink>
        </div>
        <FormStatus state={state} className="mt-4" />
      </div>

      <aside aria-label="Order summary" className="flex flex-col gap-5 lg:col-span-4">
        <div className="flex flex-col border border-rule p-6 sm:p-8">
          <h2 className="text-sm text-fg-tertiary">Order summary</h2>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <p className="flex flex-col gap-1">
              <span className="text-sm text-fg-tertiary">{content.kicker}</span>
              <span className="text-2xl font-medium tracking-tight text-fg">{content.name}</span>
            </p>
            <QuantityField name="quantity" label="Quantity" value={quantity} onValueChange={setQuantity} />
          </div>
          <dl className="mt-6">
            <SummaryRow label="Date">
              <time dateTime={event.date}>{event.dateLabel}</time>
            </SummaryRow>
            <SummaryRow label="Time">
              <span className="tabular-nums">{content.hours}</span>
            </SummaryRow>
            <SummaryRow label="Venue">{content.venue}</SummaryRow>
            <SummaryRow label={`${content.line} × ${quantity}`}>To be announced</SummaryRow>
            <div className="flex items-baseline justify-between border-t border-field pt-5">
              <dt className="text-base font-medium text-fg">Total</dt>
              <dd className="text-2xl font-medium text-fg">TBA</dd>
            </div>
          </dl>
          <p className="mt-8 flex items-center gap-2.5 text-sm text-fg-tertiary">
            <FiLock aria-hidden="true" className="size-4 shrink-0" />
            Payment details are collected in the next step.
          </p>
        </div>

        <div className="flex flex-col border border-rule p-6 sm:p-8">
          <p className="text-sm text-fg-tertiary tabular-nums">{content.crossSell.kicker}</p>
          <p className="mt-3 text-xl text-pretty text-fg">{content.crossSell.title}</p>
          <ActionLink href={content.crossSell.href} transitionTypes={ticketSwitch} className={`${textLinkClass} mt-6`}>
            {content.crossSell.action}
            <FiArrowRight aria-hidden="true" className="size-4" />
          </ActionLink>
        </div>
      </aside>
    </Form>
  );
}
