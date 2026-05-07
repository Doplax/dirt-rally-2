'use client';

import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { TimeOfDay, Weather } from '@prisma/client';
import { CarCombobox } from '@/components/ui/car-combobox';
import { Field } from '@/components/ui/field';
import { FormModal } from '@/components/ui/form-modal';
import { NativeSelect } from '@/components/ui/native-select';
import { msToString } from '@/lib/time-format';
import { createTimeRecord, updateTimeRecord } from '@/server/actions/times';
import type { LeaderboardCar, LeaderboardEntry, LeaderboardUser } from './stage-leaderboard';

export type TimeFormSelections = {
  users: LeaderboardUser[];
  cars: LeaderboardCar[];
};

const WEATHER_OPTIONS: { value: Weather; label: string }[] = [
  { value: 'DRY', label: 'Seco' },
  { value: 'WET', label: 'Mojado' },
  { value: 'SNOW', label: 'Nieve' },
  { value: 'ICE', label: 'Hielo' },
];

const TIME_OF_DAY_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: 'DAY', label: 'Día' },
  { value: 'NIGHT', label: 'Noche' },
  { value: 'DUSK', label: 'Atardecer' },
  { value: 'DAWN', label: 'Amanecer' },
];

export function TimeRecordFormModal({
  trigger,
  stageId,
  currentUserId,
  selections,
  initial,
}: {
  trigger: ReactNode;
  stageId: string;
  currentUserId: string;
  selections: TimeFormSelections;
  initial?: LeaderboardEntry;
}) {
  return (
    <FormModal
      trigger={trigger}
      title={initial ? 'Editar tiempo' : 'Registrar tiempo'}
      description="Indica piloto, coche, tiempo y condiciones."
      size="lg"
    >
      {(close) => (
        <TimeRecordForm
          stageId={stageId}
          currentUserId={currentUserId}
          selections={selections}
          initial={initial}
          onSuccess={close}
        />
      )}
    </FormModal>
  );
}

export function TimeRecordForm({
  stageId,
  currentUserId,
  selections,
  initial,
  onSuccess,
  resetClearableOnSuccess = false,
}: {
  stageId: string;
  currentUserId: string;
  selections: TimeFormSelections;
  initial?: LeaderboardEntry;
  onSuccess?: () => void;
  /**
   * When true (inline mode), only time/penalty/notes/DNF reset after a
   * successful create. Sticky fields (runner, car, weather, timeOfDay) are
   * preserved so the next time can be logged with one or two field changes.
   */
  resetClearableOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [runnerId, setRunnerId] = useState(initial?.runner.id ?? currentUserId);
  const [carId, setCarId] = useState(initial?.car.id ?? selections.cars[0]?.id ?? '');
  const [weather, setWeather] = useState<Weather>(initial?.weather ?? 'DRY');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(initial?.timeOfDay ?? 'DAY');

  const [time, setTime] = useState(
    initial && !initial.isDnf ? msToString(initial.timeMs) : '',
  );
  const [penalty, setPenalty] = useState(
    initial && initial.penaltyMs > 0 ? msToString(initial.penaltyMs) : '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [isDnf, setIsDnf] = useState(initial?.isDnf ?? false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set('stageId', stageId);
    formData.set('runnerId', runnerId);
    formData.set('carId', carId);
    formData.set('time', time);
    formData.set('penalty', penalty);
    formData.set('weather', weather);
    formData.set('timeOfDay', timeOfDay);
    formData.set('isDnf', isDnf ? 'true' : 'false');
    formData.set('notes', notes);

    startTransition(async () => {
      const result = initial
        ? await updateTimeRecord(initial.id, formData)
        : await createTimeRecord(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      if (resetClearableOnSuccess) {
        setTime('');
        setPenalty('');
        setNotes('');
        setIsDnf(false);
      }
      onSuccess?.();
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <NativeSelect
        label="Piloto (runner)"
        value={runnerId}
        onChange={(e) => setRunnerId(e.target.value)}
        options={selections.users.map((u) => ({ value: u.id, label: u.username }))}
      />
      <CarCombobox
        label="Coche"
        cars={selections.cars}
        value={carId}
        onChange={setCarId}
      />

      <Field
        label="Tiempo (MM:SS.mmm)"
        value={time}
        onChange={setTime}
        inputProps={{ placeholder: '04:23.567', disabled: isDnf }}
        isRequired={!isDnf}
      />
      <Field
        label="Sanción (MM:SS.mmm)"
        value={penalty}
        onChange={setPenalty}
        inputProps={{ placeholder: 'Opcional, ej: 00:10.000' }}
      />

      <NativeSelect
        label="Clima"
        value={weather}
        onChange={(e) => setWeather(e.target.value as Weather)}
        options={WEATHER_OPTIONS}
      />
      <NativeSelect
        label="Hora del día"
        value={timeOfDay}
        onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
        options={TIME_OF_DAY_OPTIONS}
      />

      <label className="col-span-full flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isDnf}
          onChange={(e) => setIsDnf(e.target.checked)}
        />
        DNF (no terminado)
      </label>

      <Field
        label="Notas"
        value={notes}
        onChange={setNotes}
        inputProps={{ placeholder: 'Opcional' }}
      />

      {error ? <p className="text-danger col-span-full text-sm">{error}</p> : null}

      <Button
        type="submit"
        variant="primary"
        isDisabled={pending}
        className="col-span-full"
        fullWidth
      >
        {pending ? 'Guardando…' : initial ? 'Guardar cambios' : 'Registrar tiempo'}
      </Button>
    </form>
  );
}
