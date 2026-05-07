'use client';

import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

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
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.id === value) ?? null;

  const filtered = useMemo(() => {
    if (!searchable) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = [o.label, o.sublabel, o.searchHaystack]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [options, query, searchable]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (open && searchable) inputRef.current?.focus();
    if (!open) setQuery('');
  }, [open, searchable]);

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
      <button
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

      {open ? (
        <div className="border-foreground/15 bg-background absolute top-full z-50 mt-1 w-full rounded-md border shadow-lg">
          {searchable ? (
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
        </div>
      ) : null}
    </div>
  );
}
