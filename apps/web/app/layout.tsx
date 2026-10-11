import './globals.css';
import type { ReactNode } from 'react';

// Layout racine minimal : l'en-tête public vit dans app/(public)/layout.tsx,
// le back-office a son propre layout dans app/tableau-de-bord/layout.tsx.
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'suivi-colis';
export const metadata = { title: appName, description: 'Suivi de colis Chine → Côte d’Ivoire' };
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0B2545' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr"><body className="font-sans antialiased">{children}</body></html>
  );
}
