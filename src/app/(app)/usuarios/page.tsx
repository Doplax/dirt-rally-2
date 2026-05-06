import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export const metadata = { title: 'Usuarios · DiRT Tracker' };

export default async function UsuariosPage() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') redirect('/');

  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-3xl font-bold">Usuarios</h1>
      <p className="text-foreground/60">Gestión de usuarios. (Fase 9)</p>
    </section>
  );
}
