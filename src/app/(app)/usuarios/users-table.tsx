'use client';

import { Avatar, Button } from '@heroui/react';
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { Role } from '@prisma/client';
import { Field } from '@/components/ui/field';
import { FormModal } from '@/components/ui/form-modal';
import { NativeSelect } from '@/components/ui/native-select';
import {
  createUser,
  deleteUser,
  resetUserPassword,
  updateUser,
} from '@/server/actions/users';

export type UserRow = {
  id: string;
  username: string;
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
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <UserFormModal
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
              <th className="px-3 py-3 font-medium">Rol</th>
              <th className="px-3 py-3 font-medium">Tiempos (corredor)</th>
              <th className="px-3 py-3 font-medium">Tiempos (registró)</th>
              <th className="px-3 py-3 font-medium">Alta</th>
              <th className="px-3 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-foreground/10 border-t">
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
                <td className="px-3 py-2.5">{user.timesAsRunner}</td>
                <td className="px-3 py-2.5">{user.timesAsRegistrar}</td>
                <td className="px-3 py-2.5 text-foreground/70 whitespace-nowrap text-xs">
                  {new Date(user.createdAt).toLocaleDateString('es-ES')}
                </td>
                <td className="px-3 py-2.5">
                  <RowActions user={user} isSelf={user.id === currentUserId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <UserFormModal
        initial={user}
        trigger={
          <Button variant="ghost" size="sm" isIconOnly aria-label="Editar usuario">
            <Pencil size={14} />
          </Button>
        }
      />
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

function UserFormModal({
  trigger,
  initial,
}: {
  trigger: ReactNode;
  initial?: { id: string; username: string; role: Role };
}) {
  return (
    <FormModal
      trigger={trigger}
      title={initial ? 'Editar usuario' : 'Crear usuario'}
      description={
        initial
          ? 'Cambia username o rol. La contraseña se gestiona desde "Resetear".'
          : 'Se creará con la contraseña por defecto "P@ssw0rd" y el flag de cambio obligatorio.'
      }
    >
      {(close) => <UserForm initial={initial} onSuccess={close} />}
    </FormModal>
  );
}

function UserForm({
  initial,
  onSuccess,
}: {
  initial?: { id: string; username: string; role: Role };
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = initial
        ? await updateUser(initial.id, formData)
        : await createUser(formData);
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
      <Field
        label="Usuario"
        name="username"
        defaultValue={initial?.username ?? ''}
        isRequired
      />
      <NativeSelect
        label="Rol"
        name="role"
        defaultValue={initial?.role ?? Role.USER}
        options={[
          { value: Role.USER, label: 'Piloto' },
          { value: Role.ADMIN, label: 'Admin' },
        ]}
      />
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <Button type="submit" variant="primary" isDisabled={pending} fullWidth>
        {pending ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear'}
      </Button>
    </form>
  );
}
