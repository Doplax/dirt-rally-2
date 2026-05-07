import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import ChangePasswordForm from './change-password-form';

export const metadata = {
  title: 'Cambiar contraseña · DR2 Tracker',
};

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <ChangePasswordForm forced={session.user.mustChangePassword} username={session.user.username} />
    </main>
  );
}
