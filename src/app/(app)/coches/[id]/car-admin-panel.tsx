'use client';

import { Button, Modal } from '@heroui/react';
import { Pencil, Trash2, Upload, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { useOverlayTriggerState } from 'react-stately';
import { CarFormModal } from '../car-form-modal';
import { deleteCar, uploadCarPhoto } from '@/server/actions/cars';

const ACTION_BTN_LAYOUT = 'w-full justify-center sm:w-auto';
const ACTION_BTN_CLASS =
  `${ACTION_BTN_LAYOUT} bg-foreground/[0.08] hover:bg-foreground/[0.16] border-foreground/30 hover:border-foreground/55 text-foreground`;

type CarAdminPanelProps = {
  car: {
    id: string;
    name: string;
    className: string;
    classCode: string;
    drivetrain: string | null;
    year: number | null;
    isDlc: boolean;
    dlcPack: string | null;
    isRallycross: boolean;
  };
};

export function CarAdminPanel({ car }: CarAdminPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set('file', file);
    setError(null);
    startTransition(async () => {
      const result = await uploadCarPhoto(car.id, formData);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
    event.target.value = '';
  };

  return (
    <div className="border-foreground/10 mt-1 grid grid-cols-2 gap-2 border-t pt-3 sm:flex sm:flex-wrap">
      <CarFormModal
        initial={car}
        trigger={
          <Button variant="outline" size="sm" className={ACTION_BTN_CLASS}>
            <Pencil size={14} /> Editar
          </Button>
        }
      />
      <Button
        variant="outline"
        size="sm"
        onPress={() => fileInputRef.current?.click()}
        isDisabled={pending}
        className={ACTION_BTN_CLASS}
      >
        <Upload size={14} /> Subir foto
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={onUpload}
        disabled={pending}
      />
      <DeleteCarButton carId={car.id} carName={car.name} />
      {error ? (
        <span className="text-danger col-span-2 text-xs sm:col-span-1">{error}</span>
      ) : null}
    </div>
  );
}

function DeleteCarButton({ carId, carName }: { carId: string; carName: string }) {
  const router = useRouter();
  const state = useOverlayTriggerState({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const expectedText = carName;
  const matches = confirmText === expectedText;

  const onConfirm = () => {
    if (!matches) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCar(carId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      state.close();
      router.push('/coches');
      router.refresh();
    });
  };

  return (
    <Modal state={state}>
      <Button
        variant="danger"
        size="sm"
        onPress={() => state.open()}
        className={ACTION_BTN_LAYOUT}
      >
        <Trash2 size={14} /> Borrar
      </Button>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-danger" />
                Borrar coche
              </Modal.Heading>
              <p className="text-foreground/70 mt-2 text-sm">
                Esto eliminará el coche y <strong>todos los tiempos asociados</strong>. La
                acción no se puede deshacer.
              </p>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-3 text-sm">
                <p className="text-foreground/80">
                  Para confirmar, escribe el nombre exacto del coche:
                </p>
                <p className="bg-foreground/5 rounded-md px-3 py-2 font-mono text-sm">
                  {expectedText}
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoFocus
                  className="border-foreground/15 bg-background focus:border-danger focus:ring-danger/40 rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  placeholder="Escribe el nombre del coche"
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
