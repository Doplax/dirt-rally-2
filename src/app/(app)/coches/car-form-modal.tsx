'use client';

import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { Field } from '@/components/ui/field';
import { FormModal } from '@/components/ui/form-modal';
import { NativeSelect } from '@/components/ui/native-select';
import { createCar, updateCar } from '@/server/actions/cars';

export type CarFormValues = {
  id?: string;
  name?: string;
  className?: string;
  classCode?: string;
  drivetrain?: string | null;
  year?: number | null;
  isDlc?: boolean;
  dlcPack?: string | null;
  isRallycross?: boolean;
};

export function CarFormModal({
  trigger,
  initial,
}: {
  trigger: ReactNode;
  initial?: CarFormValues;
}) {
  return (
    <FormModal
      trigger={trigger}
      title={initial?.id ? 'Editar coche' : 'Crear coche'}
      description="Coche con su clase, código de clase y datos opcionales."
      size="lg"
    >
      {(close) => <CarForm initial={initial} onSuccess={close} />}
    </FormModal>
  );
}

function CarForm({ initial, onSuccess }: { initial?: CarFormValues; onSuccess: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isDlc, setIsDlc] = useState(initial?.isDlc ?? false);
  const [isRallycross, setIsRallycross] = useState(initial?.isRallycross ?? false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set('isDlc', isDlc ? 'true' : 'false');
    formData.set('isRallycross', isRallycross ? 'true' : 'false');

    startTransition(async () => {
      const result = initial?.id
        ? await updateCar(initial.id, formData)
        : await createCar(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onSuccess();
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Nombre"
        name="name"
        defaultValue={initial?.name ?? ''}
        isRequired
      />
      <Field
        label="Año"
        name="year"
        type="number"
        defaultValue={initial?.year?.toString() ?? ''}
        inputProps={{ min: '1950', max: '2100', placeholder: 'Opcional' }}
      />
      <Field
        label="Nombre de clase"
        name="className"
        defaultValue={initial?.className ?? ''}
        isRequired
        inputProps={{ placeholder: 'Modern Rally R5' }}
      />
      <Field
        label="Código de clase"
        name="classCode"
        defaultValue={initial?.classCode ?? ''}
        isRequired
        inputProps={{ placeholder: 'R5, GROUP_B_4WD…' }}
      />
      <NativeSelect
        label="Tracción"
        name="drivetrain"
        defaultValue={initial?.drivetrain ?? ''}
        placeholder="Sin especificar"
        options={[
          { value: 'FWD', label: 'FWD' },
          { value: 'RWD', label: 'RWD' },
          { value: '4WD', label: '4WD' },
        ]}
      />
      <div className="flex flex-col gap-3 self-end">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isRallycross}
            onChange={(e) => setIsRallycross(e.target.checked)}
          />
          Coche de Rallycross
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDlc} onChange={(e) => setIsDlc(e.target.checked)} />
          Es DLC
        </label>
      </div>
      {isDlc ? (
        <Field
          label="Pack DLC"
          name="dlcPack"
          defaultValue={initial?.dlcPack ?? ''}
          inputProps={{ placeholder: 'Season 1, Colin McRae…' }}
        />
      ) : null}
      {error ? <p className="text-danger col-span-full text-sm">{error}</p> : null}
      <Button
        type="submit"
        variant="primary"
        isDisabled={pending}
        className="col-span-full"
        fullWidth
      >
        {pending ? 'Guardando…' : initial?.id ? 'Guardar cambios' : 'Crear coche'}
      </Button>
    </form>
  );
}
