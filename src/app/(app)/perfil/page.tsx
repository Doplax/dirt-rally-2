import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ProfileEditor from './profile-editor';

export const metadata = { title: 'Mi perfil · DiRT Tracker' };

export default async function PerfilPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect('/login');

  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold">Mi perfil</h1>
        <p className="text-foreground/60">Edita tu nombre, foto y contraseña.</p>
      </header>
      <ProfileEditor
        user={{
          id: user.id,
          username: user.username,
          photoUrl: user.photoUrl,
          role: user.role,
        }}
      />
    </section>
  );
}
