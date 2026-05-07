import LoginForm from './login-form';

export const metadata = {
  title: 'Iniciar sesión · DR2 Tracker',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <LoginFormWrapper searchParams={searchParams} />
    </main>
  );
}

async function LoginFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm callbackUrl={params.callbackUrl ?? '/'} initialError={params.error} />;
}
