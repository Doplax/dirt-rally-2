'use client';

import { Button, Card } from '@heroui/react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { NativeSelect } from '@/components/ui/native-select';
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

  const countries = useMemo(
    () => Array.from(new Set(locations.map((l) => l.country))).sort(),
    [locations],
  );
  const surfaces = useMemo(
    () => Array.from(new Set(locations.map((l) => l.surface))).sort(),
    [locations],
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
      <div className="flex flex-wrap items-end gap-3">
        <NativeSelect
          label="País"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Todos"
          options={countries.map((c) => ({ value: c, label: c }))}
        />
        <NativeSelect
          label="Superficie"
          value={surface}
          onChange={(e) => setSurface(e.target.value)}
          placeholder="Todas"
          options={surfaces.map((s) => ({ value: s, label: s }))}
        />
        <NativeSelect
          label="Tipo"
          value={dlcFilter}
          onChange={(e) => setDlcFilter(e.target.value as typeof dlcFilter)}
          placeholder="Todas"
          options={[
            { value: 'base', label: 'Base' },
            { value: 'dlc', label: 'DLC' },
          ]}
        />
        <div className="ml-auto flex items-center gap-2">
          {isAdmin ? (
            <LocationFormModal
              trigger={
                <Button variant="primary">
                  <Plus size={16} /> Crear localidad
                </Button>
              }
            />
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-foreground/60 py-12 text-center">No hay localidades con esos filtros.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((loc) => (
            <Link key={loc.id} href={`/mapas/${loc.id}`} className="group">
              <Card className="overflow-hidden transition-shadow group-hover:shadow-lg">
                <div className="bg-foreground/5 relative aspect-[16/9] overflow-hidden">
                  {loc.photoUrl ? (
                    <Image
                      src={loc.photoUrl}
                      alt={loc.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover"
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
                <div className="p-4">
                  <div className="text-foreground/60 text-xs">{loc.country}</div>
                  <div className="text-lg font-semibold">{loc.name}</div>
                  <div className="text-foreground/60 mt-1 flex justify-between text-sm">
                    <span>{loc.surface}</span>
                    <span>{loc.stagesCount} tramos</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
