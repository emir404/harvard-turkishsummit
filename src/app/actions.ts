"use server";

import type { FormName, FormState } from "@/lib/forms";

const requiredFields: Record<FormName, string[]> = {
  "mailing-list": ["email"],
  "pre-registration": ["firstName", "lastName", "email"],
  "summit-registration": ["firstName", "lastName", "email", "organization", "terms", "media"],
  "gala-registration": ["firstName", "lastName", "email", "organization", "summitAttendance", "terms", "media"],
};

const successMessages: Record<FormName, string> = {
  "mailing-list": "Thanks. You are on the list.",
  "pre-registration": "Thanks. You are pre-registered and will hear from us first.",
  "summit-registration": "Thanks. Your details were received.",
  "gala-registration": "Thanks. Your details were received.",
};

const unavailable = "We could not send this right now. Please try again later or email the organizers.";

/**
 * Validates a form and forwards it as JSON to FORMS_ENDPOINT. Nothing is
 * stored by the site itself, so without that variable a submission fails
 * visibly rather than appearing to succeed.
 */
export async function submitForm(form: FormName, _previous: FormState, formData: FormData): Promise<FormState> {
  const fields: Record<string, string | string[]> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = formData.getAll(key).filter((value): value is string => typeof value === "string");
    fields[key] = values.length > 1 ? values : (values[0] ?? "");
  }

  const errors: Record<string, string> = {};
  for (const name of requiredFields[form]) {
    const value = fields[name];
    if (value === undefined || (typeof value === "string" && value.trim() === "")) {
      errors[name] = "This field is required.";
    }
  }
  const email = typeof fields.email === "string" ? fields.email.trim() : "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Email needs an @ symbol and a domain, for example name@example.com.";
  }
  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "Please check the fields marked above.", errors };
  }

  const endpoint = process.env.FORMS_ENDPOINT;
  if (!endpoint) {
    console.warn(`[forms] FORMS_ENDPOINT is not set, so the "${form}" submission was not delivered.`);
    return { status: "error", message: unavailable, errors: {} };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ form, submittedAt: new Date().toISOString(), fields }),
    });
    if (!response.ok) {
      throw new Error(`Forms endpoint responded with ${response.status}`);
    }
  } catch (error) {
    console.error(`[forms] Could not deliver the "${form}" submission.`, error);
    return { status: "error", message: unavailable, errors: {} };
  }

  return { status: "success", message: successMessages[form], errors: {} };
}
