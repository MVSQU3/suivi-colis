import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'suivi-colis';
export const metadata = { title: appName, description: 'Suivi de colis Chine → Côte d’Ivoire' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr"><body>
      <header className="bg-fonce text-white"><div className="mx-auto flex max-w-4xl items-center justify-between p-4">
        <Link href="/" className="text-lg font-bold">{appName}</Link>
        <Link href="/tableau-de-bord" className="text-sm">Espace transitaire</Link>
      </div></header>
      <main className="mx-auto max-w-4xl p-4">{children}</main>
    </body></html>
  );
}
