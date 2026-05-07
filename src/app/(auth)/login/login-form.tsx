'use client';

import { Button, Card } from '@heroui/react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Field } from '@/components/ui/field';

export default function LoginForm({
  callbackUrl,
  initialError,
}: {
  callbackUrl: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError ? 'Credenciales no válidas' : null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = String(data.get('username') ?? '').trim();
    const password = String(data.get('password') ?? '');

    if (!username || !password) {
      setError('Introduce usuario y contraseña');
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError('Usuario o contraseña incorrectos');
        return;
      }

      router.replace(callbackUrl || '/');
      router.refresh();
    });
  };

  return (
    <Card className="w-full max-w-sm p-6">
      <Card.Header>
        <div className="mb-2 flex justify-center">
          <Image
            src="/logo.png"
            alt="DR2 Tracker"
            width={180}
            height={101}
            priority
            className="h-auto w-32"
          />
        </div>
        <Card.Title className="text-center text-2xl font-semibold">
          DR2 Tracker
        </Card.Title>
        <Card.Description className="text-center">
          Inicia sesión para registrar tiempos
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field
            label="Usuario"
            name="username"
            isRequired
            inputProps={{ autoComplete: 'username', autoFocus: true }}
          />
          <Field
            label="Contraseña"
            name="password"
            type="password"
            isRequired
            inputProps={{ autoComplete: 'current-password' }}
          />
          {error ? <p className="text-danger text-sm">{error}</p> : null}
          <Button type="submit" variant="primary" isDisabled={pending} fullWidth>
            {pending ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </Card.Content>
    </Card>
  );
}
