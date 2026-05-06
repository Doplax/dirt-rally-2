'use client';

import { Avatar, Button } from '@heroui/react';
import { Car, Clock, KeyRound, LogOut, Map, Menu, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { logout } from '@/server/actions/password';
import type { Role } from '@prisma/client';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/tiempos', label: 'Tiempos', icon: Clock },
  { href: '/mapas', label: 'Mapas', icon: Map },
  { href: '/coches', label: 'Coches', icon: Car },
  { href: '/usuarios', label: 'Usuarios', icon: Users, adminOnly: true },
];

type SidebarUser = {
  username: string;
  role: Role;
  photoUrl: string | null;
};

export function Sidebar({ user }: { user: SidebarUser }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="border-foreground/10 bg-background sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span>🏁</span> DiRT Tracker
        </Link>
        <Button
          variant="ghost"
          isIconOnly
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          onPress={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </header>

      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={[
          'border-foreground/10 bg-background fixed top-0 left-0 z-40 h-screen w-64 shrink-0 border-r p-4 transition-transform',
          'md:sticky md:top-0 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <SidebarContent user={user} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}

function SidebarContent({ user, onNavigate }: { user: SidebarUser; onNavigate: () => void }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === 'ADMIN');

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2 text-xl font-bold"
        onClick={onNavigate}
      >
        <span>🏁</span> DiRT Tracker
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={[
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-foreground/10 text-foreground font-medium'
                  : 'text-foreground/70 hover:bg-foreground/5',
              ].join(' ')}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-foreground/10 mt-4 border-t pt-4">
        <div className="mb-3 flex items-center gap-3">
          <Avatar>
            {user.photoUrl ? <Avatar.Image src={user.photoUrl} alt={user.username} /> : null}
            <Avatar.Fallback>{user.username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user.username}</div>
            <div className="text-foreground/60 text-xs">
              {user.role === 'ADMIN' ? 'Administrador' : 'Piloto'}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Link
            href="/perfil"
            onClick={onNavigate}
            className="text-foreground/70 hover:bg-foreground/5 flex items-center gap-2 rounded-md px-3 py-2 text-sm"
          >
            <KeyRound size={16} /> Mi perfil
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="text-foreground/70 hover:bg-foreground/5 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm"
            >
              <LogOut size={16} /> Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
