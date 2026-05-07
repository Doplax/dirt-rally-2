'use client';

import { Button } from '@heroui/react';
import { Heart, Plus, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Field } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
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

  const classOptions = useMemo(() => {
    const seen = new Map<string, string>();
    cars.forEach((c) => seen.set(c.classCode, c.className));
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [cars]);

  const drivetrainOptions = useMemo(() => {
    const seen = new Set<string>();
    cars.forEach((c) => c.drivetrain && seen.add(c.drivetrain));
    return Array.from(seen).sort().map((d) => ({ value: d, label: d }));
  }, [cars]);

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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field
          label="Buscar"
          name="search"
          inputProps={{
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: 'Nombre…',
          }}
        />
        <NativeSelect
          label="Clase"
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          placeholder="Todas"
          options={classOptions}
        />
        <NativeSelect
          label="Tracción"
          value={drivetrain}
          onChange={(e) => setDrivetrain(e.target.value)}
          placeholder="Todas"
          options={drivetrainOptions}
        />
        <NativeSelect
          label="Tipo"
          value={dlc}
          onChange={(e) => setDlc(e.target.value as typeof dlc)}
          placeholder="Todos"
          options={[
            { value: 'base', label: 'Base' },
            { value: 'dlc', label: 'DLC' },
          ]}
        />
        <NativeSelect
          label="Disciplina"
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value as typeof discipline)}
          placeholder="Ambas"
          options={[
            { value: 'rally', label: 'Rally' },
            { value: 'rallycross', label: 'Rallycross' },
          ]}
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
