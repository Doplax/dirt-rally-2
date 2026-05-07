'use client';

import { Avatar, Button } from '@heroui/react';
import { Star } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { InputDevice, TimeOfDay, Weather } from '@prisma/client';
import { Field } from '@/components/ui/field';
import { FormModal } from '@/components/ui/form-modal';
import { IconCombobox, type ComboOption } from '@/components/ui/icon-combobox';
import { MaskedTimeField } from '@/components/ui/masked-time-field';
import { SwitchField } from '@/components/ui/switch-field';
import { msToString } from '@/lib/time-format';
import { createTimeRecord, updateTimeRecord } from '@/server/actions/times';
import type { LeaderboardCar, LeaderboardEntry, LeaderboardUser } from './stage-leaderboard';

export type TimeFormSelections = {
  users: LeaderboardUser[];
  cars: LeaderboardCar[];
  favoriteCarIds?: string[];
};

const WEATHER_META: Record<Weather, { label: string; icon: string }> = {
  DRY: { label: 'Seco', icon: '/icons/weather/dry.svg' },
  WET: { label: 'Mojado', icon: '/icons/weather/wet.svg' },
  SNOW: { label: 'Nieve', icon: '/icons/weather/snow.svg' },
  ICE: { label: 'Hielo', icon: '/icons/weather/ice.svg' },
};

const TIME_OF_DAY_META: Record<TimeOfDay, { label: string; icon: string }> = {
  DAY: { label: 'Día', icon: '/icons/time-of-day/day.svg' },
  NIGHT: { label: 'Noche', icon: '/icons/time-of-day/night.svg' },
  DUSK: { label: 'Atardecer', icon: '/icons/time-of-day/dusk.svg' },
  DAWN: { label: 'Amanecer', icon: '/icons/time-of-day/dawn.svg' },
};

const INPUT_DEVICE_META: Record<InputDevice, { label: string; icon: string }> = {
  GAMEPAD: { label: 'Mando', icon: '/icons/setup/gamepad.svg' },
  WHEEL: { label: 'Volante', icon: '/icons/setup/wheel.svg' },
};

const VR_META: Record<'ON' | 'OFF', { label: string; icon: string }> = {
  ON: { label: 'Con VR', icon: '/icons/setup/vr-on.svg' },
  OFF: { label: 'Sin VR', icon: '/icons/setup/vr-off.svg' },
};

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
  const [inputDevice, setInputDevice] = useState<InputDevice>(
    initial?.inputDevice ?? 'GAMEPAD',
  );
  const [usesVr, setUsesVr] = useState<boolean>(initial?.usesVr ?? false);

  const [timeDigits, setTimeDigits] = useState(
    initial && !initial.isDnf ? msToTimeDigits(initial.timeMs) : '',
  );
  const [penaltyDigits, setPenaltyDigits] = useState(
    initial && initial.penaltyMs > 0 ? msToTimeDigits(initial.penaltyMs) : '',
  );
  const time = timeDigitsToString(timeDigits);
  const penalty = timeDigitsToString(penaltyDigits);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [isDnf, setIsDnf] = useState(initial?.isDnf ?? false);

  const userOptions = useMemo<ComboOption[]>(
    () =>
      selections.users.map((u) => ({
        id: u.id,
        label: u.username,
        visual: <UserVisual user={u} />,
      })),
    [selections.users],
  );

  const carOptions = useMemo<ComboOption[]>(() => {
    const favorites = new Set(selections.favoriteCarIds ?? []);
    const sorted = [...selections.cars].sort((a, b) => {
      const aFav = favorites.has(a.id) ? 0 : 1;
      const bFav = favorites.has(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      const cls = a.className.localeCompare(b.className);
      return cls !== 0 ? cls : a.name.localeCompare(b.name);
    });
    return sorted.map((c) => ({
      id: c.id,
      label: c.name,
      sublabel: favorites.has(c.id) ? `★ ${c.className}` : c.className,
      visual: <CarVisual car={c} favorite={favorites.has(c.id)} />,
    }));
  }, [selections.cars, selections.favoriteCarIds]);

  const weatherOptions = useMemo<ComboOption[]>(
    () =>
      (Object.keys(WEATHER_META) as Weather[]).map((w) => ({
        id: w,
        label: WEATHER_META[w].label,
        visual: <SvgVisual src={WEATHER_META[w].icon} alt={WEATHER_META[w].label} />,
      })),
    [],
  );

  const timeOfDayOptions = useMemo<ComboOption[]>(
    () =>
      (Object.keys(TIME_OF_DAY_META) as TimeOfDay[]).map((t) => ({
        id: t,
        label: TIME_OF_DAY_META[t].label,
        visual: <SvgVisual src={TIME_OF_DAY_META[t].icon} alt={TIME_OF_DAY_META[t].label} />,
      })),
    [],
  );

  const inputDeviceOptions = useMemo<ComboOption[]>(
    () =>
      (Object.keys(INPUT_DEVICE_META) as InputDevice[]).map((d) => ({
        id: d,
        label: INPUT_DEVICE_META[d].label,
        visual: (
          <SvgVisual src={INPUT_DEVICE_META[d].icon} alt={INPUT_DEVICE_META[d].label} />
        ),
      })),
    [],
  );

  const vrOptions = useMemo<ComboOption[]>(
    () =>
      (Object.keys(VR_META) as Array<keyof typeof VR_META>).map((k) => ({
        id: k,
        label: VR_META[k].label,
        visual: <SvgVisual src={VR_META[k].icon} alt={VR_META[k].label} />,
      })),
    [],
  );

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
    formData.set('inputDevice', inputDevice);
    formData.set('usesVr', usesVr ? 'true' : 'false');
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
        setTimeDigits('');
        setPenaltyDigits('');
        setNotes('');
        setIsDnf(false);
      }
      onSuccess?.();
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-12 md:items-end"
    >
      {/* Row 1 — identidad y números */}
      <IconCombobox
        label="Piloto"
        options={userOptions}
        value={runnerId}
        onChange={setRunnerId}
        searchable
        className="col-span-2 md:col-span-3"
      />
      <IconCombobox
        label="Coche"
        options={carOptions}
        value={carId}
        onChange={setCarId}
        searchable
        className="col-span-2 md:col-span-5"
      />
      <MaskedTimeField
        label="Tiempo"
        digits={timeDigits}
        onChangeDigits={setTimeDigits}
        isRequired={!isDnf}
        isDisabled={isDnf}
        className="col-span-1 md:col-span-2"
      />
      <MaskedTimeField
        label="Sanción"
        digits={penaltyDigits}
        onChangeDigits={setPenaltyDigits}
        className="col-span-1 md:col-span-2"
      />

      {/* Row 2 — condiciones (4 columnas iguales) */}
      <IconCombobox
        label="Clima"
        options={weatherOptions}
        value={weather}
        onChange={(id) => setWeather(id as Weather)}
        className="col-span-1 md:col-span-3"
      />
      <IconCombobox
        label="Hora"
        options={timeOfDayOptions}
        value={timeOfDay}
        onChange={(id) => setTimeOfDay(id as TimeOfDay)}
        className="col-span-1 md:col-span-3"
      />
      <IconCombobox
        label="Mando"
        options={inputDeviceOptions}
        value={inputDevice}
        onChange={(id) => setInputDevice(id as InputDevice)}
        className="col-span-1 md:col-span-3"
      />
      <IconCombobox
        label="VR"
        options={vrOptions}
        value={usesVr ? 'ON' : 'OFF'}
        onChange={(id) => setUsesVr(id === 'ON')}
        className="col-span-1 md:col-span-3"
      />

      {/* Row 3 — toggles, notas y acción */}
      <SwitchField
        label="DNF (no terminado)"
        isSelected={isDnf}
        onChange={setIsDnf}
        className="col-span-2 md:col-span-3"
      />
      <Field
        label="Notas"
        value={notes}
        onChange={setNotes}
        inputProps={{ placeholder: 'Opcional' }}
        className="col-span-2 md:col-span-6"
      />
      <Button
        type="submit"
        variant="primary"
        isDisabled={pending}
        className="col-span-2 md:col-span-3"
        fullWidth
      >
        {pending ? 'Guardando…' : initial ? 'Guardar cambios' : 'Registrar tiempo'}
      </Button>

      {error ? <p className="text-danger col-span-full text-sm">{error}</p> : null}
    </form>
  );
}

function UserVisual({ user }: { user: LeaderboardUser }) {
  return (
    <Avatar size="sm" className="shrink-0">
      {user.photoUrl ? <Avatar.Image src={user.photoUrl} alt={user.username} /> : null}
      <Avatar.Fallback>{user.username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
    </Avatar>
  );
}

function CarVisual({ car, favorite }: { car: LeaderboardCar; favorite?: boolean }) {
  return (
    <span className="bg-foreground/5 relative h-9 w-12 shrink-0 overflow-hidden rounded">
      {car.photoUrl ? (
        <Image src={car.photoUrl} alt={car.name} fill sizes="48px" className="object-cover" />
      ) : (
        <span className="text-foreground/30 absolute inset-0 flex items-center justify-center text-sm">
          🏎️
        </span>
      )}
      {favorite ? (
        <span className="bg-background/70 absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-bl backdrop-blur-sm">
          <Star size={10} className="fill-amber-400 text-amber-400" />
        </span>
      ) : null}
    </span>
  );
}

function SvgVisual({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="bg-foreground/5 relative flex h-9 w-9 shrink-0 items-center justify-center rounded">
      <Image src={src} alt={alt} width={22} height={22} />
    </span>
  );
}

/**
 * Time-input helpers. We keep state as a digits-only string (max 7 chars:
 * MM SS mmm) and format on display so the user always sees segmented
 * "MM:SS.mmm" with leading zeros — typing right-to-left fills milliseconds
 * first and shifts left as digits are added (3 → "00:00.003", 1234 →
 * "00:01.234", 423567 → "04:23.567").
 */
function timeDigitsToString(digits: string): string {
  if (!digits) return '';
  const padded = digits.padStart(7, '0');
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}.${padded.slice(4)}`;
}

function msToTimeDigits(ms: number): string {
  if (!ms) return '';
  return msToString(ms).replace(/\D/g, '').slice(-7);
}
