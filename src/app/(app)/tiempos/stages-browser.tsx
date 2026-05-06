'use client';

import { Card } from '@heroui/react';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Direction } from '@prisma/client';
import { Field } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';

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
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');

  const locationOptions = useMemo(() => {
    const seen = new Map<string, { name: string; country: string }>();
    stages.forEach((s) => seen.set(s.location.id, s.location));
    return Array.from(seen.entries())
      .map(([value, l]) => ({ value, label: `${l.name} (${l.country})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [stages]);

  const filtered = stages.filter((s) => {
    if (locationId && s.location.id !== locationId) return false;
    if (search) {
      const haystack = `${s.name} ${s.location.name} ${s.location.country}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { location: StageItem['location']; stages: StageItem[] }>();
    filtered.forEach((s) => {
      if (!map.has(s.location.id)) map.set(s.location.id, { location: s.location, stages: [] });
      map.get(s.location.id)!.stages.push(s);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.location.country.localeCompare(b.location.country) ||
      a.location.name.localeCompare(b.location.name),
    );
  }, [filtered]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <Field
          label="Buscar tramo"
          name="search"
          inputProps={{
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: 'Las Juntas, Wales…',
          }}
        />
        <NativeSelect
          label="Localidad"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          placeholder="Todas"
          options={locationOptions}
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
