import { Card } from '@heroui/react';
import { ArrowDown, ArrowUp, Trophy } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { msToString } from '@/lib/time-format';
import { Direction } from '@prisma/client';

export const metadata = { title: 'Inicio · DR2 Tracker' };

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function HomePage() {
  const session = await auth();
  const username = session?.user.username ?? '';
  // eslint-disable-next-line react-hooks/purity -- server component, runs per request
  const sinceWeek = new Date(Date.now() - ONE_WEEK_MS);

  const [
    timesCount,
    locationsCount,
    stagesCount,
    carsCount,
    bestThisWeek,
    topRunners,
    recentTimes,
  ] = await Promise.all([
    prisma.timeRecord.count(),
    prisma.location.count(),
    prisma.stage.count(),
    prisma.car.count(),
    prisma.timeRecord.findFirst({
      where: { isDnf: false, createdAt: { gte: sinceWeek } },
      orderBy: [{ timeMs: 'asc' }],
      include: {
        runner: { select: { id: true, username: true } },
        stage: {
          select: {
            id: true,
            name: true,
            distanceKm: true,
            direction: true,
            location: { select: { id: true, name: true, country: true } },
          },
        },
        car: { select: { name: true, className: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { username: 'asc' },
      include: { _count: { select: { timesAsRunner: true } } },
    }),
    prisma.timeRecord.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        runner: { select: { username: true } },
        stage: { select: { id: true, name: true } },
      },
    }),
  ]);

  const sortedRunners = topRunners
    .map((u) => ({ id: u.id, username: u.username, total: u._count.timesAsRunner }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const stats = [
    { label: 'Tiempos registrados', value: timesCount },
    { label: 'Localidades', value: locationsCount },
    { label: 'Tramos', value: stagesCount },
    { label: 'Coches', value: carsCount },
  ];

  return (
    <section className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Hola, {username} 🏁</h1>
        <p className="text-foreground/60">
          Bienvenido al DR2 Tracker. Usa la barra lateral para navegar.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="text-foreground/60 text-xs uppercase tracking-wide">{stat.label}</div>
            <div className="text-3xl font-bold">{stat.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <Card.Header>
            <Card.Title className="flex items-center gap-2 text-lg font-semibold">
              <Trophy size={18} className="text-primary" /> Mejor tiempo de la semana
            </Card.Title>
          </Card.Header>
          <Card.Content>
            {bestThisWeek ? (
              <Link
                href={`/tiempos/${bestThisWeek.stage.id}`}
                className="hover:bg-foreground/5 -m-2 flex flex-col gap-1 rounded-md p-2"
              >
                <div className="text-foreground/60 text-xs">
                  {bestThisWeek.stage.location.country} · {bestThisWeek.stage.location.name}
                </div>
                <div className="flex items-center gap-2 font-semibold">
                  {bestThisWeek.stage.name}
                  {bestThisWeek.stage.direction === Direction.FORWARD ? (
                    <ArrowUp size={14} className="text-foreground/50" />
                  ) : (
                    <ArrowDown size={14} className="text-foreground/50" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-mono text-lg font-semibold">
                    {msToString(bestThisWeek.timeMs + bestThisWeek.penaltyMs)}
                  </span>
                  <span className="text-foreground/70">por {bestThisWeek.runner.username}</span>
                  <span className="text-foreground/50 text-xs">
                    {bestThisWeek.car.name} · {bestThisWeek.car.className}
                  </span>
                </div>
              </Link>
            ) : (
              <p className="text-foreground/60 text-sm">
                Aún no hay tiempos esta semana. ¡Empieza a registrar!
              </p>
            )}
          </Card.Content>
        </Card>

        <Card className="p-5">
          <Card.Header>
            <Card.Title className="text-lg font-semibold">Top 3 corredores</Card.Title>
          </Card.Header>
          <Card.Content>
            {sortedRunners.length === 0 ? (
              <p className="text-foreground/60 text-sm">Sin datos.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {sortedRunners.map((runner, index) => (
                  <li
                    key={runner.id}
                    className="border-foreground/10 flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-foreground/40 w-5 text-right font-mono text-sm">
                        {index + 1}.
                      </span>
                      <span className="font-medium">{runner.username}</span>
                    </span>
                    <span className="text-foreground/60 text-sm">{runner.total} tiempos</span>
                  </li>
                ))}
              </ol>
            )}
          </Card.Content>
        </Card>
      </div>

      <Card className="p-5">
        <Card.Header>
          <Card.Title className="text-lg font-semibold">Últimos tiempos registrados</Card.Title>
        </Card.Header>
        <Card.Content>
          {recentTimes.length === 0 ? (
            <p className="text-foreground/60 text-sm">Sin actividad reciente.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {recentTimes.map((time) => (
                <li
                  key={time.id}
                  className="border-foreground/10 flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-col">
                    <Link href={`/tiempos/${time.stage.id}`} className="font-medium hover:underline">
                      {time.stage.name}
                    </Link>
                    <span className="text-foreground/60 text-xs">
                      {time.runner.username} · {new Date(time.createdAt).toLocaleString('es-ES')}
                    </span>
                  </div>
                  <span className="font-mono">
                    {time.isDnf ? 'DNF' : msToString(time.timeMs + time.penaltyMs)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card.Content>
      </Card>
    </section>
  );
}
