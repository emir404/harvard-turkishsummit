"use client";

import { Form } from "@base-ui/react/form";
import { FiArrowRight } from "react-icons/fi";
import { buttonClass } from "@/components/ui/action-link";
import { CheckboxCards, CheckboxField, ChoiceChips, FormStatus, TextField } from "@/components/ui/form-fields";
import { attendeeTypes, event } from "@/content/summit";
import { useServerForm } from "@/lib/use-server-form";

const interests = [
  { value: "summit", title: "Summit", meta: `Day program · ${event.summitHours}` },
  { value: "gala", title: "Gala", meta: `Evening · ${event.galaHours}` },
];

export function PreRegistrationForm() {
  const { state, formAction, pending, onSubmit } = useServerForm("pre-registration");

  if (state.status === "success") {
    return <FormStatus state={state} className="text-lg" />;
  }

  return (
    <Form action={formAction} onSubmit={onSubmit} errors={state.errors} className="flex flex-col gap-6">
      <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
        <TextField name="firstName" label="First name" placeholder="Ayşe" autoComplete="given-name" required />
        <TextField name="lastName" label="Last name" placeholder="Yılmaz" autoComplete="family-name" required />
      </div>
      <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
        <TextField name="email" type="email" label="Email" placeholder="you@example.com" autoComplete="email" required />
        <TextField
          name="organization"
          label="University or organization"
          placeholder="University or company"
          autoComplete="organization"
        />
      </div>
      <ChoiceChips name="attendeeType" legend="I am a" options={attendeeTypes} defaultValue="Student" />
      <CheckboxCards name="interest" legend="I’m interested in" options={interests} defaultValue={["summit"]} />
      <CheckboxField name="mailingList" className="text-fg-secondary">
        Also add me to the mailing list for summit news and announcements.
      </CheckboxField>
      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-4">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          Pre-register
          <FiArrowRight aria-hidden="true" className="size-4" />
        </button>
        <p className="max-w-xs text-sm text-fg-tertiary">
          By pre-registering you agree to our Privacy Policy. Unsubscribe anytime.
        </p>
      </div>
      <FormStatus state={state} />
    </Form>
  );
}
