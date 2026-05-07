'use client';

import { Button } from '@heroui/react';
import { Cog, Flame, Heart, Layers, Plus, Search, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Field } from '@/components/ui/field';
import { IconCombobox, type ComboOption } from '@/components/ui/icon-combobox';
import { CarFormModal } from './car-form-modal';
import { toggleFavoriteCar } from '@/server/actions/cars';

export type CarItem = {
  id: string;
  name: string;
  className: string;
  classCode: string;
  drivetrain: string | null;
  year: number | null;
  isDlc: boolean;
  dlcPack: string | null;
  isRallycross: boolean;
  photoUrl: string | null;
  isFavorite: boolean;
};

export default function CarsBrowser({ cars, isAdmin }: { cars: CarItem[]; isAdmin: boolean }) {
  const [search, setSearch] = useState('');
  const [classCode, setClassCode] = useState('');
  const [drivetrain, setDrivetrain] = useState('');
  const [dlc, setDlc] = useState<'' | 'base' | 'dlc'>('');
  const [discipline, setDiscipline] = useState<'' | 'rally' | 'rallycross'>('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const classOptions = useMemo<ComboOption[]>(() => {
    const seen = new Map<string, string>();
    cars.forEach((c) => seen.set(c.classCode, c.className));
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
  }, [cars]);

  const drivetrainOptions = useMemo<ComboOption[]>(() => {
    const seen = new Set<string>();
    cars.forEach((c) => c.drivetrain && seen.add(c.drivetrain));
    const sorted = Array.from(seen).sort();
    return [
      {
        id: '',
        label: 'Todas las tracciones',
        visual: (
          <span className="bg-foreground/5 text-foreground/40 flex h-9 w-9 shrink-0 items-center justify-center rounded">
            <Cog size={16} />
          </span>
        ),
      },
      ...sorted.map((d) => ({
        id: d,
        label: d,
        visual: (
          <span className="bg-foreground/5 text-foreground/70 flex h-9 w-9 shrink-0 items-center justify-center rounded text-[10px] font-bold tracking-wider">
            {d}
          </span>
        ),
      })),
    ];
  }, [cars]);

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

  const disciplineOptions = useMemo<ComboOption[]>(
    () => [
      {
        id: '',
        label: 'Ambas disciplinas',
        visual: (
          <span className="bg-foreground/5 text-foreground/40 flex h-9 w-9 shrink-0 items-center justify-center rounded">
            <Flame size={16} />
          </span>
        ),
      },
      {
        id: 'rally',
        label: 'Rally',
        visual: (
          <span className="bg-foreground/10 text-foreground/70 flex h-9 w-9 shrink-0 items-center justify-center rounded text-[10px] font-bold tracking-wider">
            RAL
          </span>
        ),
      },
      {
        id: 'rallycross',
        label: 'Rallycross',
        visual: (
          <span className="bg-foreground/10 text-foreground/70 flex h-9 w-9 shrink-0 items-center justify-center rounded text-[10px] font-bold tracking-wider">
            RX
          </span>
        ),
      },
    ],
    [],
  );

  const filtered = cars.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (classCode && c.classCode !== classCode) return false;
    if (drivetrain && c.drivetrain !== drivetrain) return false;
    if (dlc === 'base' && c.isDlc) return false;
    if (dlc === 'dlc' && !c.isDlc) return false;
    if (discipline === 'rally' && c.isRallycross) return false;
    if (discipline === 'rallycross' && !c.isRallycross) return false;
    if (onlyFavorites && !c.isFavorite) return false;
    return true;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, { className: string; cars: CarItem[] }>();
    filtered.forEach((c) => {
      const key = c.classCode;
      if (!map.has(key)) map.set(key, { className: c.className, cars: [] });
      map.get(key)!.cars.push(c);
    });
    return Array.from(map.values()).sort((a, b) => a.className.localeCompare(b.className));
  }, [filtered]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-10">
        <Field
          label="Buscar"
          name="search"
          inputProps={{
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: 'Nombre…',
          }}
          className="col-span-2 lg:col-span-2"
        />
        <IconCombobox
          label="Clase"
          options={classOptions}
          value={classCode}
          onChange={setClassCode}
          searchable
          placeholder="Todas las clases"
          className="col-span-2 lg:col-span-3"
        />
        <IconCombobox
          label="Tracción"
          options={drivetrainOptions}
          value={drivetrain}
          onChange={setDrivetrain}
          placeholder="Todas las tracciones"
          className="col-span-2 lg:col-span-2"
        />
        <IconCombobox
          label="Tipo"
          options={dlcOptions}
          value={dlc}
          onChange={(id) => setDlc(id as typeof dlc)}
          placeholder="Todos los tipos"
          className="col-span-1 lg:col-span-1"
        />
        <IconCombobox
          label="Disciplina"
          options={disciplineOptions}
          value={discipline}
          onChange={(id) => setDiscipline(id as typeof discipline)}
          placeholder="Ambas"
          className="col-span-1 lg:col-span-2"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-foreground/80 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyFavorites}
            onChange={(e) => setOnlyFavorites(e.target.checked)}
          />
          Solo favoritos
        </label>
        {isAdmin ? (
          <CarFormModal
            trigger={
              <Button variant="primary">
                <Plus size={16} /> Crear coche
              </Button>
            }
          />
        ) : null}
      </div>

      {grouped.length === 0 ? (
        <p className="text-foreground/60 flex items-center justify-center gap-2 py-12 text-center">
          <Search size={16} /> Sin resultados.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map((group) => (
            <section key={group.className} className="flex flex-col gap-3">
              <h2 className="text-foreground/80 text-lg font-semibold">{group.className}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.cars.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function CarCard({ car }: { car: CarItem }) {
  return (
    <div className="border-foreground/10 hover:border-foreground/25 bg-foreground/[0.02] group relative flex flex-col overflow-hidden rounded-xl border transition-all hover:shadow-lg">
      <FavoriteButton carId={car.id} initialFavorited={car.isFavorite} />
      <Link href={`/coches/${car.id}`} className="flex flex-col">
        <div className="bg-foreground/5 relative aspect-[16/10]">
          {car.photoUrl ? (
            <Image
              src={car.photoUrl}
              alt={car.name}
              fill
              sizes="(max-width: 640px) 100vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="text-foreground/30 flex h-full items-center justify-center text-3xl">
              🏎️
            </div>
          )}
          <span
            className={[
              'absolute top-2 right-2 rounded px-2 py-0.5 text-[11px] font-medium tracking-wide',
              car.isDlc
                ? 'bg-primary text-primary-foreground'
                : 'bg-foreground/40 text-background',
            ].join(' ')}
          >
            {car.isDlc ? 'DLC' : 'BASE'}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 px-3 pt-2 pb-2.5 leading-tight">
          <div className="text-sm font-semibold">{car.name}</div>
          <div className="text-foreground/60 flex flex-wrap gap-1 text-[11px]">
            {car.drivetrain ? (
              <span className="border-foreground/15 rounded border px-1.5 py-0.5">
                {car.drivetrain}
              </span>
            ) : null}
            {car.year ? (
              <span className="border-foreground/15 rounded border px-1.5 py-0.5">{car.year}</span>
            ) : null}
            {car.isRallycross ? (
              <span className="border-foreground/15 rounded border px-1.5 py-0.5">RX</span>
            ) : null}
          </div>
        </div>
      </Link>
    </div>
  );
}

function FavoriteButton({
  carId,
  initialFavorited,
}: {
  carId: string;
  initialFavorited: boolean;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  const onToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const optimistic = !favorited;
    setFavorited(optimistic);
    startTransition(async () => {
      const result = await toggleFavoriteCar(carId);
      if (!result.ok) {
        setFavorited(!optimistic);
        return;
      }
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-label={favorited ? 'Quitar de favoritos' : 'Marcar como favorito'}
      aria-pressed={favorited}
      className="bg-background/70 hover:bg-background/90 absolute top-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors disabled:opacity-50"
    >
      <Heart
        size={16}
        className={[
          'transition-all',
          favorited ? 'fill-red-500 text-red-500' : 'text-foreground/70',
        ].join(' ')}
      />
    </button>
  );
}
