'use client';

import type { SelectHTMLAttributes } from 'react';

type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};

/**
 * Lightweight native <select> styled with Tailwind. HeroUI's full Select is a
 * react-aria-components combobox primitive, which is overkill for the simple
 * dropdowns this app needs (filters, enum pickers).
 */
export function NativeSelect({
  label,
  options,
  placeholder,
  className,
  ...rest
}: NativeSelectProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label ? <span className="text-foreground/80">{label}</span> : null}
      <select
        {...rest}
        className={[
          'border-foreground/15 bg-background focus:border-primary focus:ring-primary/40 rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none',
          className ?? '',
        ].join(' ')}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
