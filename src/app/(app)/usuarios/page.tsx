import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import UsersTable from './users-table';

export const metadata = { title: 'Usuarios · DiRT Tracker' };

export default async function UsuariosPage() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') redirect('/');

  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: 'asc' }],
    include: {
      _count: { select: { timesAsRegistrar: true, timesAsRunner: true } },
    },
  });

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Usuarios</h1>
          <p className="text-foreground/60">{users.length} usuarios registrados</p>
        </div>
      </header>

      <UsersTable
        currentUserId={session.user.id}
        users={users.map((u) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          photoUrl: u.photoUrl,
          mustChangePassword: u.mustChangePassword,
          createdAt: u.createdAt.toISOString(),
          timesAsRunner: u._count.timesAsRunner,
          timesAsRegistrar: u._count.timesAsRegistrar,
        }))}
      />
    </section>
  );
}
