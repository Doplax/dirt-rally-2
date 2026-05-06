'use client';

import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Upload } from 'lucide-react';
import { useState, useTransition } from 'react';
import { LocationFormModal } from '../location-form-modal';
import { deleteLocation, uploadLocationPhoto } from '@/server/actions/locations';

type Props = {
  location: {
    id: string;
    name: string;
    country: string;
    surface: string;
    isDlc: boolean;
    dlcPack: string | null;
  };
};

export function LocationAdminPanel({ location }: Props) {
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
      const result = await uploadLocationPhoto(location.id, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
    event.target.value = '';
  };

  const onDelete = () => {
    if (!confirm(`¿Eliminar "${location.name}" y todos sus tramos?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteLocation(location.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace('/mapas');
      router.refresh();
    });
  };

  return (
    <div className="border-foreground/10 mt-2 flex flex-col gap-2 border-t pt-3">
      <div className="text-foreground/60 text-xs font-medium uppercase tracking-wide">
        Acciones de admin
      </div>
      <div className="flex flex-wrap gap-2">
        <LocationFormModal
          initial={location}
          trigger={
            <Button variant="outline">
              <Pencil size={14} /> Editar
            </Button>
          }
        />
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
            onChange={onUpload}
            disabled={pending}
          />
          <Upload size={14} /> Subir foto
        </label>
        <Button variant="danger-soft" onPress={onDelete} isDisabled={pending}>
          <Trash2 size={14} /> Borrar
        </Button>
      </div>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
    </div>
  );
}
