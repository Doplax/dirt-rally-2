'use client';

import { Modal } from '@heroui/react';
import { useOverlayTriggerState } from 'react-stately';
import type { ReactNode } from 'react';

export type FormModalProps = {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: (close: () => void) => ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

export function FormModal({ trigger, title, description, children, size = 'md' }: FormModalProps) {
  const state = useOverlayTriggerState({});

  return (
    <Modal state={state}>
      {trigger}
      <Modal.Backdrop>
        <Modal.Container size={size}>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
              {description ? (
                <p className="text-foreground/60 mt-1 text-sm">{description}</p>
              ) : null}
            </Modal.Header>
            <Modal.Body>{children(state.close)}</Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
