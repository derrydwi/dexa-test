import { useId, type ComponentProps } from "react";
import { Input } from "./ui/input";
import {
  Field as UiField,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "./ui/field";

export function Field({
  label,
  hint,
  error,
  ...props
}: ComponentProps<typeof Input> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const id = useId();

  return (
    <UiField data-invalid={!!error} className="mb-[19px] gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-invalid={!!error}
        aria-describedby={
          [hint && `${id}-hint`, error && `${id}-error`]
            .filter(Boolean)
            .join(" ") || undefined
        }
        {...props}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      {hint && (
        <FieldDescription className="text-xs" id={`${id}-hint`}>
          {hint}
        </FieldDescription>
      )}
    </UiField>
  );
}
