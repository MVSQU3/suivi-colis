'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { Boxes } from 'lucide-react';
import { Package } from 'lucide-react';
import { Users } from 'lucide-react';
import { Menu } from 'lucide-react';
import { X } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { api, getToken, setToken } from '@/lib/api';
import { cn } from '@/lib/utils';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'suivi-colis';
interface Me { fullName: string; role: string; tenant: { name: string } }

const NAV = [
  { href: '/tableau-de-bord', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/tableau-de-bord#lots', label: 'Lots', icon: Boxes },
  { href: '/tableau-de-bord#colis', label: 'Colis', icon: Package },
  { href: '/tableau-de-bord#clients', label: 'Clients', icon: Users },
];

export default function BackOfficeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    if (!getToken()) { window.location.href = '/connexion'; return; }
    setPret(true);
    // api() redirige déjà vers /connexion sur 401.
    api<Me>('/auth/me').then(setMe).catch(() => undefined);
  }, []);
  useEffect(() => setOuvert(false), [pathname]);

  function deconnexion() { setToken(null); window.location.href = '/connexion'; }

  const nav = (
    <nav className="flex flex-col gap-1 p-3" aria-label="Navigation du back-office">
      {NAV.map(({ href, label, icon: Icon }) => {
        const actif = href === '/tableau-de-bord' ? pathname === href : false;
        return (
          <Link key={href} href={href} onClick={() => setOuvert(false)}
            className={cn('flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-white/90 hover:bg-white/10', actif && 'bg-white/15 text-white')}>
            <Icon className="h-5 w-5" aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-fond">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-fonce text-white lg:flex">
        <Link href="/tableau-de-bord" className="flex h-16 items-center px-6 text-lg font-semibold">{appName}</Link>
        {nav}
      </aside>

      {/* Menu mobile */}
      {ouvert && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-fonce/50" aria-label="Fermer le menu" onClick={() => setOuvert(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-fonce text-white shadow-xl">
            <div className="flex h-16 items-center justify-between px-4">
              <span className="text-lg font-semibold">{appName}</span>
              <button className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/10" aria-label="Fermer le menu" onClick={() => setOuvert(false)}><X className="h-5 w-5" aria-hidden /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gris/30 bg-white px-4 lg:px-8">
          <button className="flex h-11 w-11 items-center justify-center rounded-md text-fonce hover:bg-fond lg:hidden" aria-label="Ouvrir le menu" aria-expanded={ouvert} onClick={() => setOuvert(true)}>
            <Menu className="h-6 w-6" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fonce">{me?.tenant.name ?? '…'}</p>
            <p className="truncate text-xs text-gris-texte">{me ? `${me.fullName} · ${me.role === 'OWNER' ? 'Responsable' : 'Agent'}` : ' '}</p>
          </div>
          <button onClick={deconnexion} className="flex h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-alerte hover:bg-alerte/10">
            <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </header>
        <main className="mx-auto max-w-6xl p-4 lg:p-8">{pret ? children : null}</main>
      </div>
    </div>
  );
}
