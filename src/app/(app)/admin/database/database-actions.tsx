'use client';

import { Button } from '@heroui/react';
import { Download, Upload } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { exportDatabase, restoreDatabase } from '@/server/actions/admin';

export function DatabaseActions() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, startExport] = useTransition();
  const [restoring, startRestore] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onExport = () => {
    setError(null);
    setSuccess(null);
    startExport(async () => {
      const result = await exportDatabase();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `dr2-tracker-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccess('Backup descargado.');
    });
  };

  const onPickFile = () => {
    setError(null);
    setSuccess(null);
    fileInputRef.current?.click();
  };

  const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const confirmed = window.confirm(
      `¿Restaurar la base de datos desde "${file.name}"?\n\n` +
        'Esto BORRARÁ todos los datos actuales y los reemplazará por el contenido del archivo. ' +
        'No se puede deshacer.',
    );
    if (!confirmed) return;

    let parsed: unknown;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch {
      setError('El archivo no es JSON válido.');
      return;
    }

    startRestore(async () => {
      const result = await restoreDatabase(parsed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const counts = result.data!;
      setSuccess(
        `Restaurado: ${counts.users} usuarios, ${counts.locations} localidades, ` +
          `${counts.stages} tramos, ${counts.cars} coches, ${counts.favoriteCars} favoritos, ` +
          `${counts.timeRecords} tiempos.`,
      );
    });
  };

  const busy = exporting || restoring;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="primary"
          onPress={onExport}
          isDisabled={busy}
        >
          <Download size={16} />
          {exporting ? 'Exportando…' : 'Exportar JSON'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onPress={onPickFile}
          isDisabled={busy}
        >
          <Upload size={16} />
          {restoring ? 'Restaurando…' : 'Restaurar desde JSON'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFileSelected}
        />
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
    </div>
  );
}
