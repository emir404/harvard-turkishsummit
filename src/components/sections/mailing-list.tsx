"use client";

import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { buttonClass } from "@/components/ui/action-link";
import { FormStatus } from "@/components/ui/form-fields";
import { mailingList } from "@/content/summit";
import { useServerForm } from "@/lib/use-server-form";

function MailingListForm() {
  const { state, formAction, pending, onSubmit } = useServerForm("mailing-list");

  if (state.status === "success") {
    return <FormStatus state={state} className="mt-8 text-lg" />;
  }

  return (
    <Form action={formAction} onSubmit={onSubmit} errors={state.errors} className="mt-8 flex flex-col gap-3">
      <Field.Root name="email" className="flex flex-col gap-2">
        <Field.Label className="sr-only">Email</Field.Label>
        <div className="flex flex-wrap gap-3">
          <Field.Control
            type="email"
            required
            placeholder="Your email"
            autoComplete="email"
            className="h-13 min-w-0 flex-1 basis-60 rounded-xs border border-fg bg-transparent px-4 text-base text-fg placeholder:text-fg/85"
          />
          <button type="submit" disabled={pending} className={buttonClass("inverse")}>
            Subscribe
          </button>
        </div>
        <Field.Error className="text-sm text-fg" />
      </Field.Root>
      <p className="text-sm text-fg">{mailingList.note}</p>
      {/* On crimson the status keeps the text colour; the accent tint would not be readable. */}
      <FormStatus state={state} className="text-fg" />
    </Form>
  );
}

export function MailingList() {
  return (
    <section
      id="mailing-list"
      aria-labelledby="mailing-list-label"
      className="grid gap-x-5 gap-y-10 bg-accent px-5 py-16 md:px-10 lg:grid-cols-2 lg:py-24"
    >
      <div className="flex flex-col">
        <h2 id="mailing-list-label" className="text-sm text-fg">
          Mailing list
        </h2>
        <p className="mt-10 text-5xl font-medium tracking-tight text-fg lg:mt-14 lg:text-6xl">{mailingList.title}</p>
      </div>
      <div className="flex flex-col justify-end">
        <p className="max-w-lg text-lg text-pretty text-fg">{mailingList.body}</p>
        <MailingListForm />
      </div>
    </section>
  );
}
