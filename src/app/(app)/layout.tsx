import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.mustChangePassword) redirect('/change-password');

  return (
    <div className="bg-background flex min-h-screen flex-col md:flex-row">
      <Sidebar
        user={{
          username: session.user.username,
          role: session.user.role,
          photoUrl: session.user.image ?? null,
        }}
      />
      <main className="flex flex-1 flex-col p-6 md:p-10">{children}</main>
    </div>
  );
}
