import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TimesTable } from '@/components/shared/times-table';
import { UserAdminPanel } from './user-admin-panel';

export const metadata = { title: 'Detalle de usuario · DiRT Tracker' };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  // Whole /usuarios area is admin-only.
  if (!session || session.user.role !== 'ADMIN') redirect('/');

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      timesAsRunner: {
        include: {
          car: {
            select: { id: true, name: true, className: true, photoUrl: true },
          },
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
      },
    },
  });

  if (!user) notFound();

  const sortedTimes = user.timesAsRunner
    .map((t) => ({ ...t, totalMs: t.timeMs + t.penaltyMs }))
    .sort((a, b) => {
      if (a.isDnf && !b.isDnf) return 1;
      if (!a.isDnf && b.isDnf) return -1;
      return a.totalMs - b.totalMs;
    });

  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <section className="flex flex-col gap-6">
      <Link
        href="/usuarios"
        className="text-foreground/60 hover:text-foreground flex items-center gap-1 text-sm"
      >
        <ArrowLeft size={16} /> Volver a Usuarios
      </Link>

      <div className="grid gap-5 md:grid-cols-[2fr_3fr]">
        <div className="bg-foreground/5 relative aspect-square overflow-hidden rounded-xl md:aspect-[4/5]">
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoUrl}
              alt={user.username}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-foreground/40 flex h-full items-center justify-center text-7xl font-bold">
              {initials}
            </div>
          )}
          <span
            className={[
              'absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-medium tracking-wide',
              user.role === 'ADMIN'
                ? 'bg-primary text-primary-foreground'
                : 'bg-foreground/40 text-background',
            ].join(' ')}
          >
            {user.role === 'ADMIN' ? 'Admin' : 'Piloto'}
          </span>
        </div>

        <header className="flex flex-col gap-3">
          <div className="text-foreground/60 text-sm">Usuario</div>
          <h1 className="text-3xl font-bold">{user.username}</h1>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="col-span-full sm:col-span-2">
              <dt className="text-foreground/60">Email</dt>
              <dd className="flex items-center gap-1.5 font-medium">
                {user.email ? (
                  <>
                    <Mail size={14} className="text-foreground/50" />
                    {user.email}
                  </>
                ) : (
                  <span className="text-foreground/40">Sin email</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-foreground/60">Tiempos como corredor</dt>
              <dd className="font-medium">{user.timesAsRunner.length}</dd>
            </div>
            <div>
              <dt className="text-foreground/60">Alta</dt>
              <dd className="font-medium">
                {user.createdAt.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </dd>
            </div>
            {user.mustChangePassword ? (
              <div className="col-span-full">
                <span className="bg-amber-500/15 text-amber-300 ring-amber-500/30 inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs ring-1">
                  Pendiente de cambiar contraseña
                </span>
              </div>
            ) : null}
          </dl>
          <UserAdminPanel
            user={{
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
            }}
            isSelf={user.id === session.user.id}
          />
        </header>
      </div>

      <TimesTable
        entries={sortedTimes.map((t) => ({
          id: t.id,
          totalMs: t.totalMs,
          timeMs: t.timeMs,
          penaltyMs: t.penaltyMs,
          isDnf: t.isDnf,
          weather: t.weather,
          timeOfDay: t.timeOfDay,
          createdAt: t.createdAt.toISOString(),
          href: `/tiempos/${t.stage.id}`,
          runner: { id: user.id, username: user.username, photoUrl: user.photoUrl },
          car: t.car,
          stage: t.stage,
        }))}
        columns={['rank', 'stage', 'car', 'time', 'penalty', 'total', 'conditions', 'date']}
        emptyMessage={`${user.username} aún no ha registrado ningún tiempo.`}
      />
    </section>
  );
}
