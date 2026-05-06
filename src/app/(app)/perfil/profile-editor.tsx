'use client';

import { Avatar, Button, Card } from '@heroui/react';
import { Upload } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Role } from '@prisma/client';
import { Field } from '@/components/ui/field';
import {
  changeOwnPassword,
  updateOwnProfile,
  uploadOwnPhoto,
} from '@/server/actions/users';

export default function ProfileEditor({
  user,
}: {
  user: { id: string; username: string; photoUrl: string | null; role: Role };
}) {
  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <Card.Header>
          <Card.Title className="text-lg font-semibold">Datos básicos</Card.Title>
        </Card.Header>
        <Card.Content>
          <DataForm user={user} />
        </Card.Content>
      </Card>
      <Card className="p-5">
        <Card.Header>
          <Card.Title className="text-lg font-semibold">Cambiar contraseña</Card.Title>
        </Card.Header>
        <Card.Content>
          <PasswordForm />
        </Card.Content>
      </Card>
    </div>
  );
}

function DataForm({
  user,
}: {
  user: { id: string; username: string; photoUrl: string | null; role: Role };
}) {
  const router = useRouter();
  const { update } = useSession();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateOwnProfile(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const newUsername = String(formData.get('username') ?? '');
      await update({ username: newUsername });
      setInfo('Datos actualizados');
      router.refresh();
    });
  };

  const onPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set('file', file);
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await uploadOwnPhoto(formData);
      if (!result.ok) setError(result.error);
      else {
        setInfo('Foto actualizada');
        router.refresh();
      }
    });
    event.target.value = '';
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          {user.photoUrl ? <Avatar.Image src={user.photoUrl} alt={user.username} /> : null}
          <Avatar.Fallback>{user.username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
        </Avatar>
        <label
          className={[
            'border-foreground/15 hover:bg-foreground/5 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium',
            pending ? 'pointer-events-none opacity-60' : '',
          ].join(' ')}
        >
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={onPhotoChange}
            disabled={pending}
          />
          <Upload size={14} /> Cambiar foto
        </label>
      </div>
      <Field
        label="Usuario"
        name="username"
        defaultValue={user.username}
        isRequired
      />
      <p className="text-foreground/60 text-sm">Rol: {user.role === 'ADMIN' ? 'Admin' : 'Piloto'}</p>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      {info ? <p className="text-success text-sm">{info}</p> : null}
      <Button type="submit" variant="primary" isDisabled={pending}>
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    const formData = new FormData(event.currentTarget);
    const next = String(formData.get('newPassword') ?? '');
    const confirm = String(formData.get('confirmPassword') ?? '');
    if (next !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    const form = event.currentTarget;
    startTransition(async () => {
      const result = await changeOwnPassword(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInfo('Contraseña actualizada');
      form.reset();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field
        label="Contraseña actual"
        name="currentPassword"
        type="password"
        isRequired
        inputProps={{ autoComplete: 'current-password' }}
      />
      <Field
        label="Nueva contraseña"
        name="newPassword"
        type="password"
        isRequired
        inputProps={{ autoComplete: 'new-password' }}
      />
      <Field
        label="Confirmar contraseña"
        name="confirmPassword"
        type="password"
        isRequired
        inputProps={{ autoComplete: 'new-password' }}
      />
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      {info ? <p className="text-success text-sm">{info}</p> : null}
      <Button type="submit" variant="primary" isDisabled={pending}>
        {pending ? 'Guardando…' : 'Cambiar contraseña'}
      </Button>
    </form>
  );
}
