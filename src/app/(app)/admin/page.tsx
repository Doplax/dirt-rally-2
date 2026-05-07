import { ChevronRight, Database } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Admin · DR2 Tracker' };

type AdminAction = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const ACTIONS: AdminAction[] = [
  {
    href: '/admin/database',
    label: 'Base de datos',
    description: 'Espacio usado, exportar y restaurar',
    icon: Database,
  },
];

export default function AdminPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-foreground/60">Panel de administración. Solo visible para administradores.</p>
      </div>

      <ul className="flex flex-col gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <li key={action.href}>
              <Link
                href={action.href}
                className="border-surface-border bg-surface hover:border-foreground/25 flex items-center gap-4 rounded-xl border p-4 backdrop-blur-xl transition-colors"
              >
                <span className="bg-primary/15 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
                  <Icon size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{action.label}</span>
                  <span className="text-foreground/60 text-sm">{action.description}</span>
                </span>
                <ChevronRight size={18} className="text-foreground/40 shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
