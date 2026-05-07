'use client';

import { Avatar, Button, Card } from '@heroui/react';
import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { TimeOfDay, Weather } from '@prisma/client';
import { NativeSelect } from '@/components/ui/native-select';
import { msToString } from '@/lib/time-format';
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

export type LeaderboardEntry = {
  id: string;
  runner: LeaderboardUser;
  registrar: { id: string; username: string };
  car: LeaderboardCar;
  timeMs: number;
  penaltyMs: number;
  isDnf: boolean;
  weather: Weather;
  timeOfDay: TimeOfDay;
  notes: string | null;
  createdAt: string;
};

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

export default function StageLeaderboard({
  stage,
  currentUserId,
  users,
  cars,
  times,
}: {
  stage: { id: string; name: string };
  currentUserId: string;
  users: LeaderboardUser[];
  cars: LeaderboardCar[];
  times: LeaderboardEntry[];
}) {
  const [classFilter, setClassFilter] = useState('');
  const [weatherFilter, setWeatherFilter] = useState<'' | Weather>('');
  const [includeDnf, setIncludeDnf] = useState(false);

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
      .map((t) => ({ ...t, totalMs: t.timeMs + t.penaltyMs }))
      .sort((a, b) => {
        if (a.isDnf && !b.isDnf) return 1;
        if (!a.isDnf && b.isDnf) return -1;
        return a.totalMs - b.totalMs;
      });
  }, [times, classFilter, weatherFilter, includeDnf]);

  const formSelections: TimeFormSelections = { users, cars };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Registrar tiempo</h2>
          <p className="text-foreground/60 text-sm">
            Coche, clima y hora se mantienen entre envíos. Solo cambia el piloto y el tiempo
            para registrar a otro corredor.
          </p>
        </div>
        <TimeRecordForm
          stageId={stage.id}
          currentUserId={currentUserId}
          selections={formSelections}
          resetClearableOnSuccess
        />
      </Card>

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

      <div className="border-foreground/10 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-foreground/5 text-foreground/70 text-left text-xs uppercase">
            <tr>
              <th className="px-3 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">Piloto</th>
              <th className="px-3 py-3 font-medium">Coche</th>
              <th className="px-3 py-3 text-right font-medium">Tiempo</th>
              <th className="px-3 py-3 text-right font-medium">Sanción</th>
              <th className="px-3 py-3 text-right font-medium">Total</th>
              <th className="px-3 py-3 font-medium">Cond.</th>
              <th className="px-3 py-3 font-medium">Fecha</th>
              <th className="px-3 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-foreground/60 p-8 text-center">
                  Aún no hay tiempos. ¡Sé el primero!
                </td>
              </tr>
            ) : (
              filtered.map((entry, index) => (
                <tr key={entry.id} className="border-foreground/10 border-t">
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {entry.isDnf ? <span className="text-danger">DNF</span> : index + 1}
                  </td>
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
                        {entry.registrar.id !== entry.runner.id ? (
                          <span className="text-foreground/50 text-xs">
                            por {entry.registrar.username}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col">
                      <span>{entry.car.name}</span>
                      <span className="text-foreground/50 text-xs">{entry.car.className}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {entry.isDnf ? '—' : msToString(entry.timeMs)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {entry.penaltyMs > 0 ? `+${msToString(entry.penaltyMs)}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold">
                    {entry.isDnf ? '—' : msToString(entry.totalMs)}
                  </td>
                  <td className="px-3 py-2.5 text-foreground/70 whitespace-nowrap text-xs">
                    {WEATHER_LABEL[entry.weather]} · {TIME_OF_DAY_LABEL[entry.timeOfDay]}
                  </td>
                  <td className="px-3 py-2.5 text-foreground/70 whitespace-nowrap text-xs">
                    {new Date(entry.createdAt).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}
                  </td>
                  <td className="px-3 py-2.5">
                    <RowActions
                      stageId={stage.id}
                      entry={entry}
                      selections={formSelections}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
    <div className="flex items-center justify-end gap-1">
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
    </div>
  );
}
