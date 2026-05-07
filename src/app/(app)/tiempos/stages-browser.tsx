'use client';

import { Card } from '@heroui/react';
import { ArrowDown, ArrowUp, Globe, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Direction } from '@prisma/client';
import { IconCombobox, type ComboOption } from '@/components/ui/icon-combobox';

type StageItem = {
  id: string;
  name: string;
  distanceKm: number;
  direction: Direction;
  timesCount: number;
  location: {
    id: string;
    name: string;
    country: string;
    surface: string;
    photoUrl: string | null;
  };
};

export default function StagesBrowser({ stages }: { stages: StageItem[] }) {
  const router = useRouter();
  const [locationId, setLocationId] = useState('');

  const locationOptions = useMemo<ComboOption[]>(() => {
    const seen = new Map<string, StageItem['location']>();
    stages.forEach((s) => seen.set(s.location.id, s.location));
    const sorted = Array.from(seen.values()).sort(
      (a, b) =>
        a.country.localeCompare(b.country) || a.name.localeCompare(b.name),
    );
    return [
      {
        id: '',
        label: 'Todas las localidades',
        visual: (
          <span className="bg-foreground/5 text-foreground/40 flex h-9 w-12 shrink-0 items-center justify-center rounded">
            <Globe size={16} />
          </span>
        ),
      },
      ...sorted.map((loc) => ({
        id: loc.id,
        label: loc.name,
        sublabel: loc.country,
        visual: <LocationThumb loc={loc} />,
        searchHaystack: `${loc.name} ${loc.country}`,
      })),
    ];
  }, [stages]);

  const stageOptions = useMemo<ComboOption[]>(
    () =>
      stages.map((stage) => ({
        id: stage.id,
        label: stage.name,
        sublabel: `${stage.location.country} · ${stage.location.name}`,
        visual: <LocationThumb loc={stage.location} />,
        searchHaystack: `${stage.name} ${stage.location.name} ${stage.location.country}`,
      })),
    [stages],
  );

  const filtered = stages.filter((s) => {
    if (locationId && s.location.id !== locationId) return false;
    return true;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { location: StageItem['location']; stages: StageItem[] }>();
    filtered.forEach((s) => {
      if (!map.has(s.location.id)) map.set(s.location.id, { location: s.location, stages: [] });
      map.get(s.location.id)!.stages.push(s);
    });
    return Array.from(map.values()).sort(
      (a, b) =>
        a.location.country.localeCompare(b.location.country) ||
        a.location.name.localeCompare(b.location.name),
    );
  }, [filtered]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <IconCombobox
          label="Buscar tramo"
          options={stageOptions}
          value=""
          onChange={(id) => {
            if (id) router.push(`/tiempos/${id}`);
          }}
          searchable
          placeholder="Las Juntas, Wales…"
        />
        <IconCombobox
          label="Localidad"
          options={locationOptions}
          value={locationId}
          onChange={setLocationId}
          searchable
          placeholder="Todas las localidades"
        />
      </div>

      {grouped.length === 0 ? (
        <p className="text-foreground/60 flex items-center justify-center gap-2 py-12">
          <Search size={16} /> Sin resultados.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map((group) => (
            <section key={group.location.id} className="flex flex-col gap-3">
              <header className="flex items-center gap-3">
                <div className="bg-foreground/5 relative h-12 w-20 overflow-hidden rounded">
                  {group.location.photoUrl ? (
                    <Image
                      src={group.location.photoUrl}
                      alt={group.location.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="text-foreground/30 flex h-full items-center justify-center text-xl">
                      🗺️
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-foreground/60 text-xs">{group.location.country}</div>
                  <div className="text-lg font-semibold">{group.location.name}</div>
                </div>
                <span className="text-foreground/60 ml-auto text-sm">
                  {group.location.surface}
                </span>
              </header>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.stages.map((stage) => (
                  <Link key={stage.id} href={`/tiempos/${stage.id}`}>
                    <Card className="hover:border-primary/40 flex flex-row items-center justify-between p-3 transition-colors">
                      <div className="flex flex-col">
                        <div className="text-foreground/60 inline-flex items-center gap-1 text-xs">
                          {stage.direction === Direction.FORWARD ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          )}
                          {stage.distanceKm.toFixed(2)} km
                        </div>
                        <div className="font-medium">{stage.name}</div>
                      </div>
                      <span className="text-foreground/60 text-sm">{stage.timesCount} t.</span>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationThumb({ loc }: { loc: StageItem['location'] }) {
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
