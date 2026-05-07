import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { FilteredTimesTable } from '@/components/shared/filtered-times-table';
import { CarAdminPanel } from './car-admin-panel';
import { FavoriteToggle } from './favorite-toggle';

export const metadata = { title: 'Detalle de coche · DiRT Tracker' };

export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;
  const isAdmin = session.user.role === 'ADMIN';

  const [car, times, favorite] = await Promise.all([
    prisma.car.findUnique({ where: { id } }),
    prisma.timeRecord.findMany({
      where: { carId: id },
      include: {
        runner: { select: { id: true, username: true, photoUrl: true } },
        stage: {
          select: {
            id: true,
            name: true,
            distanceKm: true,
            direction: true,
            location: {
              select: { id: true, name: true, country: true, photoUrl: true },
            },
          },
        },
      },
    }),
    prisma.favoriteCar.findUnique({
      where: { userId_carId: { userId: session.user.id, carId: id } },
    }),
  ]);

  if (!car) notFound();

  const sortedTimes = times
    .map((t) => ({ ...t, totalMs: t.timeMs + t.penaltyMs }))
    .sort((a, b) => {
      if (a.isDnf && !b.isDnf) return 1;
      if (!a.isDnf && b.isDnf) return -1;
      return a.totalMs - b.totalMs;
    });

  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/coches"
        className="text-foreground/60 hover:text-foreground flex items-center gap-1 text-sm"
      >
        <ArrowLeft size={16} /> Volver a Coches
      </Link>

      <div className="grid gap-5 md:grid-cols-[2fr_3fr]">
        <div className="bg-foreground/5 relative aspect-[16/10] overflow-hidden rounded-xl">
          {car.photoUrl ? (
            <Image
              src={car.photoUrl}
              alt={car.name}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="text-foreground/30 flex h-full items-center justify-center text-6xl">
              🏎️
            </div>
          )}
          <span
            className={[
              'absolute top-3 right-3 rounded px-2 py-1 text-xs font-medium tracking-wide',
              car.isDlc
                ? 'bg-primary text-primary-foreground'
                : 'bg-foreground/40 text-background',
            ].join(' ')}
          >
            {car.isDlc ? `DLC${car.dlcPack ? ` · ${car.dlcPack}` : ''}` : 'BASE'}
          </span>
        </div>

        <header className="flex flex-col gap-3">
          <div className="text-foreground/60 text-sm">{car.className}</div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-3xl font-bold">{car.name}</h1>
            <FavoriteToggle carId={car.id} initialFavorited={!!favorite} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {car.drivetrain ? (
              <div>
                <dt className="text-foreground/60">Tracción</dt>
                <dd className="font-medium">{car.drivetrain}</dd>
              </div>
            ) : null}
            {car.year ? (
              <div>
                <dt className="text-foreground/60">Año</dt>
                <dd className="font-medium">{car.year}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-foreground/60">Disciplina</dt>
              <dd className="font-medium">{car.isRallycross ? 'Rallycross' : 'Rally'}</dd>
            </div>
            <div>
              <dt className="text-foreground/60">Tiempos registrados</dt>
              <dd className="font-medium">{times.length}</dd>
            </div>
          </dl>
          {isAdmin ? (
            <CarAdminPanel
              car={{
                id: car.id,
                name: car.name,
                className: car.className,
                classCode: car.classCode,
                drivetrain: car.drivetrain,
                year: car.year,
                isDlc: car.isDlc,
                dlcPack: car.dlcPack,
                isRallycross: car.isRallycross,
              }}
            />
          ) : null}
        </header>
      </div>

      <FilteredTimesTable
        times={sortedTimes.map((t) => ({
          id: t.id,
          totalMs: t.totalMs,
          timeMs: t.timeMs,
          penaltyMs: t.penaltyMs,
          isDnf: t.isDnf,
          weather: t.weather,
          timeOfDay: t.timeOfDay,
          createdAt: t.createdAt.toISOString(),
          href: `/tiempos/${t.stage.id}`,
          runner: t.runner,
          car: {
            id: car.id,
            name: car.name,
            className: car.className,
            classCode: car.classCode,
            photoUrl: car.photoUrl,
          },
          stage: t.stage,
        }))}
        columns={['rank', 'stage', 'runner', 'time', 'penalty', 'total', 'conditions', 'date']}
        filters={['runner', 'weather', 'dnf']}
        filtersStorageKey={`coches.${car.id}.filtersOpen`}
        emptyMessage="Aún no hay tiempos registrados con este coche."
      />
    </section>
  );
}
