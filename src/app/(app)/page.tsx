import { Card } from '@heroui/react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Inicio · DiRT Tracker' };

export default async function HomePage() {
  const session = await auth();
  const username = session?.user.username ?? '';

  const [timesCount, locationsCount, stagesCount, carsCount] = await Promise.all([
    prisma.timeRecord.count(),
    prisma.location.count(),
    prisma.stage.count(),
    prisma.car.count(),
  ]);

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
          Bienvenido al DiRT Tracker. Usa la barra lateral para navegar.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="text-foreground/60 text-xs uppercase tracking-wide">
              {stat.label}
            </div>
            <div className="text-3xl font-bold">{stat.value}</div>
          </Card>
        ))}
      </div>
    </section>
  );
}
