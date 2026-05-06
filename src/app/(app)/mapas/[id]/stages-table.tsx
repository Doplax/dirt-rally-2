'use client';

import { Button } from '@heroui/react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { Direction } from '@prisma/client';
import { Field } from '@/components/ui/field';
import { FormModal } from '@/components/ui/form-modal';
import { NativeSelect } from '@/components/ui/native-select';
import {
  createStage,
  deleteStage,
  updateStage,
} from '@/server/actions/locations';

type Stage = {
  id: string;
  name: string;
  distanceKm: number;
  direction: Direction;
};

export function StagesTable({
  locationId,
  stages,
  isAdmin,
}: {
  locationId: string;
  stages: Stage[];
  isAdmin: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tramos</h2>
        {isAdmin ? (
          <StageFormModal
            locationId={locationId}
            trigger={
              <Button variant="primary">
                <Plus size={14} /> Añadir tramo
              </Button>
            }
          />
        ) : null}
      </div>

      <div className="border-foreground/10 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-foreground/5 text-foreground/70 text-left text-xs uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Distancia</th>
              <th className="px-4 py-3 font-medium">Dirección</th>
              {isAdmin ? <th className="px-4 py-3 text-right font-medium">Acciones</th> : null}
            </tr>
          </thead>
          <tbody>
            {stages.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="text-foreground/60 p-6 text-center">
                  No hay tramos todavía.
                </td>
              </tr>
            ) : (
              stages.map((stage) => (
                <tr
                  key={stage.id}
                  className="border-foreground/10 border-t"
                >
                  <td className="px-4 py-2.5 font-medium">{stage.name}</td>
                  <td className="px-4 py-2.5">{stage.distanceKm.toFixed(2)} km</td>
                  <td className="px-4 py-2.5">
                    <span className="text-foreground/70 inline-flex items-center gap-1">
                      {stage.direction === Direction.FORWARD ? (
                        <>
                          <ArrowUp size={14} /> Forward
                        </>
                      ) : (
                        <>
                          <ArrowDown size={14} /> Reverse
                        </>
                      )}
                    </span>
                  </td>
                  {isAdmin ? (
                    <td className="px-4 py-2.5 text-right">
                      <StageRowActions locationId={locationId} stage={stage} />
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StageRowActions({ locationId, stage }: { locationId: string; stage: Stage }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onDelete = () => {
    if (!confirm(`¿Borrar el tramo "${stage.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteStage(stage.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <StageFormModal
        locationId={locationId}
        initial={stage}
        trigger={
          <Button variant="ghost" isIconOnly aria-label="Editar tramo">
            <Pencil size={14} />
          </Button>
        }
      />
      <Button
        variant="ghost"
        isIconOnly
        aria-label="Borrar tramo"
        onPress={onDelete}
        isDisabled={pending}
      >
        <Trash2 size={14} />
      </Button>
      {error ? <span className="text-danger text-xs">{error}</span> : null}
    </div>
  );
}

function StageFormModal({
  locationId,
  initial,
  trigger,
}: {
  locationId: string;
  initial?: Stage;
  trigger: ReactNode;
}) {
  return (
    <FormModal
      trigger={trigger}
      title={initial ? 'Editar tramo' : 'Añadir tramo'}
      description="Nombre, distancia y dirección del tramo."
    >
      {(close) => <StageForm locationId={locationId} initial={initial} onSuccess={close} />}
    </FormModal>
  );
}

function StageForm({
  locationId,
  initial,
  onSuccess,
}: {
  locationId: string;
  initial?: Stage;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set('locationId', locationId);
    startTransition(async () => {
      const result = initial
        ? await updateStage(initial.id, formData)
        : await createStage(formData);
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
      <Field label="Nombre" name="name" defaultValue={initial?.name ?? ''} isRequired />
      <Field
        label="Distancia (km)"
        name="distanceKm"
        type="number"
        inputProps={{ step: '0.01', min: '0' }}
        defaultValue={initial?.distanceKm.toString() ?? ''}
        isRequired
      />
      <NativeSelect
        label="Dirección"
        name="direction"
        defaultValue={initial?.direction ?? Direction.FORWARD}
        options={[
          { value: Direction.FORWARD, label: 'Forward' },
          { value: Direction.REVERSE, label: 'Reverse' },
        ]}
      />
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <Button type="submit" variant="primary" isDisabled={pending} fullWidth>
        {pending ? 'Guardando…' : initial ? 'Guardar cambios' : 'Añadir'}
      </Button>
    </form>
  );
}
