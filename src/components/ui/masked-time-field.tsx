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
 * a muted color so the user can see at a glance which positions still hold
 * placeholder zeros vs. digits they've entered. Visually mimics the project's
 * `Field` component but the visible text is composed of two real spans (the
 * grey prefix and the typed suffix), with an invisible `<input>` overlaid on
 * top of just the typed portion to handle keyboard input and the caret.
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

  const { gray, white } = splitParts(digits);

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
          'border-foreground/15 bg-background relative flex min-h-[42px] items-center rounded-md border px-3 py-1.5 cursor-text font-mono text-base tabular-nums leading-none',
          'focus-within:border-primary focus-within:ring-primary/30 focus-within:ring-2',
          isDisabled ? 'opacity-60 pointer-events-none' : '',
        ].join(' ')}
      >
        {digits ? (
          <>
            <span className="text-foreground/30">{gray}</span>
            <span className="text-foreground">{white}</span>
          </>
        ) : (
          <span className="text-foreground/30">{PLACEHOLDER}</span>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          // Mirror the visible content so the native caret lands at the end of
          // the typed digits.
          value={digits ? gray + white : ''}
          onChange={(e) => onChangeDigits(extractDigits(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && digits) {
              e.preventDefault();
              onChangeDigits(digits.slice(0, -1));
            }
          }}
          disabled={isDisabled}
          required={isRequired}
          inputMode="numeric"
          autoComplete="off"
          aria-label={label}
          // Hide the input's own glyph rendering on every browser (Webkit
          // honours -webkit-text-fill-color over `color`), but keep the caret
          // visible in the foreground color.
          style={{
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
            caretColor: 'var(--foreground)',
          }}
          className="absolute inset-0 w-full bg-transparent px-3 font-mono text-base tabular-nums leading-none outline-none selection:bg-transparent"
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
