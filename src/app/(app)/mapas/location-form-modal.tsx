'use client';

import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { Field } from '@/components/ui/field';
import { FormModal } from '@/components/ui/form-modal';
import { createLocation, updateLocation } from '@/server/actions/locations';

export type LocationFormValues = {
  id?: string;
  name?: string;
  country?: string;
  surface?: string;
  isDlc?: boolean;
  dlcPack?: string | null;
};

export function LocationFormModal({
  trigger,
  initial,
}: {
  trigger: ReactNode;
  initial?: LocationFormValues;
}) {
  return (
    <FormModal
      trigger={trigger}
      title={initial?.id ? 'Editar localidad' : 'Crear localidad'}
      description={
        initial?.id
          ? 'Actualiza los datos de la localidad.'
          : 'Define un país, superficie y tipo (base o DLC).'
      }
    >
      {(close) => <LocationForm initial={initial} onSuccess={close} />}
    </FormModal>
  );
}

function LocationForm({
  initial,
  onSuccess,
}: {
  initial?: LocationFormValues;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isDlc, setIsDlc] = useState(initial?.isDlc ?? false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set('isDlc', isDlc ? 'true' : 'false');

    startTransition(async () => {
      const result = initial?.id
        ? await updateLocation(initial.id, formData)
        : await createLocation(formData);
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
        label="Nombre"
        name="name"
        defaultValue={initial?.name ?? ''}
        isRequired
      />
      <Field
        label="País"
        name="country"
        defaultValue={initial?.country ?? ''}
        isRequired
      />
      <Field
        label="Superficie"
        name="surface"
        defaultValue={initial?.surface ?? ''}
        isRequired
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isDlc}
          onChange={(e) => setIsDlc(e.target.checked)}
        />
        Es DLC
      </label>
      {isDlc ? (
        <Field
          label="Pack DLC"
          name="dlcPack"
          defaultValue={initial?.dlcPack ?? ''}
          inputProps={{ placeholder: 'Season 1, Colin McRae...' }}
        />
      ) : null}
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <div className="mt-2 flex gap-2">
        <Button type="submit" variant="primary" isDisabled={pending} fullWidth>
          {pending ? 'Guardando…' : initial?.id ? 'Guardar cambios' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}
