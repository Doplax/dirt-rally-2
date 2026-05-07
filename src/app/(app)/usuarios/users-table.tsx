'use client';

import { Avatar, Button } from '@heroui/react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { Role } from '@prisma/client';
import { Field } from '@/components/ui/field';
import { FormModal } from '@/components/ui/form-modal';
import { NativeSelect } from '@/components/ui/native-select';
import { createUser, deleteUser, resetUserPassword } from '@/server/actions/users';

export type UserRow = {
  id: string;
  username: string;
  email: string | null;
  role: Role;
  photoUrl: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  timesAsRunner: number;
  timesAsRegistrar: number;
};

export default function UsersTable({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <UserCreateModal
          trigger={
            <Button variant="primary">
              <Plus size={16} /> Crear usuario
            </Button>
          }
        />
      </div>
      <div className="border-foreground/10 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-foreground/5 text-foreground/70 text-left text-xs uppercase">
            <tr>
              <th className="px-3 py-3 font-medium">Usuario</th>
              <th className="px-3 py-3 font-medium">Email</th>
              <th className="px-3 py-3 font-medium">Rol</th>
              <th className="px-3 py-3 font-medium">Tiempos</th>
              <th className="px-3 py-3 font-medium">Alta</th>
              <th className="px-3 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                onClick={() => router.push(`/usuarios/${user.id}`)}
                className="border-foreground/10 hover:bg-foreground/5 cursor-pointer border-t transition-colors"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      {user.photoUrl ? (
                        <Avatar.Image src={user.photoUrl} alt={user.username} />
                      ) : null}
                      <Avatar.Fallback>
                        {user.username.slice(0, 2).toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.username}</span>
                      {user.mustChangePassword ? (
                        <span className="text-foreground/50 text-xs">
                          Debe cambiar contraseña
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="text-foreground/70 px-3 py-2.5 text-xs">
                  {user.email ?? <span className="text-foreground/40">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={
                      user.role === 'ADMIN'
                        ? 'border-primary/40 text-primary rounded-full border px-2 py-0.5 text-xs font-medium'
                        : 'border-foreground/15 text-foreground/70 rounded-full border px-2 py-0.5 text-xs'
                    }
                  >
                    {user.role === 'ADMIN' ? 'Admin' : 'Piloto'}
                  </span>
                </td>
                <td className="text-foreground/70 px-3 py-2.5 text-xs">
                  {user.timesAsRunner} / {user.timesAsRegistrar}
                </td>
                <td className="text-foreground/70 px-3 py-2.5 whitespace-nowrap text-xs">
                  {new Date(user.createdAt).toLocaleDateString('es-ES')}
                </td>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <RowActions user={user} isSelf={user.id === currentUserId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-foreground/50 text-xs">
        Tiempos: <span className="font-mono">corredor / registrador</span>. Pulsa la fila para
        ver el detalle del usuario.
      </p>
    </div>
  );
}

function RowActions({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onReset = () => {
    if (!confirm(`¿Resetear la contraseña de ${user.username} a "P@ssw0rd"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await resetUserPassword(user.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  };

  const onDelete = () => {
    if (isSelf) return;
    if (!confirm(`¿Borrar al usuario ${user.username}?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        aria-label="Resetear contraseña"
        onPress={onReset}
        isDisabled={pending}
      >
        <KeyRound size={14} />
      </Button>
      {!isSelf ? (
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          aria-label="Borrar usuario"
          onPress={onDelete}
          isDisabled={pending}
        >
          <Trash2 size={14} />
        </Button>
      ) : null}
      {error ? <span className="text-danger text-xs">{error}</span> : null}
    </div>
  );
}

function UserCreateModal({ trigger }: { trigger: ReactNode }) {
  return (
    <FormModal
      trigger={trigger}
      title="Crear usuario"
      description='Se creará con la contraseña por defecto "P@ssw0rd" y el flag de cambio obligatorio.'
    >
      {(close) => <UserCreateForm onSuccess={close} />}
    </FormModal>
  );
}

function UserCreateForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createUser(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onSuccess();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Usuario" name="username" isRequired />
      <Field
        label="Email"
        name="email"
        type="email"
        inputProps={{ autoComplete: 'email', placeholder: 'Opcional' }}
      />
      <NativeSelect
        label="Rol"
        name="role"
        defaultValue={Role.USER}
        options={[
          { value: Role.USER, label: 'Piloto' },
          { value: Role.ADMIN, label: 'Admin' },
        ]}
      />
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <Button type="submit" variant="primary" isDisabled={pending} fullWidth>
        {pending ? 'Guardando…' : 'Crear'}
      </Button>
    </form>
  );
}
