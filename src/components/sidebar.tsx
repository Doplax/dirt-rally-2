'use client';

import { Avatar, Button } from '@heroui/react';
import {
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogOut,
  Map,
  Menu,
  Users,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logout } from '@/server/actions/password';
import type { Role } from '@prisma/client';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'dr2:sidebar:desktop-collapsed';

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
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1') {
        setDesktopCollapsed(true);
      }
    } catch {
      // localStorage no disponible (modo privado, etc.)
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_STORAGE_KEY,
        desktopCollapsed ? '1' : '0',
      );
    } catch {
      // ignorar
    }
  }, [desktopCollapsed]);

  return (
    <>
      <header className="border-foreground/10 bg-surface sticky top-0 z-30 grid grid-cols-3 items-center border-b px-4 py-3 backdrop-blur-xl md:hidden">
        <Link
          href="/"
          aria-label="DR2 Tracker"
          className="justify-self-start"
        >
          <Image
            src="/logo.png"
            alt="DR2 Tracker"
            width={50}
            height={28}
            priority
            className="h-7 w-auto"
          />
        </Link>
        <span className="justify-self-center text-lg font-bold">DR2 Tracker</span>
        <Button
          variant="ghost"
          isIconOnly
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          onPress={() => setOpen((v) => !v)}
          className="justify-self-end"
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
          'border-foreground/10 bg-surface fixed top-0 left-0 z-40 h-screen w-64 shrink-0 border-r backdrop-blur-xl transition-[width,transform] duration-200',
          'md:sticky md:top-0 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          desktopCollapsed ? 'md:w-16' : 'md:w-64',
        ].join(' ')}
      >
        <SidebarContent
          user={user}
          collapsed={desktopCollapsed}
          onNavigate={() => setOpen(false)}
          onToggleCollapsed={() => setDesktopCollapsed((v) => !v)}
        />
      </aside>
    </>
  );
}

function SidebarContent({
  user,
  collapsed,
  onNavigate,
  onToggleCollapsed,
}: {
  user: SidebarUser;
  collapsed: boolean;
  onNavigate: () => void;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === 'ADMIN');

  const labelHiddenWhenCollapsed = collapsed ? 'md:hidden' : '';
  const justifyWhenCollapsed = collapsed ? 'md:justify-center' : '';

  return (
    <div className={['flex h-full flex-col p-4', collapsed ? 'md:p-2' : ''].join(' ')}>
      <Link
        href="/"
        className={[
          'mb-6 flex items-center gap-2 text-xl font-bold',
          justifyWhenCollapsed,
        ].join(' ')}
        onClick={onNavigate}
        aria-label="DR2 Tracker"
      >
        <Image
          src="/logo.png"
          alt="DR2 Tracker"
          width={64}
          height={36}
          priority
          className="h-8 w-auto"
        />
        <span className={labelHiddenWhenCollapsed}>DR2 Tracker</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={[
                'flex items-center gap-3.5 rounded-md px-3 py-3 text-base transition-colors',
                justifyWhenCollapsed,
                active
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-foreground/70 hover:bg-foreground/5',
              ].join(' ')}
            >
              <Icon size={20} />
              <span className={labelHiddenWhenCollapsed}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-foreground/10 mt-4 border-t pt-4">
        <Link
          href="/perfil"
          onClick={onNavigate}
          title={collapsed ? `${user.username} — Mi perfil` : undefined}
          className={[
            'hover:bg-foreground/5 mb-3 flex items-center gap-3 rounded-md p-2 transition-colors',
            justifyWhenCollapsed,
          ].join(' ')}
        >
          <Avatar>
            {user.photoUrl ? <Avatar.Image src={user.photoUrl} alt={user.username} /> : null}
            <Avatar.Fallback>{user.username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          <div className={['min-w-0', labelHiddenWhenCollapsed].join(' ')}>
            <div className="truncate text-sm font-medium">{user.username}</div>
            <div className="text-foreground/60 text-xs">
              {user.role === 'ADMIN' ? 'Administrador' : 'Piloto'}
            </div>
          </div>
        </Link>
        <div className="flex flex-col gap-1">
          <form action={logout}>
            <button
              type="submit"
              title={collapsed ? 'Cerrar sesión' : undefined}
              className={[
                'text-foreground/70 hover:bg-foreground/5 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm',
                justifyWhenCollapsed,
              ].join(' ')}
            >
              <LogOut size={16} />
              <span className={labelHiddenWhenCollapsed}>Cerrar sesión</span>
            </button>
          </form>
        </div>

        <div className="border-foreground/10 mt-2 hidden border-t pt-2 md:block">
          <button
            type="button"
            aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            onClick={onToggleCollapsed}
            className="text-foreground/60 hover:bg-foreground/10 hover:text-foreground flex w-full items-center justify-center rounded-md py-2 transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
