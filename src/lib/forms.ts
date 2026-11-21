export type FormName =
  | "pre-registration"
  | "mailing-list"
  | "summit-registration"
  | "gala-registration";

export type FormState = {
  status: "idle" | "success" | "error";
  message: string;
  /** Keyed by field name, shown next to the field. */
  errors: Record<string, string>;
};

export const initialFormState: FormState = {
  status: "idle",
  message: "",
  errors: {},
};
