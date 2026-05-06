'use client';

import { Button, Card } from '@heroui/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Field } from '@/components/ui/field';
import { changePassword } from '@/server/actions/password';

type FieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

export default function ChangePasswordForm({
  forced,
  username,
}: {
  forced: boolean;
  username: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setErrors({});
    setGlobalError(null);

    startTransition(async () => {
      const result = await changePassword(formData);
      if (result.ok) {
        setSuccess(true);
        await update({ mustChangePassword: false });
        router.replace('/');
        router.refresh();
        return;
      }
      if (result.field) {
        setErrors({ [result.field]: result.error });
      } else {
        setGlobalError(result.error);
      }
    });
  };

  return (
    <Card className="w-full max-w-sm p-6">
      <Card.Header>
        <Card.Title className="text-2xl font-semibold">Cambiar contraseña</Card.Title>
        <Card.Description>
          {forced
            ? `Hola ${username}, define una nueva contraseña antes de continuar.`
            : 'Actualiza tu contraseña.'}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field
            label="Contraseña actual"
            name="currentPassword"
            type="password"
            isRequired
            errorMessage={errors.currentPassword}
            inputProps={{ autoComplete: 'current-password' }}
          />
          <Field
            label="Nueva contraseña"
            name="newPassword"
            type="password"
            isRequired
            errorMessage={errors.newPassword}
            inputProps={{ autoComplete: 'new-password' }}
          />
          <Field
            label="Confirmar contraseña"
            name="confirmPassword"
            type="password"
            isRequired
            errorMessage={errors.confirmPassword}
            inputProps={{ autoComplete: 'new-password' }}
          />
          {globalError ? <p className="text-danger text-sm">{globalError}</p> : null}
          {success ? <p className="text-success text-sm">Contraseña actualizada</p> : null}
          <Button type="submit" variant="primary" isDisabled={pending} fullWidth>
            {pending ? 'Guardando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </Card.Content>
    </Card>
  );
}
