'use client';

import { Modal } from '@heroui/react';
import { useOverlayTriggerState } from 'react-stately';
import type { ReactNode } from 'react';

export type FormModalProps = {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: (close: () => void) => ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'cover' | 'full';
};

export function FormModal({ trigger, title, description, children, size = 'md' }: FormModalProps) {
  const state = useOverlayTriggerState({});

  return (
    <Modal state={state}>
      {trigger}
      <Modal.Backdrop>
        <Modal.Container size={size}>
          {/* `cover` size from HeroUI applies `h-full min-h-full`, which
              stretches the dialog to the viewport even when the form is
              short. Override to natural height + cap so it stays centered. */}
          <Modal.Dialog
            className={
              size === 'cover' || size === 'full'
                ? '!h-auto !min-h-0 max-h-[90vh] overflow-y-auto'
                : undefined
            }
          >
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
