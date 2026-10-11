import { SearchX } from 'lucide-react';

export default function SuiviIntrouvable() {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <SearchX className="mx-auto mb-3 h-10 w-10 text-gris-texte" aria-hidden />
      <h1 className="text-xl font-semibold">Code introuvable</h1>
      <p className="mt-2 text-gris-texte">Code introuvable. Vérifie-le auprès de ton transitaire.</p>
    </div>
  );
}
