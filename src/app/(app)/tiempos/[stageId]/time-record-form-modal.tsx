'use client';

import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { TimeOfDay, Weather } from '@prisma/client';
import { Field } from '@/components/ui/field';
import { FormModal } from '@/components/ui/form-modal';
import { NativeSelect } from '@/components/ui/native-select';
import { msToString } from '@/lib/time-format';
import {
  createTimeRecord,
  updateTimeRecord,
} from '@/server/actions/times';
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

function TimeRecordForm({
  stageId,
  currentUserId,
  selections,
  initial,
  onSuccess,
}: {
  stageId: string;
  currentUserId: string;
  selections: TimeFormSelections;
  initial?: LeaderboardEntry;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isDnf, setIsDnf] = useState(initial?.isDnf ?? false);
  const [runnerId, setRunnerId] = useState(initial?.runner.id ?? currentUserId);
  const [carId, setCarId] = useState(initial?.car.id ?? selections.cars[0]?.id ?? '');

  const carOptions = useMemo(
    () =>
      selections.cars.map((car) => ({
        value: car.id,
        label: `${car.className} · ${car.name}`,
      })),
    [selections.cars],
  );

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set('stageId', stageId);
    formData.set('runnerId', runnerId);
    formData.set('carId', carId);
    formData.set('isDnf', isDnf ? 'true' : 'false');

    startTransition(async () => {
      const result = initial
        ? await updateTimeRecord(initial.id, formData)
        : await createTimeRecord(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onSuccess();
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
      <NativeSelect
        label="Coche"
        value={carId}
        onChange={(e) => setCarId(e.target.value)}
        options={carOptions}
      />

      <Field
        label="Tiempo (MM:SS.mmm)"
        name="time"
        defaultValue={initial && !initial.isDnf ? msToString(initial.timeMs) : ''}
        inputProps={{ placeholder: '04:23.567', disabled: isDnf }}
        isRequired={!isDnf}
      />
      <Field
        label="Sanción (MM:SS.mmm)"
        name="penalty"
        defaultValue={initial && initial.penaltyMs > 0 ? msToString(initial.penaltyMs) : ''}
        inputProps={{ placeholder: 'Opcional, ej: 00:10.000' }}
      />

      <NativeSelect
        label="Clima"
        name="weather"
        defaultValue={initial?.weather ?? 'DRY'}
        options={WEATHER_OPTIONS}
      />
      <NativeSelect
        label="Hora del día"
        name="timeOfDay"
        defaultValue={initial?.timeOfDay ?? 'DAY'}
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
        name="notes"
        defaultValue={initial?.notes ?? ''}
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
