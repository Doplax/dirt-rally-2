'use client';

import { useEffect, useId, useRef, useState } from 'react';

type Segment = 'mm' | 'ss' | 'ms';

const SEGMENTS: ReadonlyArray<{
  key: Segment;
  maxLen: number;
  placeholder: string;
  /** Inclusive maximum value for ArrowUp clamping. */
  max: number;
}> = [
  { key: 'mm', maxLen: 2, placeholder: '00', max: 99 },
  { key: 'ss', maxLen: 2, placeholder: '00', max: 59 },
  { key: 'ms', maxLen: 3, placeholder: '000', max: 999 },
];

type Props = {
  label: string;
  /** Value in milliseconds. `null` means "empty". */
  valueMs: number | null;
  onChange: (valueMs: number | null) => void;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
};

/**
 * Three-segment time input (MM / SS / mmm). Auto-jumps forward when a segment
 * is full, and ArrowLeft / ArrowRight at the input edges navigate between
 * segments. Backspace on an empty segment moves focus to the previous one.
 * Tab works naturally across segments.
 *
 * Public state is just a millisecond number — local segment strings are kept
 * in sync via effect when the parent overrides the value (e.g. form reset).
 */
export function MaskedTimeField({
  label,
  valueMs,
  onChange,
  isRequired,
  isDisabled,
  className,
}: Props) {
  const id = useId();
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ] as const;

  const [segs, setSegs] = useState<[string, string, string]>(() => msToSegs(valueMs));

  // Sync segments with external valueMs changes (parent reset / initial edit).
  // We only adopt the incoming representation if it would render to a
  // different number than what we currently hold — otherwise typing "5" in
  // mm would get bounced back to "05" on the next render and break the caret.
  useEffect(() => {
    setSegs((curr) => (segsToMs(curr) === valueMs ? curr : msToSegs(valueMs)));
  }, [valueMs]);

  const update = (idx: 0 | 1 | 2, raw: string) => {
    const max = SEGMENTS[idx].maxLen;
    const cleaned = raw.replace(/\D/g, '').slice(0, max);
    const next: [string, string, string] = [...segs];
    next[idx] = cleaned;
    setSegs(next);
    onChange(segsToMs(next));
    // Auto-advance to next segment when this one is full.
    if (cleaned.length === max && idx < 2) {
      const target = refs[idx + 1].current;
      target?.focus();
      target?.setSelectionRange(0, 0);
    }
  };

  const bump = (idx: 0 | 1 | 2, delta: 1 | -1) => {
    const { maxLen, max } = SEGMENTS[idx];
    const current = parseInt(segs[idx] || '0', 10);
    const nextNum = Math.max(0, Math.min(max, current + delta));
    const nextStr = String(nextNum).padStart(maxLen, '0');
    const next: [string, string, string] = [...segs];
    next[idx] = nextStr;
    setSegs(next);
    onChange(segsToMs(next));
    // Keep the input fully selected so repeated up/down keeps stepping in place.
    requestAnimationFrame(() => {
      const el = refs[idx].current;
      if (el) el.setSelectionRange(0, el.value.length);
    });
  };

  const onKeyDown = (idx: 0 | 1 | 2) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const atStart = start === 0 && end === 0;
    const atEnd = start === input.value.length && end === input.value.length;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      bump(idx, 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      bump(idx, -1);
    } else if (e.key === 'ArrowLeft' && atStart && idx > 0) {
      e.preventDefault();
      const prev = refs[idx - 1].current;
      prev?.focus();
      prev?.setSelectionRange(prev.value.length, prev.value.length);
    } else if (e.key === 'ArrowRight' && atEnd && idx < 2) {
      e.preventDefault();
      const target = refs[idx + 1].current;
      target?.focus();
      target?.setSelectionRange(0, 0);
    } else if (e.key === 'Backspace' && input.value === '' && idx > 0) {
      e.preventDefault();
      const prev = refs[idx - 1].current;
      prev?.focus();
      prev?.setSelectionRange(prev.value.length, prev.value.length);
    }
  };

  const onBlurPad = (idx: 0 | 1 | 2) => () => {
    const seg = segs[idx];
    const max = SEGMENTS[idx].maxLen;

    if (!seg) {
      // Only fill an empty segment with zeros if the user has actually
      // started entering a time elsewhere. A pristine field stays empty so
      // we don't render "00:00.000" the moment the user tabs through.
      const otherFilled = segs.some((s, i) => i !== idx && s !== '');
      if (!otherFilled) return;
      const next: [string, string, string] = [...segs];
      next[idx] = '0'.repeat(max);
      setSegs(next);
      return;
    }

    const padded = seg.padStart(max, '0');
    if (padded === seg) return;
    const next: [string, string, string] = [...segs];
    next[idx] = padded;
    setSegs(next);
    // No onChange — padded representation parses to the same ms.
  };

  const onFocusSelect = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.select();
  };

  // Show placeholder hints (00 / 00 / 000) only on a fully untouched field.
  // Once the user has typed in any segment, empty siblings render blank so the
  // form doesn't look like every input has been filled with zeros.
  const isPristine = segs.every((s) => s === '');

  const inputBase =
    'w-[2ch] bg-transparent text-center font-mono text-base tabular-nums leading-none outline-none placeholder:text-foreground/30';

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
        className={[
          'border-foreground/15 bg-background flex min-h-[42px] items-center justify-center rounded-md border px-3 py-1.5',
          'focus-within:border-primary focus-within:ring-primary/30 focus-within:ring-2',
          isDisabled ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        <input
          id={id}
          ref={refs[0]}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={`${label} (minutos)`}
          placeholder={isPristine ? SEGMENTS[0].placeholder : ''}
          value={segs[0]}
          onChange={(e) => update(0, e.target.value)}
          onKeyDown={onKeyDown(0)}
          onBlur={onBlurPad(0)}
          onFocus={onFocusSelect}
          disabled={isDisabled}
          required={isRequired}
          maxLength={SEGMENTS[0].maxLen}
          className={inputBase}
        />
        <span className="text-foreground/40 px-0.5">:</span>
        <input
          ref={refs[1]}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={`${label} (segundos)`}
          placeholder={isPristine ? SEGMENTS[1].placeholder : ''}
          value={segs[1]}
          onChange={(e) => update(1, e.target.value)}
          onKeyDown={onKeyDown(1)}
          onBlur={onBlurPad(1)}
          onFocus={onFocusSelect}
          disabled={isDisabled}
          maxLength={SEGMENTS[1].maxLen}
          className={inputBase}
        />
        <span className="text-foreground/40 px-0.5">.</span>
        <input
          ref={refs[2]}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={`${label} (milisegundos)`}
          placeholder={isPristine ? SEGMENTS[2].placeholder : ''}
          value={segs[2]}
          onChange={(e) => update(2, e.target.value)}
          onKeyDown={onKeyDown(2)}
          onBlur={onBlurPad(2)}
          onFocus={onFocusSelect}
          disabled={isDisabled}
          maxLength={SEGMENTS[2].maxLen}
          className={[inputBase, 'w-[3ch]'].join(' ')}
        />
      </div>
    </label>
  );
}

function msToSegs(ms: number | null): [string, string, string] {
  if (ms == null || ms <= 0) return ['', '', ''];
  const total = Math.round(ms);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return [
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
    String(millis).padStart(3, '0'),
  ];
}

function segsToMs(segs: [string, string, string]): number | null {
  if (!segs[0] && !segs[1] && !segs[2]) return null;
  const minutes = parseInt(segs[0] || '0', 10);
  const seconds = parseInt(segs[1] || '0', 10);
  const millis = parseInt(segs[2] || '0', 10);
  return minutes * 60000 + seconds * 1000 + millis;
}
