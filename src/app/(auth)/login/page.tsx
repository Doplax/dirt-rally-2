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
    <main className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <video
        src="/videos/videoplayback.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="bg-background/60 absolute inset-0 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md">
        <LoginFormWrapper searchParams={searchParams} />
      </div>
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
