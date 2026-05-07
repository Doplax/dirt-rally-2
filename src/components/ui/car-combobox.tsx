'use client';

import { ChevronDown, Search, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

export type CarOption = {
  id: string;
  name: string;
  className: string;
  photoUrl?: string | null;
};

type Props = {
  label?: string;
  cars: CarOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
};

export function CarCombobox({
  label,
  cars,
  value,
  onChange,
  placeholder = 'Buscar coche…',
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = cars.find((c) => c.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter(
      (c) => c.name.toLowerCase().includes(q) || c.className.toLowerCase().includes(q),
    );
  }, [cars, query]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery('');
  }, [open]);

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
      const car = filtered[activeIndex];
      if (car) {
        onChange(car.id);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={['relative flex flex-col gap-1 text-sm', className ?? ''].join(' ')}>
      {label ? <span className="text-foreground/80">{label}</span> : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="border-foreground/15 bg-background hover:bg-foreground/5 flex min-h-[44px] items-center gap-2 rounded-md border px-3 py-1.5 text-left"
      >
        {selected ? (
          <>
            <CarThumb car={selected} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-foreground/50 truncate text-xs">{selected.className}</span>
              <span className="truncate font-medium">{selected.name}</span>
            </span>
          </>
        ) : (
          <span className="text-foreground/50 flex-1">{placeholder}</span>
        )}
        <ChevronDown size={16} className="text-foreground/50 shrink-0" />
      </button>

      {open ? (
        <div className="border-foreground/15 bg-background absolute top-full z-50 mt-1 w-full rounded-md border shadow-lg">
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
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="max-h-72 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="text-foreground/50 px-3 py-2 text-sm">Sin resultados</li>
            ) : (
              filtered.map((car, i) => {
                const isSelected = car.id === value;
                const isActive = i === activeIndex;
                return (
                  <li key={car.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => {
                        onChange(car.id);
                        setOpen(false);
                      }}
                      className={[
                        'flex w-full items-center gap-2 px-3 py-2 text-left',
                        isActive ? 'bg-foreground/5' : '',
                        isSelected ? 'text-primary' : '',
                      ].join(' ')}
                    >
                      <CarThumb car={car} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-foreground/50 truncate text-xs">
                          {car.className}
                        </span>
                        <span className="truncate font-medium">{car.name}</span>
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

function CarThumb({ car }: { car: CarOption }) {
  return (
    <span className="bg-foreground/5 relative h-9 w-12 shrink-0 overflow-hidden rounded">
      {car.photoUrl ? (
        <Image
          src={car.photoUrl}
          alt={car.name}
          fill
          sizes="48px"
          className="object-cover"
        />
      ) : (
        <span className="text-foreground/30 absolute inset-0 flex items-center justify-center text-sm">
          🏎️
        </span>
      )}
    </span>
  );
}
