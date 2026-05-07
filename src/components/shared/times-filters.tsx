'use client';

import { Avatar } from '@heroui/react';
import { Car as CarIcon, ChevronDown, Filter, Layers, Star, Users } from 'lucide-react';
import Image from 'next/image';
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Weather } from '@prisma/client';
import { IconCombobox, type ComboOption } from '@/components/ui/icon-combobox';
import type { TimesTableEntry } from './times-table';

const WEATHER_LABEL: Record<Weather, string> = {
  DRY: 'Seco',
  WET: 'Mojado',
  SNOW: 'Nieve',
  ICE: 'Hielo',
};

const WEATHER_ICON: Record<Weather, string> = {
  DRY: '/icons/weather/dry.svg',
  WET: '/icons/weather/wet.svg',
  SNOW: '/icons/weather/snow.svg',
  ICE: '/icons/weather/ice.svg',
};

export type TimesFilterKey = 'runner' | 'car' | 'class' | 'weather' | 'dnf';

type Props = {
  times: TimesTableEntry[];
  /**
   * Which filters to expose. The component derives the dropdown options from
   * the entries themselves (so you can only filter by values actually present
   * in the current data set).
   */
  show: TimesFilterKey[];
  /** Mark these car ids as favorites — sorted to the top of the car dropdown. */
  favoriteCarIds?: string[];
  /** localStorage key for the open/closed preference. Omit to skip persistence. */
  storageKey?: string;
  children: (filtered: TimesTableEntry[]) => ReactNode;
};

export function TimesFilters({
  times,
  show,
  favoriteCarIds,
  storageKey,
  children,
}: Props) {
  const [runnerFilter, setRunnerFilter] = useState('');
  const [carFilter, setCarFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [weatherFilter, setWeatherFilter] = useState<'' | Weather>('');
  const [includeDnf, setIncludeDnf] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!storageKey) return;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) setOpen(stored === '1');
  }, [storageKey]);
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, open ? '1' : '0');
  }, [storageKey, open]);

  const showRunner = show.includes('runner');
  const showCar = show.includes('car');
  const showClass = show.includes('class');
  const showWeather = show.includes('weather');
  const showDnf = show.includes('dnf');

  const runnerOptions = useMemo<ComboOption[]>(() => {
    if (!showRunner) return [];
    const seen = new Map<string, TimesTableEntry['runner']>();
    times.forEach((t) => seen.set(t.runner.id, t.runner));
    const sorted = Array.from(seen.values()).sort((a, b) =>
      a.username.localeCompare(b.username),
    );
    return [
      {
        id: '',
        label: 'Todos los pilotos',
        visual: (
          <span className="bg-foreground/5 text-foreground/40 flex h-9 w-9 shrink-0 items-center justify-center rounded">
            <Users size={16} />
          </span>
        ),
      },
      ...sorted.map((u) => ({
        id: u.id,
        label: u.username,
        visual: (
          <Avatar size="sm" className="shrink-0">
            {u.photoUrl ? <Avatar.Image src={u.photoUrl} alt={u.username} /> : null}
            <Avatar.Fallback>{u.username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
          </Avatar>
        ),
      })),
    ];
  }, [times, showRunner]);

  const carOptions = useMemo<ComboOption[]>(() => {
    if (!showCar) return [];
    const seen = new Map<string, TimesTableEntry['car']>();
    times.forEach((t) => seen.set(t.car.id, t.car));
    const favSet = new Set(favoriteCarIds ?? []);
    const sorted = Array.from(seen.values()).sort((a, b) => {
      const aFav = favSet.has(a.id) ? 0 : 1;
      const bFav = favSet.has(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      const cls = a.className.localeCompare(b.className);
      return cls !== 0 ? cls : a.name.localeCompare(b.name);
    });
    return [
      {
        id: '',
        label: 'Todos los coches',
        visual: (
          <span className="bg-foreground/5 text-foreground/40 flex h-9 w-12 shrink-0 items-center justify-center rounded">
            <CarIcon size={16} />
          </span>
        ),
      },
      ...sorted.map((c) => {
        const favorite = favSet.has(c.id);
        return {
          id: c.id,
          label: c.name,
          sublabel: favorite ? `★ ${c.className}` : c.className,
          visual: (
            <span className="bg-foreground/5 relative h-9 w-12 shrink-0 overflow-hidden rounded">
              {c.photoUrl ? (
                <Image
                  src={c.photoUrl}
                  alt={c.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
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
          ),
          searchHaystack: `${c.name} ${c.className}`,
        };
      }),
    ];
  }, [times, favoriteCarIds, showCar]);

  const classOptions = useMemo<ComboOption[]>(() => {
    if (!showClass) return [];
    const seen = new Map<string, string>();
    times.forEach((t) => seen.set(t.car.classCode, t.car.className));
    const sorted = Array.from(seen.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [
      {
        id: '',
        label: 'Todas las clases',
        visual: (
          <span className="bg-foreground/5 text-foreground/40 flex h-9 w-9 shrink-0 items-center justify-center rounded">
            <Layers size={16} />
          </span>
        ),
      },
      ...sorted.map((c) => ({
        id: c.code,
        label: c.name,
        visual: (
          <span className="bg-foreground/5 text-foreground/60 flex h-9 w-9 shrink-0 items-center justify-center rounded text-[10px] font-bold tracking-wider uppercase">
            {c.code.slice(0, 3)}
          </span>
        ),
      })),
    ];
  }, [times, showClass]);

  const weatherOptions = useMemo<ComboOption[]>(() => {
    if (!showWeather) return [];
    return [
      {
        id: '',
        label: 'Todos los climas',
        visual: (
          <span className="bg-foreground/5 text-foreground/40 flex h-9 w-9 shrink-0 items-center justify-center rounded">
            <Filter size={16} />
          </span>
        ),
      },
      ...(Object.keys(WEATHER_LABEL) as Weather[]).map((w) => ({
        id: w,
        label: WEATHER_LABEL[w],
        visual: (
          <span className="bg-foreground/5 relative flex h-9 w-9 shrink-0 items-center justify-center rounded">
            <Image src={WEATHER_ICON[w]} alt={WEATHER_LABEL[w]} width={22} height={22} />
          </span>
        ),
      })),
    ];
  }, [showWeather]);

  const filtered = useMemo(() => {
    return times.filter((t) => {
      if (showDnf && !includeDnf && t.isDnf) return false;
      if (!showDnf && t.isDnf) return false;
      if (showRunner && runnerFilter && t.runner.id !== runnerFilter) return false;
      if (showCar && carFilter && t.car.id !== carFilter) return false;
      if (showClass && classFilter && t.car.classCode !== classFilter) return false;
      if (showWeather && weatherFilter && t.weather !== weatherFilter) return false;
      return true;
    });
  }, [
    times,
    showDnf,
    includeDnf,
    showRunner,
    runnerFilter,
    showCar,
    carFilter,
    showClass,
    classFilter,
    showWeather,
    weatherFilter,
  ]);

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (runnerFilter) {
      const o = runnerOptions.find((x) => x.id === runnerFilter);
      if (o) parts.push(o.label);
    }
    if (carFilter) {
      const o = carOptions.find((x) => x.id === carFilter);
      if (o) parts.push(o.label);
    }
    if (classFilter) {
      const o = classOptions.find((x) => x.id === classFilter);
      if (o) parts.push(o.label);
    }
    if (weatherFilter) parts.push(WEATHER_LABEL[weatherFilter]);
    if (showDnf && includeDnf) parts.push('Incluir DNF');
    return parts.length ? parts.join(' · ') : 'Sin filtros aplicados';
  }, [
    runnerFilter,
    runnerOptions,
    carFilter,
    carOptions,
    classFilter,
    classOptions,
    weatherFilter,
    showDnf,
    includeDnf,
  ]);

  return (
    <>
      <div className="border-foreground/10 overflow-hidden rounded-xl border">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="hover:bg-foreground/5 group flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors sm:px-4 sm:py-3"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <span
              className={[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300',
                open ? 'bg-primary/15 text-primary' : 'bg-foreground/10 text-foreground/70',
              ].join(' ')}
            >
              <Filter size={14} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold">Filtros</span>
              <span className="text-foreground/50 hidden truncate text-xs sm:inline">
                {summary}
              </span>
            </span>
          </span>
          <ChevronDown
            size={18}
            className={[
              'text-foreground/60 shrink-0 transition-transform duration-300',
              open ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>
        <div
          className={[
            'grid transition-[grid-template-rows] duration-300 ease-in-out',
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          ].join(' ')}
          aria-hidden={!open}
        >
          <div className="overflow-hidden">
            <div className="border-foreground/10 border-t px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-12">
                {showRunner ? (
                  <IconCombobox
                    label="Piloto"
                    options={runnerOptions}
                    value={runnerFilter}
                    onChange={setRunnerFilter}
                    searchable
                    placeholder="Todos los pilotos"
                    className="col-span-2 lg:col-span-3"
                  />
                ) : null}
                {showCar ? (
                  <IconCombobox
                    label="Coche"
                    options={carOptions}
                    value={carFilter}
                    onChange={setCarFilter}
                    searchable
                    placeholder="Todos los coches"
                    className="col-span-2 lg:col-span-4"
                  />
                ) : null}
                {showClass ? (
                  <IconCombobox
                    label="Clase"
                    options={classOptions}
                    value={classFilter}
                    onChange={setClassFilter}
                    searchable
                    placeholder="Todas las clases"
                    className="col-span-2 lg:col-span-3"
                  />
                ) : null}
                {showWeather ? (
                  <IconCombobox
                    label="Clima"
                    options={weatherOptions}
                    value={weatherFilter}
                    onChange={(id) => setWeatherFilter(id as typeof weatherFilter)}
                    placeholder="Todos los climas"
                    className="col-span-2 lg:col-span-2"
                  />
                ) : null}
                {showDnf ? (
                  <label className="text-foreground/80 col-span-2 flex items-center gap-2 text-sm lg:col-span-12">
                    <input
                      type="checkbox"
                      checked={includeDnf}
                      onChange={(e) => setIncludeDnf(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Incluir DNF
                  </label>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {children(filtered)}
    </>
  );
}
