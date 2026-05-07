import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Direction } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import StageLeaderboard from './stage-leaderboard';

export const metadata = { title: 'Leaderboard · DiRT Tracker' };

export default async function StageDetailPage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  const session = await auth();
  if (!session) return null;

  const [stage, users, cars, times] = await Promise.all([
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
  ]);

  if (!stage) notFound();

  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/tiempos"
        className="text-foreground/60 hover:text-foreground flex items-center gap-1 text-sm"
      >
        <ArrowLeft size={16} /> Volver a Tiempos
      </Link>

      <header className="flex flex-col gap-2">
        <Link
          href={`/mapas/${stage.location.id}`}
          className="text-foreground/60 hover:text-foreground text-sm"
        >
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
      </header>

      <StageLeaderboard
        stage={{
          id: stage.id,
          name: stage.name,
        }}
        currentUserId={session.user.id}
        users={users.map((u) => ({ id: u.id, username: u.username, photoUrl: u.photoUrl }))}
        cars={cars}
        times={times.map((t) => ({
          id: t.id,
          runner: t.runner,
          registrar: t.registrar,
          car: t.car,
          timeMs: t.timeMs,
          penaltyMs: t.penaltyMs,
          isDnf: t.isDnf,
          weather: t.weather,
          timeOfDay: t.timeOfDay,
          notes: t.notes,
          createdAt: t.createdAt.toISOString(),
        }))}
      />
    </section>
  );
}
