import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import LocationsBrowser from './locations-browser';

export const metadata = { title: 'Mapas · DR2 Tracker' };

export default async function MapasPage() {
  const session = await auth();
  const isAdmin = session?.user.role === 'ADMIN';

  const locations = await prisma.location.findMany({
    orderBy: [{ country: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { stages: true } },
    },
  });

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Mapas</h1>
          <p className="text-foreground/60">
            {locations.length} localidades · {locations.reduce((acc, l) => acc + l._count.stages, 0)}{' '}
            tramos
          </p>
        </div>
      </header>
      <LocationsBrowser
        isAdmin={isAdmin}
        locations={locations.map((l) => ({
          id: l.id,
          name: l.name,
          country: l.country,
          surface: l.surface,
          isDlc: l.isDlc,
          dlcPack: l.dlcPack,
          photoUrl: l.photoUrl,
          stagesCount: l._count.stages,
        }))}
      />
    </section>
  );
}
