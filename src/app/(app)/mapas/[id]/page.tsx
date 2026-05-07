import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CountryFlag } from '@/components/ui/country-flag';
import { LocationAdminPanel } from './location-admin-panel';
import { StagesTable } from './stages-table';

export const metadata = { title: 'Detalle de mapa · DR2 Tracker' };

export default async function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user.role === 'ADMIN';

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      stages: { orderBy: [{ name: 'asc' }] },
    },
  });
  if (!location) notFound();

  return (
    <section className="flex flex-col gap-6">
      <Link href="/mapas" className="text-foreground/60 hover:text-foreground flex items-center gap-1 text-sm">
        <ArrowLeft size={16} /> Volver a Mapas
      </Link>

      <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
        <div className="bg-foreground/5 relative aspect-[16/9] overflow-hidden rounded-lg">
          {location.photoUrl ? (
            <Image
              src={location.photoUrl}
              alt={location.name}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
          ) : (
            <div className="text-foreground/30 flex h-full items-center justify-center text-6xl">
              🗺️
            </div>
          )}
          {location.isDlc ? (
            <span className="bg-primary text-primary-foreground absolute top-3 right-3 rounded px-2 py-1 text-xs font-medium">
              DLC{location.dlcPack ? ` · ${location.dlcPack}` : ''}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-foreground/60 text-sm">{location.country}</div>
              <h1 className="text-3xl font-bold">{location.name}</h1>
            </div>
            <CountryFlag country={location.country} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-foreground/60">Superficie</dt>
              <dd className="font-medium">{location.surface}</dd>
            </div>
            <div>
              <dt className="text-foreground/60">Tramos</dt>
              <dd className="font-medium">{location.stages.length}</dd>
            </div>
          </dl>
          {isAdmin ? (
            <LocationAdminPanel
              location={{
                id: location.id,
                name: location.name,
                country: location.country,
                surface: location.surface,
                isDlc: location.isDlc,
                dlcPack: location.dlcPack,
              }}
            />
          ) : null}
        </div>
      </div>

      <StagesTable
        locationId={location.id}
        isAdmin={isAdmin}
        stages={location.stages.map((s) => ({
          id: s.id,
          name: s.name,
          distanceKm: s.distanceKm,
          direction: s.direction,
        }))}
      />
    </section>
  );
}
