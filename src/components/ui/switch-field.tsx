'use client';

import { Switch } from '@heroui/react';

type Props = {
  label: string;
  description?: string;
  isSelected: boolean;
  onChange: (selected: boolean) => void;
  className?: string;
};

/**
 * Thin wrapper around HeroUI's Switch with a label (and optional description).
 * Used in place of plain checkboxes so toggle UI stays consistent across the app.
 */
export function SwitchField({
  label,
  description,
  isSelected,
  onChange,
  className,
}: Props) {
  return (
    <Switch
      isSelected={isSelected}
      onChange={onChange}
      className={[
        'group hover:bg-foreground/[0.04] border-foreground/10 hover:border-foreground/20 inline-flex items-center gap-3 rounded-lg border bg-transparent px-3 py-2 transition-colors',
        className ?? '',
      ].join(' ')}
    >
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      <Switch.Content className="flex min-w-0 flex-col text-left">
        <span className="text-sm font-medium leading-tight">{label}</span>
        {description ? (
          <span className="text-foreground/50 text-xs leading-tight">{description}</span>
        ) : null}
      </Switch.Content>
    </Switch>
  );
}
