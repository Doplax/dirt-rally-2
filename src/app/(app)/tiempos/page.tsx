import { prisma } from '@/lib/db';
import StagesBrowser from './stages-browser';

export const metadata = { title: 'Tiempos · DR2 Tracker' };

export default async function TiemposPage() {
  const locations = await prisma.location.findMany({
    orderBy: [{ country: 'asc' }, { name: 'asc' }],
    include: {
      stages: {
        orderBy: [{ name: 'asc' }],
        include: { _count: { select: { times: true } } },
      },
    },
  });

  const stages = locations.flatMap((loc) =>
    loc.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      distanceKm: stage.distanceKm,
      direction: stage.direction,
      timesCount: stage._count.times,
      location: {
        id: loc.id,
        name: loc.name,
        country: loc.country,
        surface: loc.surface,
        photoUrl: loc.photoUrl,
      },
    })),
  );

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Tiempos</h1>
        <p className="text-foreground/60">
          Elige un tramo para ver el leaderboard y registrar tu tiempo.
        </p>
      </header>
      <StagesBrowser stages={stages} />
    </section>
  );
}
