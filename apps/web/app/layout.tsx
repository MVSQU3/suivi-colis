import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';
// Police : pile système (system-ui). Inter via next/font (fichier variable latin ~48 Ko)
// faisait dépasser le budget de 150 Ko transférés en 3G ; Inter reste utilisée si installée localement.
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'suivi-colis';
export const metadata = { title: appName, description: 'Suivi de colis Chine → Côte d’Ivoire' };
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0B2545' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr"><body className="font-sans antialiased">
      <header className="bg-fonce text-white"><div className="mx-auto flex max-w-4xl items-center p-4">
        <Link href="/" className="text-lg font-semibold">{appName}</Link>
      </div></header>
      <main className="mx-auto max-w-4xl p-4">{children}</main>
      <footer className="mx-auto max-w-4xl px-4 pb-6 text-center text-xs text-gris-texte">
        <Link href="/tableau-de-bord" className="inline-block py-3 underline underline-offset-2">Espace transitaire</Link>
      </footer>
    </body></html>
  );
}
