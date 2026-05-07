'use client';

import { Button } from '@heroui/react';
import { ChevronDown, Maximize2, Minimize2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { FilteredTimesTable } from '@/components/shared/filtered-times-table';
import type { TimesTableEntry } from '@/components/shared/times-table';
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
export type LeaderboardEntry = TimesTableEntry;

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
  const [formOpen, setFormOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const formStored = localStorage.getItem('tiempos.formOpen');
    if (formStored !== null) setFormOpen(formStored === '1');
  }, []);
  useEffect(() => {
    localStorage.setItem('tiempos.formOpen', formOpen ? '1' : '0');
  }, [formOpen]);

  // Sync local state with the browser Fullscreen API. The user can exit
  // native fullscreen via ESC or the browser chrome — we listen and reset
  // our own state so the layout collapses back too.
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = async () => {
    const next = !fullscreen;
    setFullscreen(next);
    try {
      if (next) {
        await tableWrapperRef.current?.requestFullscreen?.();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen API can reject (Safari permissions, iframe sandbox). The
      // CSS-based fullscreen still works, so we silently ignore.
    }
  };

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

      <div
        ref={tableWrapperRef}
        className={[
          'flex flex-col gap-3',
          fullscreen
            ? 'bg-background fixed inset-0 z-50 overflow-auto p-3 sm:p-4'
            : '',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-foreground/70 text-sm font-semibold uppercase tracking-wide">
            Leaderboard
          </h2>
          <Button variant="ghost" size="sm" onPress={toggleFullscreen}>
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="ml-1.5">
              {fullscreen ? 'Salir' : 'Pantalla completa'}
            </span>
          </Button>
        </div>
        <FilteredTimesTable
          times={times}
          columns={[
            'rank',
            'runner',
            'car',
            'time',
            'penalty',
            'total',
            'conditions',
            'setup',
            'date',
            'actions',
          ]}
          filters={['runner', 'car', 'class', 'weather', 'input', 'vr', 'dnf']}
          filtersStorageKey="tiempos.filtersOpen"
          favoriteCarIds={favoriteCarIds}
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
