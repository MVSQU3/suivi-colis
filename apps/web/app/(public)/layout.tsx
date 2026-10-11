import type { ReactNode } from 'react';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'suivi-colis';

// En-tête public léger (accueil, connexion, /suivi). Liens <a> simples : pas de next/link ni de prefetch, moins de JS.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="bg-fonce text-white"><div className="mx-auto flex max-w-4xl items-center p-4">
        <a href="/" className="text-lg font-semibold">{appName}</a>
      </div></header>
      <main className="mx-auto max-w-4xl p-4">{children}</main>
      <footer className="mx-auto max-w-4xl px-4 pb-6 text-center text-xs text-gris-texte">
        <a href="/tableau-de-bord" className="inline-block py-3 underline underline-offset-2">Espace transitaire</a>
      </footer>
    </>
  );
}
