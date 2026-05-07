'use client';

import { useId, useRef } from 'react';

const PLACEHOLDER = '00:00.000';

type Props = {
  label: string;
  /** Digits-only state (max 7 chars, fills right-to-left into MM SS mmm). */
  digits: string;
  onChangeDigits: (digits: string) => void;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
};

/**
 * Time input with right-to-left digit entry. Untyped leading digits render in
 * a muted color so the user can see at a glance which positions still hold the
 * placeholder zeros vs. the digits they've entered. Visually mimics the
 * project's `Field` component.
 */
export function MaskedTimeField({
  label,
  digits,
  onChangeDigits,
  isRequired,
  isDisabled,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const value = formatDigits(digits);
  const { gray, white } = splitParts(digits);

  const handleChange = (raw: string) => {
    onChangeDigits(extractDigits(raw));
  };

  return (
    <label
      htmlFor={id}
      className={['flex flex-col gap-1 text-sm', className ?? ''].join(' ')}
    >
      <span className="text-foreground/80">
        {label}
        {isRequired ? <span className="text-danger ml-0.5">*</span> : null}
      </span>
      <div
        onClick={() => inputRef.current?.focus()}
        className={[
          'border-foreground/15 bg-background relative flex min-h-[42px] items-center rounded-md border px-3 py-1.5 cursor-text',
          'focus-within:border-primary focus-within:ring-primary/30 focus-within:ring-2',
          isDisabled ? 'opacity-60 pointer-events-none' : '',
        ].join(' ')}
      >
        <span
          aria-hidden
          className="pointer-events-none font-mono text-base tabular-nums leading-none"
        >
          {digits ? (
            <>
              <span className="text-foreground/30">{gray}</span>
              <span className="text-foreground">{white}</span>
            </>
          ) : (
            <span className="text-foreground/30">{PLACEHOLDER}</span>
          )}
        </span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isDisabled}
          required={isRequired}
          inputMode="numeric"
          autoComplete="off"
          aria-label={label}
          className="absolute inset-0 w-full bg-transparent px-3 font-mono text-base tabular-nums leading-none text-transparent caret-current outline-none selection:bg-transparent"
        />
      </div>
    </label>
  );
}

function extractDigits(input: string): string {
  return input.replace(/\D/g, '').slice(-7);
}

function formatDigits(digits: string): string {
  if (!digits) return '';
  const padded = digits.padStart(7, '0');
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}.${padded.slice(4)}`;
}

/**
 * Splits the formatted time into the leading "untyped" portion (rendered
 * muted) and the trailing "typed" portion (rendered foreground). The split
 * lands at the formatted-string index of the first digit the user has
 * actually entered.
 */
function splitParts(digits: string): { gray: string; white: string } {
  if (!digits) return { gray: '', white: '' };
  const formatted = formatDigits(digits);
  // Digit index (0..6) of the first user-typed digit (right-most digits are
  // user-typed; left-most are zero-padded fillers).
  const firstTypedDigitIndex = 7 - digits.length;
  const split = digitIndexToFormattedIndex(firstTypedDigitIndex);
  return {
    gray: formatted.slice(0, split),
    white: formatted.slice(split),
  };
}

/** Maps a 7-digit position (0..6) to the index in the "MM:SS.mmm" string. */
function digitIndexToFormattedIndex(i: number): number {
  if (i < 2) return i;
  if (i < 4) return i + 1;
  return i + 2;
}
