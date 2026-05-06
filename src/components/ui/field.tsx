'use client';

import { FieldError, Input, Label, TextField } from '@heroui/react';
import type { ComponentProps } from 'react';

type TextFieldProps = ComponentProps<typeof TextField>;

export type FieldProps = TextFieldProps & {
  label: string;
  errorMessage?: string;
  inputProps?: Omit<ComponentProps<typeof Input>, 'name' | 'type'>;
  type?: ComponentProps<typeof Input>['type'];
};

/**
 * Convenience wrapper: TextField + Label + Input + FieldError.
 * HeroUI v3 splits these intentionally; this keeps form code tidy.
 */
export function Field({
  label,
  errorMessage,
  inputProps,
  type,
  isInvalid,
  ...rest
}: FieldProps) {
  const invalid = isInvalid ?? !!errorMessage;
  return (
    <TextField {...rest} isInvalid={invalid}>
      <Label>{label}</Label>
      <Input type={type} {...inputProps} />
      {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
    </TextField>
  );
}
