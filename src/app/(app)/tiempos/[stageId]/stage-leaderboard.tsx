'use client';

import { Button } from '@heroui/react';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Weather } from '@prisma/client';
import { NativeSelect } from '@/components/ui/native-select';
import { TimesTable, type TimesTableEntry } from '@/components/shared/times-table';
import {
  TimeRecordForm,
  TimeRecordFormModal,
  type TimeFormSelections,
} from './time-record-form-modal';
import { deleteTimeRecord } from '@/server/actions/times';

export type LeaderboardUser = { id: string; username: string; photoUrl: string | null };
export type LeaderboardCar = {
  id: string;
  name: string;
  className: string;
  classCode: string;
  photoUrl: string | null;
};

export type LeaderboardEntry = TimesTableEntry & {
  car: TimesTableEntry['car'] & { classCode: string };
};

const WEATHER_LABEL: Record<Weather, string> = {
  DRY: 'Seco',
  WET: 'Mojado',
  SNOW: 'Nieve',
  ICE: 'Hielo',
};

export default function StageLeaderboard({
  stage,
  currentUserId,
  users,
  cars,
  favoriteCarIds,
  times,
}: {
  stage: { id: string; name: string };
  currentUserId: string;
  users: LeaderboardUser[];
  cars: LeaderboardCar[];
  favoriteCarIds: string[];
  times: LeaderboardEntry[];
}) {
  const [classFilter, setClassFilter] = useState('');
  const [weatherFilter, setWeatherFilter] = useState<'' | Weather>('');
  const [includeDnf, setIncludeDnf] = useState(false);
  const [formOpen, setFormOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('tiempos.formOpen');
    if (stored !== null) setFormOpen(stored === '1');
  }, []);
  useEffect(() => {
    localStorage.setItem('tiempos.formOpen', formOpen ? '1' : '0');
  }, [formOpen]);

  const classOptions = useMemo(() => {
    const seen = new Map<string, string>();
    times.forEach((t) => seen.set(t.car.classCode, t.car.className));
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [times]);

  const filtered = useMemo(() => {
    return times
      .filter((t) => {
        if (!includeDnf && t.isDnf) return false;
        if (classFilter && t.car.classCode !== classFilter) return false;
        if (weatherFilter && t.weather !== weatherFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.isDnf && !b.isDnf) return 1;
        if (!a.isDnf && b.isDnf) return -1;
        return a.totalMs - b.totalMs;
      });
  }, [times, classFilter, weatherFilter, includeDnf]);

  const formSelections: TimeFormSelections = { users, cars, favoriteCarIds };

  return (
    <div className="flex flex-col gap-4">
      <div className="border-foreground/10 overflow-hidden rounded-xl border">
        <button
          type="button"
          onClick={() => setFormOpen((o) => !o)}
          aria-expanded={formOpen}
          aria-controls="registrar-tiempo-form"
          className="hover:bg-foreground/5 group flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors sm:px-4 sm:py-3"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <span
              className={[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300',
                formOpen ? 'bg-primary/15 text-primary' : 'bg-foreground/10 text-foreground/70',
              ].join(' ')}
            >
              <Plus
                size={16}
                className={[
                  'transition-transform duration-300',
                  formOpen ? 'rotate-45' : '',
                ].join(' ')}
              />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold">Registrar tiempo</span>
              <span className="text-foreground/50 hidden truncate text-xs sm:inline">
                {formOpen
                  ? 'Coche, clima y hora se mantienen entre envíos'
                  : 'Pulsa para añadir un nuevo tiempo a este tramo'}
              </span>
            </span>
          </span>
          <ChevronDown
            size={18}
            className={[
              'text-foreground/60 shrink-0 transition-transform duration-300',
              formOpen ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>
        <div
          id="registrar-tiempo-form"
          className={[
            'grid transition-[grid-template-rows] duration-300 ease-in-out',
            formOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          ].join(' ')}
          aria-hidden={!formOpen}
        >
          <div className="overflow-hidden">
            <div className="border-foreground/10 border-t px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-4">
              <TimeRecordForm
                stageId={stage.id}
                currentUserId={currentUserId}
                selections={formSelections}
                resetClearableOnSuccess
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <NativeSelect
          label="Clase"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          placeholder="Todas"
          options={classOptions}
        />
        <NativeSelect
          label="Clima"
          value={weatherFilter}
          onChange={(e) => setWeatherFilter(e.target.value as typeof weatherFilter)}
          placeholder="Todos"
          options={(Object.keys(WEATHER_LABEL) as Weather[]).map((w) => ({
            value: w,
            label: WEATHER_LABEL[w],
          }))}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeDnf}
            onChange={(e) => setIncludeDnf(e.target.checked)}
          />
          Incluir DNF
        </label>
      </div>

      <TimesTable
        entries={filtered}
        columns={[
          'rank',
          'runner',
          'car',
          'time',
          'penalty',
          'total',
          'conditions',
          'date',
          'actions',
        ]}
        renderActions={(entry) => (
          <RowActions
            stageId={stage.id}
            entry={entry as LeaderboardEntry}
            selections={formSelections}
          />
        )}
        emptyMessage="Aún no hay tiempos. ¡Sé el primero!"
      />
    </div>
  );
}

function RowActions({
  stageId,
  entry,
  selections,
}: {
  stageId: string;
  entry: LeaderboardEntry;
  selections: TimeFormSelections;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onDelete = () => {
    if (!confirm(`¿Borrar el tiempo de ${entry.runner.username}?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTimeRecord(entry.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <>
      <TimeRecordFormModal
        stageId={stageId}
        currentUserId={entry.runner.id}
        selections={selections}
        initial={entry}
        trigger={
          <Button variant="ghost" size="sm" isIconOnly aria-label="Editar tiempo">
            <Pencil size={14} />
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        aria-label="Borrar tiempo"
        onPress={onDelete}
        isDisabled={pending}
      >
        <Trash2 size={14} />
      </Button>
      {error ? <span className="text-danger text-xs">{error}</span> : null}
    </>
  );
}
