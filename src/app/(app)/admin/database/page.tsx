import { ArrowLeft, AlertTriangle, Database } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDatabaseUsage, getTableSizes } from '@/server/actions/admin';
import { DatabaseActions } from './database-actions';
import { UsageChart } from './usage-chart';

export const metadata = { title: 'Base de datos · Admin · DR2 Tracker' };

export default async function AdminDatabasePage() {
  const [result, tablesResult] = await Promise.all([
    getDatabaseUsage(),
    getTableSizes(),
  ]);
  if (!result.ok) {
    // requireAdmin throws AuthError → returned as { ok:false }; bounce out.
    redirect('/tiempos');
  }
  const { usedBytes, quotaBytes } = result.data!;
  const ratio = usedBytes / quotaBytes;
  const tables = tablesResult.ok ? tablesResult.data! : [];
  const tablesTotal = tables.reduce((acc, t) => acc + t.totalBytes, 0);

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

      <div className="border-surface-border bg-surface flex flex-col gap-4 rounded-xl border p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-foreground/60" />
          <h2 className="text-xl font-semibold">Tamaño por tabla</h2>
        </div>
        <p className="text-foreground/60 text-sm">
          Desglose del espacio ocupado en disco. <strong>Total</strong> incluye datos,
          índices y TOAST. Las filas son una estimación de PostgreSQL (
          <code className="bg-foreground/10 rounded px-1 text-xs">pg_class.reltuples</code>
          , se actualiza al ejecutar <em>ANALYZE</em>).
        </p>
        {tables.length === 0 ? (
          <p className="text-foreground/50 text-sm">Sin información disponible.</p>
        ) : (
          <div className="border-surface-border overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-foreground/5 text-foreground/70 text-left text-xs uppercase">
                <tr>
                  <th className="px-3 py-3 font-medium">Tabla</th>
                  <th className="px-3 py-3 text-right font-medium">Filas</th>
                  <th className="px-3 py-3 text-right font-medium">Datos</th>
                  <th className="px-3 py-3 text-right font-medium">Índices</th>
                  <th className="px-3 py-3 text-right font-medium">Total</th>
                  <th className="px-3 py-3 font-medium">% del total</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((t) => {
                  const pct = tablesTotal > 0 ? (t.totalBytes / tablesTotal) * 100 : 0;
                  return (
                    <tr key={t.name} className="border-surface-border border-t">
                      <td className="px-3 py-2.5 font-mono text-xs">{t.name}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        {t.rowEstimate.toLocaleString('es-ES')}
                      </td>
                      <td className="text-foreground/70 px-3 py-2.5 text-right font-mono tabular-nums">
                        {formatBytes(t.dataBytes)}
                      </td>
                      <td className="text-foreground/70 px-3 py-2.5 text-right font-mono tabular-nums">
                        {formatBytes(t.indexBytes)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">
                        {formatBytes(t.totalBytes)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="bg-foreground/10 h-1.5 w-24 overflow-hidden rounded-full">
                            <div
                              className="bg-primary h-full"
                              style={{ width: `${pct.toFixed(1)}%` }}
                            />
                          </div>
                          <span className="text-foreground/60 text-xs tabular-nums">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-surface-border bg-foreground/[0.03] border-t">
                  <td className="text-foreground/70 px-3 py-2.5 text-xs font-semibold uppercase">
                    Suma
                  </td>
                  <td />
                  <td />
                  <td />
                  <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">
                    {formatBytes(tablesTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
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
