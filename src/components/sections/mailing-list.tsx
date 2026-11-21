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
    return <FormStatus state={state} className="mt-10 text-lg" />;
  }

  return (
    <Form action={formAction} onSubmit={onSubmit} errors={state.errors} className="mt-10 flex w-full max-w-md flex-col gap-3">
      <Field.Root name="email" className="flex flex-col gap-2">
        <Field.Label className="sr-only">Email</Field.Label>
        {/* The field and its button as one pill: the button sits inside the field's end. */}
        <div className="flex h-14 items-center gap-2 rounded-full border border-fg/60 py-1.5 pr-1.5 pl-5 transition-colors focus-within:border-fg">
          <Field.Control
            type="email"
            required
            placeholder="Your email"
            autoComplete="email"
            className="h-full min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg/75"
          />
          <button type="submit" disabled={pending} className={buttonClass("inverse", "h-full px-5 text-[0.9375rem]")}>
            Subscribe
          </button>
        </div>
        <Field.Error className="text-sm text-fg" />
      </Field.Root>
      <p className="text-sm text-fg-secondary">{mailingList.note}</p>
      {/* On crimson the status keeps the text colour; the accent tint would not be readable. */}
      <FormStatus state={state} className="text-fg" />
    </Form>
  );
}

/** The mailing list: one centred column, the title, a line and the form under it. */
export function MailingList() {
  return (
    <section id="mailing-list" aria-labelledby="mailing-list-label" className="scheme-crimson relative">
      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-20 text-center md:px-10 lg:py-28">
        <h2 id="mailing-list-label" className="text-sm font-medium text-fg-secondary">
          Mailing list
        </h2>
        <p className="mt-5 text-5xl leading-[1.02] font-light tracking-[-0.035em] lg:text-7xl">{mailingList.title}</p>
        <p className="mt-6 max-w-md text-lg text-pretty text-fg-secondary">{mailingList.body}</p>
        <MailingListForm />
      </div>
    </section>
  );
}
