'use client';

import { Button, Modal } from '@heroui/react';
import { AlertTriangle, KeyRound, Pencil, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { useOverlayTriggerState } from 'react-stately';
import { Role } from '@prisma/client';
import { Field } from '@/components/ui/field';
import { FormModal } from '@/components/ui/form-modal';
import { NativeSelect } from '@/components/ui/native-select';
import {
  deleteUser,
  resetUserPassword,
  updateUser,
  uploadUserPhoto,
} from '@/server/actions/users';

type Props = {
  user: {
    id: string;
    username: string;
    email: string | null;
    role: Role;
  };
  isSelf: boolean;
};

export function UserAdminPanel({ user, isSelf }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set('file', file);
    setError(null);
    startTransition(async () => {
      const result = await uploadUserPhoto(user.id, formData);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
    event.target.value = '';
  };

  const onResetPassword = () => {
    if (!confirm(`¿Resetear la contraseña de ${user.username} a "P@ssw0rd"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await resetUserPassword(user.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="border-foreground/10 mt-1 flex flex-wrap items-center gap-2 border-t pt-3">
      <UserEditModal
        user={user}
        trigger={
          <Button variant="secondary" size="sm">
            <Pencil size={14} /> Editar
          </Button>
        }
      />
      <label
        className={[
          'border-foreground/15 hover:bg-foreground/5 inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm',
          pending ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
        aria-label="Subir foto"
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={onUpload}
          disabled={pending}
        />
        <Upload size={14} /> Subir foto
      </label>
      <Button
        variant="secondary"
        size="sm"
        onPress={onResetPassword}
        isDisabled={pending}
      >
        <KeyRound size={14} /> Resetear contraseña
      </Button>
      {!isSelf ? <DeleteUserButton userId={user.id} username={user.username} /> : null}
      {error ? <span className="text-danger text-xs">{error}</span> : null}
    </div>
  );
}

function UserEditModal({
  trigger,
  user,
}: {
  trigger: ReactNode;
  user: { id: string; username: string; email: string | null; role: Role };
}) {
  return (
    <FormModal
      trigger={trigger}
      title="Editar usuario"
      description="Cambia username, email o rol. La contraseña se gestiona desde Resetear."
    >
      {(close) => <UserEditForm user={user} onSuccess={close} />}
    </FormModal>
  );
}

function UserEditForm({
  user,
  onSuccess,
}: {
  user: { id: string; username: string; email: string | null; role: Role };
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
      const result = await updateUser(user.id, formData);
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
      <Field label="Usuario" name="username" defaultValue={user.username} isRequired />
      <Field
        label="Email"
        name="email"
        type="email"
        defaultValue={user.email ?? ''}
        inputProps={{ autoComplete: 'email', placeholder: 'Opcional' }}
      />
      <NativeSelect
        label="Rol"
        name="role"
        defaultValue={user.role}
        options={[
          { value: Role.USER, label: 'Piloto' },
          { value: Role.ADMIN, label: 'Admin' },
        ]}
      />
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <Button type="submit" variant="primary" isDisabled={pending} fullWidth>
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  );
}

function DeleteUserButton({ userId, username }: { userId: string; username: string }) {
  const router = useRouter();
  const state = useOverlayTriggerState({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const matches = confirmText === username;

  const onConfirm = () => {
    if (!matches) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteUser(userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      state.close();
      router.push('/usuarios');
      router.refresh();
    });
  };

  return (
    <Modal state={state}>
      <Button variant="danger" size="sm" onPress={() => state.open()}>
        <Trash2 size={14} /> Borrar
      </Button>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-danger" />
                Borrar usuario
              </Modal.Heading>
              <p className="text-foreground/70 mt-2 text-sm">
                Esta acción es permanente. Solo se puede borrar si el usuario no tiene
                tiempos asociados.
              </p>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-3 text-sm">
                <p className="text-foreground/80">
                  Para confirmar, escribe el nombre exacto:
                </p>
                <p className="bg-foreground/5 rounded-md px-3 py-2 font-mono text-sm">
                  {username}
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoFocus
                  className="border-foreground/15 bg-background focus:border-danger focus:ring-danger/40 rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  placeholder="Escribe el nombre del usuario"
                />
                {error ? <p className="text-danger text-xs">{error}</p> : null}
                <div className="mt-2 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onPress={() => {
                      setConfirmText('');
                      state.close();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    onPress={onConfirm}
                    isDisabled={!matches || pending}
                  >
                    {pending ? 'Borrando…' : 'Borrar definitivamente'}
                  </Button>
                </div>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
