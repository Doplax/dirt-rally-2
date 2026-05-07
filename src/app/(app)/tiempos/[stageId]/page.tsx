import { ArrowDown, ArrowLeft, ArrowUp, Trophy } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Direction } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { msToString } from '@/lib/time-format';
import { CountryFlag } from '@/components/ui/country-flag';
import StageLeaderboard from './stage-leaderboard';

export const metadata = { title: 'Leaderboard · DR2 Tracker' };

export default async function StageDetailPage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  const session = await auth();
  if (!session) return null;

  const [stage, users, cars, times, favoriteCarIds] = await Promise.all([
    prisma.stage.findUnique({
      where: { id: stageId },
      include: { location: true },
    }),
    prisma.user.findMany({
      orderBy: { username: 'asc' },
      select: { id: true, username: true, photoUrl: true },
    }),
    prisma.car.findMany({
      orderBy: [{ className: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        className: true,
        classCode: true,
        photoUrl: true,
      },
    }),
    prisma.timeRecord.findMany({
      where: { stageId },
      include: {
        runner: { select: { id: true, username: true, photoUrl: true } },
        registrar: { select: { id: true, username: true } },
        car: {
          select: { id: true, name: true, className: true, classCode: true, photoUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.favoriteCar
      .findMany({ where: { userId: session.user.id }, select: { carId: true } })
      .then((rows) => new Set(rows.map((r) => r.carId))),
  ]);

  if (!stage) notFound();

  const heroPhoto = stage.photoUrl ?? stage.location.photoUrl;

  const bestEntry = times
    .filter((t) => !t.isDnf)
    .map((t) => ({ ...t, totalMs: t.timeMs + t.penaltyMs }))
    .sort((a, b) => a.totalMs - b.totalMs)[0];

  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/tiempos"
        className="text-foreground/60 hover:text-foreground flex items-center gap-1 text-sm"
      >
        <ArrowLeft size={16} /> Volver a Tiempos
      </Link>

      <div className="grid gap-5 md:grid-cols-[2fr_3fr]">
        <div className="bg-foreground/5 relative aspect-[16/9] overflow-hidden rounded-lg">
          {heroPhoto ? (
            <Image
              src={heroPhoto}
              alt={stage.name}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="text-foreground/30 flex h-full items-center justify-center text-6xl">
              🗺️
            </div>
          )}
        </div>

        <header className="flex flex-col gap-3">
          <Link
            href={`/mapas/${stage.location.id}`}
            className="text-foreground/60 hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            <CountryFlag country={stage.location.country} variant="inline" />
            {stage.location.country} · {stage.location.name}
          </Link>
          <h1 className="text-3xl font-bold">{stage.name}</h1>
          <div className="text-foreground/70 flex flex-wrap items-center gap-3 text-sm">
            <span className="border-foreground/15 inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
              {stage.direction === Direction.FORWARD ? (
                <>
                  <ArrowUp size={14} /> Forward
                </>
              ) : (
                <>
                  <ArrowDown size={14} /> Reverse
                </>
              )}
            </span>
            <span>{stage.distanceKm.toFixed(2)} km</span>
            <span>{stage.location.surface}</span>
          </div>

          <div className="mt-auto">
            {bestEntry ? (
              <div className="from-amber-500/10 to-amber-500/0 ring-amber-500/20 flex items-center gap-3 rounded-lg bg-gradient-to-r p-3 ring-1">
                <span className="bg-amber-500/20 ring-amber-500/40 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1">
                  <Trophy size={18} className="fill-amber-300 text-amber-400" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-amber-300/80 text-[10px] font-semibold uppercase tracking-wider">
                    Mejor tiempo
                  </span>
                  <span className="truncate font-semibold">
                    {bestEntry.runner.username}
                  </span>
                  <span className="text-foreground/60 truncate text-xs">
                    {bestEntry.car.name}
                  </span>
                </div>
                <span className="font-mono text-lg font-bold tabular-nums text-amber-200">
                  {msToString(bestEntry.totalMs)}
                </span>
              </div>
            ) : (
              <div className="border-foreground/10 text-foreground/50 flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm">
                <Trophy size={18} className="text-foreground/30" />
                Sin tiempos registrados todavía.
              </div>
            )}
          </div>
        </header>
      </div>

      <StageLeaderboard
        stage={{
          id: stage.id,
          name: stage.name,
        }}
        currentUserId={session.user.id}
        users={users.map((u) => ({ id: u.id, username: u.username, photoUrl: u.photoUrl }))}
        cars={cars}
        favoriteCarIds={Array.from(favoriteCarIds)}
        times={times.map((t) => ({
          id: t.id,
          totalMs: t.timeMs + t.penaltyMs,
          runner: t.runner,
          registrar: t.registrar,
          car: t.car,
          stage: {
            id: stage.id,
            name: stage.name,
            distanceKm: stage.distanceKm,
            direction: stage.direction,
            location: {
              id: stage.location.id,
              name: stage.location.name,
              country: stage.location.country,
              photoUrl: stage.location.photoUrl,
            },
          },
          timeMs: t.timeMs,
          penaltyMs: t.penaltyMs,
          isDnf: t.isDnf,
          weather: t.weather,
          timeOfDay: t.timeOfDay,
          inputDevice: t.inputDevice,
          usesVr: t.usesVr,
          notes: t.notes,
          createdAt: t.createdAt.toISOString(),
        }))}
      />
    </section>
  );
}
