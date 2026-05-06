import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import CarsBrowser from './cars-browser';

export const metadata = { title: 'Coches · DiRT Tracker' };

export default async function CochesPage() {
  const session = await auth();
  const isAdmin = session?.user.role === 'ADMIN';

  const cars = await prisma.car.findMany({
    orderBy: [{ isRallycross: 'asc' }, { className: 'asc' }, { name: 'asc' }],
  });

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Coches</h1>
          <p className="text-foreground/60">{cars.length} coches registrados</p>
        </div>
      </header>
      <CarsBrowser
        isAdmin={isAdmin}
        cars={cars.map((c) => ({
          id: c.id,
          name: c.name,
          className: c.className,
          classCode: c.classCode,
          drivetrain: c.drivetrain,
          year: c.year,
          isDlc: c.isDlc,
          dlcPack: c.dlcPack,
          isRallycross: c.isRallycross,
          photoUrl: c.photoUrl,
        }))}
      />
    </section>
  );
}
