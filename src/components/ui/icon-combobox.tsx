'use client';

import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ComboOption = {
  id: string;
  label: string;
  sublabel?: string;
  visual?: ReactNode;
  /** Extra string to match against when filtering (besides label/sublabel). */
  searchHaystack?: string;
};

type Props = {
  label?: string;
  options: ComboOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
  /**
   * When true, the trigger itself is a text input — focus opens the popover
   * and typing filters the list directly, no extra search step. Useful for
   * typeahead-style pickers (e.g. "Buscar tramo"). Implies `searchable`.
   */
  triggerAsInput?: boolean;
};

/**
 * Generic combobox with optional left-aligned visual (avatar, image, icon).
 * The visual is supplied per-option, so the same component renders piloto
 * (avatar), coche (photo), and clima/hora (svg icons).
 */
export function IconCombobox({
  label,
  options,
  value,
  onChange,
  placeholder = 'Seleccionar…',
  searchable = false,
  className,
  triggerAsInput = false,
}: Props) {
  const isSearchable = searchable || triggerAsInput;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [popoverRect, setPopoverRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.id === value) ?? null;

  const filtered = useMemo(() => {
    if (!isSearchable) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = [o.label, o.sublabel, o.searchHaystack]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [options, query, isSearchable]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Track trigger position so the portal can render the popover anchored to
  // it. Recompute on scroll/resize so the popover stays attached.
  useEffect(() => {
    if (!open) {
      setPopoverRect(null);
      return;
    }
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setPopoverRect({ top: rect.bottom, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    // In trigger-as-input mode, focus already lives in the trigger so we
    // skip the auto-focus step. Otherwise focus the popover's search input
    // when the dropdown opens.
    if (open && searchable && !triggerAsInput) inputRef.current?.focus();
    if (!open) setQuery('');
  }, [open, searchable, triggerAsInput]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) {
        onChange(opt.id);
        setOpen(false);
        if (triggerAsInput) setQuery('');
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={['relative flex flex-col gap-1 text-sm', className ?? ''].join(' ')}
    >
      {label ? <span className="text-foreground/80">{label}</span> : null}
      {triggerAsInput ? (
        <div
          ref={(el) => {
            triggerRef.current = el;
          }}
          className="border-foreground/15 bg-background focus-within:border-primary focus-within:ring-primary/30 flex min-h-[42px] items-center gap-2 rounded-md border px-3 py-1.5 focus-within:ring-2"
        >
          <Search size={14} className="text-foreground/50 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            autoComplete="off"
            className="placeholder:text-foreground/50 flex-1 bg-transparent outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="text-foreground/50 hover:text-foreground shrink-0"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      ) : (
        <button
          ref={(el) => {
            triggerRef.current = el;
          }}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          className="border-foreground/15 bg-background hover:bg-foreground/5 flex min-h-[42px] items-center gap-2 rounded-md border px-3 py-1.5 text-left"
        >
          {selected ? (
            <>
              {selected.visual}
              <span className="flex min-w-0 flex-1 flex-col">
                {selected.sublabel ? (
                  <span className="text-foreground/50 truncate text-xs">
                    {selected.sublabel}
                  </span>
                ) : null}
                <span className="truncate font-medium">{selected.label}</span>
              </span>
            </>
          ) : (
            <span className="text-foreground/50 flex-1">{placeholder}</span>
          )}
          <ChevronDown size={16} className="text-foreground/50 shrink-0" />
        </button>
      )}

      {open && popoverRect && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={popoverRef}
              style={{
                position: 'fixed',
                top: popoverRect.top + 4,
                left: popoverRect.left,
                width: popoverRect.width,
                zIndex: 60,
              }}
              className="border-foreground/15 bg-background rounded-md border shadow-lg"
            >
              {searchable && !triggerAsInput ? (
                <div className="border-foreground/10 flex items-center gap-2 border-b px-3 py-2">
                  <Search size={14} className="text-foreground/50" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent outline-none"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Limpiar búsqueda"
                      className="text-foreground/50 hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              ) : null}
              <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <li className="text-foreground/50 px-3 py-2 text-sm">Sin resultados</li>
                ) : (
                  filtered.map((opt, i) => {
                    const isSelected = opt.id === value;
                    const isActive = i === activeIndex;
                    return (
                      <li key={opt.id} role="option" aria-selected={isSelected}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(i)}
                          onClick={() => {
                            onChange(opt.id);
                            setOpen(false);
                            if (triggerAsInput) setQuery('');
                          }}
                          className={[
                            'flex w-full items-center gap-2 px-3 py-2 text-left',
                            isActive ? 'bg-foreground/5' : '',
                            isSelected ? 'text-primary' : '',
                          ].join(' ')}
                        >
                          {opt.visual}
                          <span className="flex min-w-0 flex-1 flex-col">
                            {opt.sublabel ? (
                              <span className="text-foreground/50 truncate text-xs">
                                {opt.sublabel}
                              </span>
                            ) : null}
                            <span className="truncate font-medium">{opt.label}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
