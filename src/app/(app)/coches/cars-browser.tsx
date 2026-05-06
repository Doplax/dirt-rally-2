'use client';

import { Button, Card } from '@heroui/react';
import { Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Field } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
import { CarFormModal } from './car-form-modal';
import { deleteCar, uploadCarPhoto } from '@/server/actions/cars';

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
};

export default function CarsBrowser({ cars, isAdmin }: { cars: CarItem[]; isAdmin: boolean }) {
  const [search, setSearch] = useState('');
  const [classCode, setClassCode] = useState('');
  const [drivetrain, setDrivetrain] = useState('');
  const [dlc, setDlc] = useState<'' | 'base' | 'dlc'>('');
  const [discipline, setDiscipline] = useState<'' | 'rally' | 'rallycross'>('');

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

      {isAdmin ? (
        <div className="flex justify-end">
          <CarFormModal
            trigger={
              <Button variant="primary">
                <Plus size={16} /> Crear coche
              </Button>
            }
          />
        </div>
      ) : null}

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
                  <CarCard key={car.id} car={car} isAdmin={isAdmin} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function CarCard({ car, isAdmin }: { car: CarItem; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set('file', file);
    setError(null);
    startTransition(async () => {
      const result = await uploadCarPhoto(car.id, formData);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
    event.target.value = '';
  };

  const onDelete = () => {
    if (!confirm(`¿Borrar el coche "${car.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCar(car.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <Card className="overflow-hidden">
      <div className="bg-foreground/5 relative aspect-[16/10]">
        {car.photoUrl ? (
          <Image
            src={car.photoUrl}
            alt={car.name}
            fill
            sizes="(max-width: 640px) 100vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="text-foreground/30 flex h-full items-center justify-center text-3xl">
            🏎️
          </div>
        )}
        {car.isDlc ? (
          <span className="bg-primary text-primary-foreground absolute top-2 right-2 rounded px-2 py-0.5 text-xs font-medium">
            DLC
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="font-semibold">{car.name}</div>
        <div className="text-foreground/60 flex flex-wrap gap-2 text-xs">
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
        {isAdmin ? (
          <div className="border-foreground/10 mt-2 flex flex-wrap gap-1.5 border-t pt-2">
            <CarFormModal
              initial={car}
              trigger={
                <Button variant="ghost" size="sm" isIconOnly aria-label="Editar coche">
                  <Pencil size={14} />
                </Button>
              }
            />
            <label
              className={[
                'border-foreground/15 hover:bg-foreground/5 inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs',
                pending ? 'pointer-events-none opacity-60' : '',
              ].join(' ')}
              aria-label="Subir foto"
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={onUpload}
                disabled={pending}
              />
              <Upload size={14} />
            </label>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label="Borrar coche"
              onPress={onDelete}
              isDisabled={pending}
            >
              <Trash2 size={14} />
            </Button>
            {error ? <span className="text-danger text-xs">{error}</span> : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
