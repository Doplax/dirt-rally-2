'use client';

import { Avatar } from '@heroui/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Direction, TimeOfDay, Weather } from '@prisma/client';
import { msToString } from '@/lib/time-format';

const WEATHER_LABEL: Record<Weather, string> = {
  DRY: 'Seco',
  WET: 'Mojado',
  SNOW: 'Nieve',
  ICE: 'Hielo',
};

const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  DAY: 'Día',
  NIGHT: 'Noche',
  DUSK: 'Atardecer',
  DAWN: 'Amanecer',
};

export type TimesTableEntry = {
  id: string;
  totalMs: number;
  timeMs: number;
  penaltyMs: number;
  isDnf: boolean;
  weather: Weather;
  timeOfDay: TimeOfDay;
  notes?: string | null;
  createdAt: string;
  /** Optional precomputed URL — when present, clicking the row navigates here.
   * Built on the server (server components can't pass functions across the
   * RSC boundary, so we serialise the link instead of a builder fn). */
  href?: string;
  runner: { id: string; username: string; photoUrl: string | null };
  registrar?: { id: string; username: string };
  car: {
    id: string;
    name: string;
    className: string;
    classCode: string;
    photoUrl: string | null;
  };
  stage: {
    id: string;
    name: string;
    distanceKm: number;
    direction: Direction;
    location: { id: string; name: string; country: string; photoUrl?: string | null };
  };
};

export type TimesColumn =
  | 'rank'
  | 'stage'
  | 'runner'
  | 'car'
  | 'time'
  | 'penalty'
  | 'total'
  | 'conditions'
  | 'date'
  | 'actions';

const HEADERS: Record<TimesColumn, { label: string; align?: 'right' }> = {
  rank: { label: '#' },
  stage: { label: 'Mapa · Tramo' },
  runner: { label: 'Piloto' },
  car: { label: 'Coche' },
  time: { label: 'Tiempo', align: 'right' },
  penalty: { label: 'Sanción', align: 'right' },
  total: { label: 'Total', align: 'right' },
  conditions: { label: 'Cond.' },
  date: { label: 'Fecha' },
  actions: { label: 'Acciones', align: 'right' },
};

type Props = {
  entries: TimesTableEntry[];
  columns: TimesColumn[];
  /** Slot for per-row controls — only used when `actions` is in `columns`. */
  renderActions?: (entry: TimesTableEntry) => ReactNode;
  /** Message shown when the entries list is empty. */
  emptyMessage?: string;
};

export function TimesTable({
  entries,
  columns,
  renderActions,
  emptyMessage = 'Aún no hay tiempos registrados.',
}: Props) {
  const router = useRouter();

  if (entries.length === 0) {
    return (
      <div className="border-foreground/10 text-foreground/60 rounded-lg border border-dashed p-8 text-center text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="border-foreground/10 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-foreground/5 text-foreground/70 text-left text-xs uppercase">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className={[
                  'px-3 py-3 font-medium',
                  HEADERS[col].align === 'right' ? 'text-right' : '',
                ].join(' ')}
              >
                {HEADERS[col].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const clickable = !!entry.href;
            return (
              <tr
                key={entry.id}
                onClick={clickable ? () => router.push(entry.href!) : undefined}
                className={[
                  'border-foreground/10 border-t transition-colors',
                  clickable ? 'hover:bg-foreground/5 cursor-pointer' : '',
                ].join(' ')}
              >
                {columns.map((col) => (
                  <Cell
                    key={col}
                    column={col}
                    entry={entry}
                    index={index}
                    renderActions={renderActions}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Cell({
  column,
  entry,
  index,
  renderActions,
}: {
  column: TimesColumn;
  entry: TimesTableEntry;
  index: number;
  renderActions?: (entry: TimesTableEntry) => ReactNode;
}) {
  switch (column) {
    case 'rank':
      return (
        <td className="px-3 py-2.5 font-mono text-xs">
          {entry.isDnf ? <span className="text-danger">DNF</span> : index + 1}
        </td>
      );
    case 'stage':
      return (
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <LocationThumb loc={entry.stage.location} />
            <div className="flex min-w-0 flex-col">
              <span className="text-foreground/55 truncate text-xs">
                {entry.stage.location.country} · {entry.stage.location.name}
              </span>
              <span className="flex items-center gap-1 truncate font-medium">
                {entry.stage.direction === Direction.FORWARD ? (
                  <ArrowUp size={12} className="text-foreground/50 shrink-0" />
                ) : (
                  <ArrowDown size={12} className="text-foreground/50 shrink-0" />
                )}
                <span className="truncate">{entry.stage.name}</span>
              </span>
            </div>
          </div>
        </td>
      );
    case 'runner':
      return (
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              {entry.runner.photoUrl ? (
                <Avatar.Image src={entry.runner.photoUrl} alt={entry.runner.username} />
              ) : null}
              <Avatar.Fallback>
                {entry.runner.username.slice(0, 2).toUpperCase()}
              </Avatar.Fallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{entry.runner.username}</span>
              {entry.registrar && entry.registrar.id !== entry.runner.id ? (
                <span className="text-foreground/50 text-xs">
                  por {entry.registrar.username}
                </span>
              ) : null}
            </div>
          </div>
        </td>
      );
    case 'car':
      return (
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <CarThumb car={entry.car} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{entry.car.name}</span>
              <span className="text-foreground/50 truncate text-xs">
                {entry.car.className}
              </span>
            </div>
          </div>
        </td>
      );
    case 'time':
      return (
        <td className="px-3 py-2.5 text-right font-mono">
          {entry.isDnf ? '—' : msToString(entry.timeMs)}
        </td>
      );
    case 'penalty':
      return (
        <td className="px-3 py-2.5 text-right font-mono">
          {entry.penaltyMs > 0 ? `+${msToString(entry.penaltyMs)}` : '—'}
        </td>
      );
    case 'total':
      return (
        <td className="px-3 py-2.5 text-right font-mono font-semibold">
          {entry.isDnf ? '—' : msToString(entry.totalMs)}
        </td>
      );
    case 'conditions':
      return (
        <td className="px-3 py-2.5 text-foreground/70 whitespace-nowrap text-xs">
          {WEATHER_LABEL[entry.weather]} · {TIME_OF_DAY_LABEL[entry.timeOfDay]}
        </td>
      );
    case 'date':
      return (
        <td className="px-3 py-2.5 text-foreground/70 whitespace-nowrap text-xs">
          {new Date(entry.createdAt).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
          })}
        </td>
      );
    case 'actions':
      // Clicks inside the actions slot must not bubble to the row navigation
      // handler. The slot owner (e.g. delete button) sets its own handlers.
      return (
        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            {renderActions ? renderActions(entry) : null}
          </div>
        </td>
      );
  }
}

function LocationThumb({
  loc,
}: {
  loc: { name: string; photoUrl?: string | null };
}) {
  return (
    <span className="bg-foreground/5 relative h-9 w-12 shrink-0 overflow-hidden rounded">
      {loc.photoUrl ? (
        <Image src={loc.photoUrl} alt={loc.name} fill sizes="48px" className="object-cover" />
      ) : (
        <span className="text-foreground/30 absolute inset-0 flex items-center justify-center text-sm">
          🗺️
        </span>
      )}
    </span>
  );
}

function CarThumb({
  car,
}: {
  car: { name: string; photoUrl: string | null };
}) {
  return (
    <span className="bg-foreground/5 relative h-9 w-12 shrink-0 overflow-hidden rounded">
      {car.photoUrl ? (
        <Image src={car.photoUrl} alt={car.name} fill sizes="48px" className="object-cover" />
      ) : (
        <span className="text-foreground/30 absolute inset-0 flex items-center justify-center text-sm">
          🏎️
        </span>
      )}
    </span>
  );
}
