"use client";

import type { ReactNode } from "react";
import { Checkbox } from "@base-ui/react/checkbox";
import { CheckboxGroup } from "@base-ui/react/checkbox-group";
import { Field } from "@base-ui/react/field";
import { Fieldset } from "@base-ui/react/fieldset";
import { NumberField } from "@base-ui/react/number-field";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { FiCheck, FiMinus, FiPlus } from "react-icons/fi";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/forms";

const labelClass = "text-sm text-fg-secondary";
const errorClass = "text-sm text-accent-fg";
const controlClass =
  "w-full rounded-xs border border-field bg-raised px-4 text-base text-fg placeholder:text-fg-tertiary";
const checkboxClass =
  "flex size-5 shrink-0 items-center justify-center rounded-xs border border-field data-checked:border-accent data-checked:bg-accent";
const cardClass = "flex items-center gap-3.5 rounded-xs border border-field px-4 has-checked:border-fg";

function CheckMark() {
  return (
    <Checkbox.Indicator className="flex text-fg">
      <FiCheck aria-hidden="true" className="size-3.5" />
    </Checkbox.Indicator>
  );
}

type TextFieldProps = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel";
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
};

export function TextField({ name, label, type = "text", placeholder, autoComplete, required }: TextFieldProps) {
  return (
    <Field.Root name={name} className="flex flex-col gap-2">
      <Field.Label className={labelClass}>{label}</Field.Label>
      <Field.Control
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(controlClass, "h-13")}
      />
      <Field.Error className={errorClass} />
    </Field.Root>
  );
}

export function TextAreaField({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <Field.Root name={name} className="flex flex-col gap-2">
      <Field.Label className={labelClass}>{label}</Field.Label>
      <Field.Control
        render={<textarea rows={4} />}
        placeholder={placeholder}
        className={cn(controlClass, "py-3.5")}
      />
      <Field.Error className={errorClass} />
    </Field.Root>
  );
}

type GroupProps = {
  name: string;
  /** Names the group. Hidden visually when a heading above already says it. */
  legend: string;
  hideLegend?: boolean;
};

/** Single choice shown as a row of squared options. */
export function ChoiceChips({
  name,
  legend,
  hideLegend,
  options,
  defaultValue,
  required,
}: GroupProps & { options: readonly string[]; defaultValue?: string; required?: boolean }) {
  return (
    <Field.Root name={name} className="flex flex-col gap-2">
      <Fieldset.Root
        render={<RadioGroup defaultValue={defaultValue} required={required} className="flex flex-wrap gap-2" />}
      >
        <Fieldset.Legend className={cn(labelClass, "w-full", hideLegend && "sr-only")}>{legend}</Fieldset.Legend>
        {options.map((option) => (
          <Radio.Root
            key={option}
            value={option}
            className="inline-flex h-11 cursor-default items-center rounded-xs border border-field px-4 text-sm text-fg select-none data-checked:border-fg data-checked:bg-fg data-checked:font-medium data-checked:text-ground"
          >
            {option}
          </Radio.Root>
        ))}
      </Fieldset.Root>
      <Field.Error className={errorClass} />
    </Field.Root>
  );
}

type CardOption = { value: string; title: string; meta?: string; prefix?: string };

function CardText({ option }: { option: CardOption }) {
  return (
    <>
      {option.prefix ? <span className="w-6 shrink-0 text-sm text-fg-tertiary">{option.prefix}</span> : null}
      <span className="flex flex-col">
        <span className={cn("text-base text-fg", option.meta && "font-medium")}>{option.title}</span>
        {option.meta ? <span className="text-sm text-fg-tertiary">{option.meta}</span> : null}
      </span>
    </>
  );
}

/** Multiple choice shown as bordered cells with a checkbox. */
export function CheckboxCards({
  name,
  legend,
  hideLegend,
  options,
  defaultValue,
}: GroupProps & { options: readonly CardOption[]; defaultValue?: string[] }) {
  return (
    <Field.Root name={name} className="flex flex-col gap-2">
      <Fieldset.Root
        render={<CheckboxGroup defaultValue={defaultValue} className="grid gap-x-5 gap-y-3 sm:grid-cols-2" />}
      >
        <Fieldset.Legend className={cn(labelClass, "col-span-full", hideLegend && "sr-only")}>{legend}</Fieldset.Legend>
        {options.map((option) => (
          <Field.Item key={option.value}>
            <Field.Label className={cn(cardClass, option.meta ? "h-18" : "h-14")}>
              <Checkbox.Root value={option.value} className={checkboxClass}>
                <CheckMark />
              </Checkbox.Root>
              <CardText option={option} />
            </Field.Label>
          </Field.Item>
        ))}
      </Fieldset.Root>
      <Field.Error className={errorClass} />
    </Field.Root>
  );
}

/** Single choice shown as bordered cells with a radio mark. */
export function RadioCards({
  name,
  legend,
  hideLegend,
  options,
  required,
}: GroupProps & { options: readonly CardOption[]; required?: boolean }) {
  return (
    <Field.Root name={name} className="flex flex-col gap-2">
      <Fieldset.Root render={<RadioGroup required={required} className="grid gap-x-5 gap-y-3 sm:grid-cols-3" />}>
        <Fieldset.Legend className={cn(labelClass, "col-span-full", hideLegend && "sr-only")}>{legend}</Fieldset.Legend>
        {options.map((option) => (
          <Field.Item key={option.value}>
            <Field.Label className={cn(cardClass, "h-18")}>
              <Radio.Root
                value={option.value}
                className="flex size-5 shrink-0 items-center justify-center rounded-full border border-field data-checked:border-accent-fg"
              >
                <Radio.Indicator className="size-2.5 rounded-full bg-accent-fg" />
              </Radio.Root>
              <CardText option={option} />
            </Field.Label>
          </Field.Item>
        ))}
      </Fieldset.Root>
      <Field.Error className={errorClass} />
    </Field.Root>
  );
}

/** One checkbox with its sentence, for consents. */
export function CheckboxField({
  name,
  children,
  required,
  className,
}: {
  name: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <Field.Root name={name} className="flex flex-col gap-1.5">
      <Field.Label className={cn("flex items-start gap-3 text-base text-fg", className)}>
        <Checkbox.Root required={required} className={cn(checkboxClass, "mt-0.5")}>
          <CheckMark />
        </Checkbox.Root>
        <span>{children}</span>
      </Field.Label>
      <Field.Error className={cn(errorClass, "pl-8")} />
    </Field.Root>
  );
}

/** Minus, value, plus. */
export function QuantityField({
  name,
  label,
  value,
  onValueChange,
}: {
  name: string;
  label: string;
  value: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <Field.Root name={name}>
      <NumberField.Root value={value} onValueChange={(next) => onValueChange(next ?? 1)} min={1}>
        <NumberField.Group className="flex h-10 items-center rounded-xs border border-field">
          <NumberField.Decrement
            aria-label={`Decrease ${label.toLowerCase()}`}
            className="flex h-full w-9 items-center justify-center text-fg disabled:text-fg-tertiary"
          >
            <FiMinus aria-hidden="true" className="size-4" />
          </NumberField.Decrement>
          <NumberField.Input
            aria-label={label}
            className="w-7 bg-transparent text-center text-sm text-fg tabular-nums"
          />
          <NumberField.Increment
            aria-label={`Increase ${label.toLowerCase()}`}
            className="flex h-full w-9 items-center justify-center text-fg disabled:text-fg-tertiary"
          >
            <FiPlus aria-hidden="true" className="size-4" />
          </NumberField.Increment>
        </NumberField.Group>
      </NumberField.Root>
    </Field.Root>
  );
}

/** The result of a submission, announced and shown next to the submit button. */
export function FormStatus({ state, className }: { state: FormState; className?: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn("text-sm empty:hidden", state.status === "error" ? "text-accent-fg" : "text-fg", className)}
    >
      {state.message}
    </p>
  );
}
