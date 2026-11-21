"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { submitForm } from "@/app/actions";
import { initialFormState, type FormName } from "@/lib/forms";

/** Wires a form to the shared server action and keeps the fields filled in when it answers with an error. */
export function useServerForm(form: FormName) {
  const [state, formAction, pending] = useActionState(submitForm.bind(null, form), initialFormState);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    // A form action resets the fields once it settles; submitting by hand does not.
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return { state, formAction, pending, onSubmit };
}
