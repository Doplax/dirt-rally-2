'use client';

import { Button } from '@heroui/react';
import { Globe, Layers, Mountain, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { IconCombobox, type ComboOption } from '@/components/ui/icon-combobox';
import { CountryFlag } from '@/components/ui/country-flag';
import { LocationFormModal } from './location-form-modal';

export type LocationItem = {
  id: string;
  name: string;
  country: string;
  surface: string;
  isDlc: boolean;
  dlcPack: string | null;
  photoUrl: string | null;
  stagesCount: number;
};

export default function LocationsBrowser({
  locations,
  isAdmin,
}: {
  locations: LocationItem[];
  isAdmin: boolean;
}) {
  const [country, setCountry] = useState('');
  const [surface, setSurface] = useState('');
  const [dlcFilter, setDlcFilter] = useState<'' | 'base' | 'dlc'>('');

  const countryOptions = useMemo<ComboOption[]>(() => {
    const seen = Array.from(new Set(locations.map((l) => l.country))).sort();
    return [
      {
        id: '',
        label: 'Todos los países',
        visual: (
          <span className="bg-foreground/5 text-foreground/40 flex h-6 w-9 shrink-0 items-center justify-center rounded-sm">
            <Globe size={14} />
          </span>
        ),
      },
      ...seen.map((c) => ({
        id: c,
        label: c,
        visual: <CountryFlag country={c} />,
      })),
    ];
  }, [locations]);

  const surfaceOptions = useMemo<ComboOption[]>(() => {
    const seen = Array.from(new Set(locations.map((l) => l.surface))).sort();
    return [
      {
        id: '',
        label: 'Todas las superficies',
        visual: (
          <span className="bg-foreground/5 text-foreground/40 flex h-9 w-9 shrink-0 items-center justify-center rounded">
            <Mountain size={16} />
          </span>
        ),
      },
      ...seen.map((s) => ({
        id: s,
        label: s,
        visual: (
          <span className="bg-foreground/5 text-foreground/60 flex h-9 w-9 shrink-0 items-center justify-center rounded">
            <Layers size={14} />
          </span>
        ),
      })),
    ];
  }, [locations]);

  const dlcOptions = useMemo<ComboOption[]>(
    () => [
      {
        id: '',
        label: 'Todos los tipos',
        visual: (
          <span className="bg-foreground/5 text-foreground/40 flex h-9 w-9 shrink-0 items-center justify-center rounded">
            <Sparkles size={16} />
          </span>
        ),
      },
      {
        id: 'base',
        label: 'Base',
        visual: (
          <span className="bg-foreground/10 text-foreground/70 flex h-9 w-9 shrink-0 items-center justify-center rounded text-[10px] font-bold tracking-wider">
            BASE
          </span>
        ),
      },
      {
        id: 'dlc',
        label: 'DLC',
        visual: (
          <span className="bg-primary/15 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded text-[10px] font-bold tracking-wider">
            DLC
          </span>
        ),
      },
    ],
    [],
  );

  const filtered = locations.filter((l) => {
    if (country && l.country !== country) return false;
    if (surface && l.surface !== surface) return false;
    if (dlcFilter === 'base' && l.isDlc) return false;
    if (dlcFilter === 'dlc' && !l.isDlc) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-12">
        <IconCombobox
          label="País"
          options={countryOptions}
          value={country}
          onChange={setCountry}
          searchable
          placeholder="Todos los países"
          className="col-span-2 lg:col-span-4"
        />
        <IconCombobox
          label="Superficie"
          options={surfaceOptions}
          value={surface}
          onChange={setSurface}
          searchable
          placeholder="Todas las superficies"
          className="col-span-2 lg:col-span-5"
        />
        <IconCombobox
          label="Tipo"
          options={dlcOptions}
          value={dlcFilter}
          onChange={(id) => setDlcFilter(id as typeof dlcFilter)}
          placeholder="Todos los tipos"
          className="col-span-2 lg:col-span-3"
        />
        {isAdmin ? (
          <div className="col-span-2 flex justify-end lg:col-span-12">
            <LocationFormModal
              trigger={
                <Button variant="primary">
                  <Plus size={16} /> Crear localidad
                </Button>
              }
            />
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="text-foreground/60 py-12 text-center">No hay localidades con esos filtros.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((loc) => (
            <Link
              key={loc.id}
              href={`/mapas/${loc.id}`}
              className="group border-foreground/10 hover:border-foreground/25 bg-foreground/[0.02] flex flex-col overflow-hidden rounded-xl border transition-all hover:shadow-lg"
            >
              <div className="bg-foreground/5 relative aspect-[16/9]">
                {loc.photoUrl ? (
                  <Image
                    src={loc.photoUrl}
                    alt={loc.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="text-foreground/30 flex h-full items-center justify-center text-4xl">
                    🗺️
                  </div>
                )}
                {loc.isDlc ? (
                  <span className="bg-primary text-primary-foreground absolute top-2 right-2 rounded px-2 py-0.5 text-xs font-medium">
                    DLC
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-0.5 px-3 pt-2 pb-2.5 leading-tight">
                <div className="text-foreground/55 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                  <CountryFlag country={loc.country} variant="inline" />
                  {loc.country}
                </div>
                <div className="text-base font-semibold">{loc.name}</div>
                <div className="text-foreground/55 mt-0.5 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate">{loc.surface}</span>
                  <span className="shrink-0 tabular-nums">{loc.stagesCount} tramos</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
