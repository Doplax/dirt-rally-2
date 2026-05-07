import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDatabaseUsage } from '@/server/actions/admin';
import { DatabaseActions } from './database-actions';
import { UsageChart } from './usage-chart';

export const metadata = { title: 'Base de datos · Admin · DR2 Tracker' };

export default async function AdminDatabasePage() {
  const result = await getDatabaseUsage();
  if (!result.ok) {
    // requireAdmin throws AuthError → returned as { ok:false }; bounce out.
    redirect('/tiempos');
  }
  const { usedBytes, quotaBytes } = result.data!;
  const ratio = usedBytes / quotaBytes;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin"
          className="text-foreground/60 hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft size={14} /> Volver al panel
        </Link>
        <h1 className="text-3xl font-bold">Base de datos</h1>
        <p className="text-foreground/60">
          Espacio en Neon, exportar e importar la base de datos completa.
        </p>
      </div>

      <div className="border-surface-border bg-surface flex flex-col gap-6 rounded-xl border p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <UsageChart usedBytes={usedBytes} quotaBytes={quotaBytes} />
        <div className="flex flex-1 flex-col gap-3">
          <h2 className="text-xl font-semibold">Espacio usado</h2>
          <p className="text-foreground/70 text-sm">
            La base de datos ocupa actualmente <strong>{formatBytes(usedBytes)}</strong> de{' '}
            <strong>{formatBytes(quotaBytes)}</strong> disponibles en el plan{' '}
            <em>Neon Free</em>.
          </p>
          {ratio > 0.85 ? (
            <p className="text-danger flex items-center gap-2 text-sm">
              <AlertTriangle size={16} /> Estás cerca del límite. Considera limpiar datos
              antiguos o cambiar de plan.
            </p>
          ) : ratio > 0.6 ? (
            <p className="flex items-center gap-2 text-sm text-amber-400">
              <AlertTriangle size={16} /> Más del 60% ocupado.
            </p>
          ) : null}
          <p className="text-foreground/50 text-xs">
            Para ajustar el límite (p. ej. al cambiar de plan), define{' '}
            <code className="bg-foreground/10 rounded px-1">NEON_QUOTA_BYTES</code> en
            las variables de entorno.
          </p>
        </div>
      </div>

      <div className="border-surface-border bg-surface flex flex-col gap-4 rounded-xl border p-6 backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-semibold">Backup</h2>
          <p className="text-foreground/60 text-sm">
            Exporta toda la base de datos a un archivo JSON, o restáurala subiendo uno
            previamente exportado. La restauración <strong>borra y reemplaza</strong>{' '}
            todos los datos actuales.
          </p>
        </div>
        <DatabaseActions />
      </div>
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
