import type { Metadata } from 'next';
import { AlertTriangle, Check, MessageCircle, Package, RotateCw, Truck } from 'lucide-react';
import { STATUT_META, formatDate, type StatutCheckpoint } from '@suivi-colis/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getSuivi, type SuiviCheckpoint } from './data';
import { ShareButton } from './share-button';
import SuiviIntrouvable from './not-found';

export const dynamic = 'force-dynamic';

const ETAPES = (Object.keys(STATUT_META) as StatutCheckpoint[])
  .filter((s) => STATUT_META[s].etape > 0)
  .sort((a, b) => STATUT_META[a].etape - STATUT_META[b].etape);

const libelle = (s: string) => STATUT_META[s as StatutCheckpoint]?.libelle ?? s;
const etapeDe = (s: string) => STATUT_META[s as StatutCheckpoint]?.etape ?? 0;

/** Couleurs du bandeau de statut, contraste AA. */
function heroClasses(statut: string) {
  const e = etapeDe(statut);
  if (statut === 'EXCEPTION') return 'bg-alerte text-white';
  if (e >= 6) return 'bg-succes-fonce text-white';
  if (e >= 4) return 'bg-primaire text-fonce';
  return 'bg-info text-fonce';
}

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const code = decodeURIComponent(params.code).toUpperCase();
  const r = await getSuivi(code);
  if (!r.ok) {
    // Aperçu neutre : ne révèle rien sur l'existence du code.
    const title = 'Suivi de colis';
    const description = 'Suis ton colis de la Chine jusqu’à Abidjan.';
    return { title, description, robots: { index: false }, openGraph: { title, description, type: 'website' } };
  }
  const title = `Suivi ${code} : ${libelle(r.data.statutActuel)}`;
  const description = `Ton colis confié à ${r.data.transitaire.nom} : ${libelle(r.data.statutActuel)}. Suis chaque étape de la Chine jusqu’à Abidjan.`;
  return { title, description, robots: { index: false }, openGraph: { title, description, type: 'website', locale: 'fr_CI' } };
}

type Ligne =
  | { type: 'etape'; statut: StatutCheckpoint; passe: boolean; cp?: SuiviCheckpoint }
  | { type: 'exception'; cp: SuiviCheckpoint };

function construireTimeline(checkpoints: SuiviCheckpoint[]): Ligne[] {
  const tries = [...checkpoints].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const premierParEtape = new Map<number, SuiviCheckpoint>();
  const exceptionsApres = new Map<number, SuiviCheckpoint[]>();
  let atteinte = 0;
  for (const cp of tries) {
    const e = etapeDe(cp.statut);
    if (cp.statut === 'EXCEPTION') {
      exceptionsApres.set(atteinte, [...(exceptionsApres.get(atteinte) ?? []), cp]);
    } else if (e > 0) {
      if (!premierParEtape.has(e)) premierParEtape.set(e, cp);
      atteinte = Math.max(atteinte, e);
    }
  }
  const lignes: Ligne[] = (exceptionsApres.get(0) ?? []).map((cp) => ({ type: 'exception', cp }));
  for (const s of ETAPES) {
    const e = STATUT_META[s].etape;
    lignes.push({ type: 'etape', statut: s, passe: e <= atteinte, cp: premierParEtape.get(e) });
    for (const cp of exceptionsApres.get(e) ?? []) lignes.push({ type: 'exception', cp });
  }
  return lignes;
}

function Message({ titre, texte, reessayer }: { titre: string; texte: string; reessayer?: string }) {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-alerte" aria-hidden />
      <h1 className="text-xl font-bold">{titre}</h1>
      <p className="mt-2 text-gris-texte">{texte}</p>
      {reessayer && (
        <Button asChild size="lg" className="mt-6">
          <a href={reessayer}><RotateCw aria-hidden /> Réessayer</a>
        </Button>
      )}
    </div>
  );
}

export default async function SuiviPage({ params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code).toUpperCase();
  const r = await getSuivi(code);
  if (!r.ok) {
    // Rendu inline (et non notFound()) : Next 14.2 sert sinon un shell d'erreur rendu côté client, illisible sans JS.
    if (r.kind === 'introuvable') return <SuiviIntrouvable />;
    if (r.kind === 'trop') return <Message titre="Patiente un peu" texte="Trop de tentatives, réessaie dans quelques minutes." />;
    return <Message titre="Oups, petit souci" texte="Impossible d’afficher ton suivi pour le moment. Vérifie ta connexion et réessaie." reessayer={`/suivi/${encodeURIComponent(code)}`} />;
  }
  const { transitaire, statutActuel, checkpoints } = r.data;
  const dernier = [...checkpoints].sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];
  const lignes = construireTimeline(checkpoints);
  const tel = transitaire.telephone?.replace(/[^\d]/g, '');
  const titre = `Suivi ${code} : ${libelle(statutActuel)}`;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <section className={cn('rounded-xl p-5 shadow-sm', heroClasses(statutActuel))} aria-live="polite">
        <p className="text-sm font-medium opacity-90">Ton colis</p>
        <h1 className="mt-1 flex items-start gap-2 text-2xl font-bold leading-tight">
          {statutActuel === 'EXCEPTION' ? <AlertTriangle className="mt-1 h-6 w-6 shrink-0" aria-hidden /> : <Package className="mt-1 h-6 w-6 shrink-0" aria-hidden />}
          {libelle(statutActuel)}
        </h1>
        {dernier && <p className="mt-2 text-sm">Mis à jour le {formatDate(dernier.date)}{dernier.lieu ? ` · ${dernier.lieu}` : ''}</p>}
        <p className="mt-3 text-sm">Code de suivi : <span className="font-mono font-bold tracking-wider">{code}</span></p>
      </section>

      <Card className="border-0">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Truck className="h-5 w-5" aria-hidden /> Les étapes de ton colis</CardTitle></CardHeader>
        <CardContent>
          <ol className="relative">
            {lignes.map((l, i) => {
              const fin = i === lignes.length - 1;
              if (l.type === 'exception') {
                return (
                  <li key={`x${i}`} className="relative flex gap-3 pb-4">
                    {!fin && <span className="absolute left-[11px] top-6 h-full w-0.5 bg-alerte/40" aria-hidden />}
                    <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-alerte text-white"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /></span>
                    <div className="min-w-0 rounded-md border border-alerte/40 bg-alerte/5 px-3 py-2">
                      <p className="font-semibold text-alerte">Incident</p>
                      <p className="text-sm text-gris-texte">{formatDate(l.cp.date)}{l.cp.lieu ? ` · ${l.cp.lieu}` : ''}</p>
                      {l.cp.commentaire && <p className="mt-1 text-sm">{l.cp.commentaire}</p>}
                    </div>
                  </li>
                );
              }
              return (
                <li key={l.statut} className="relative flex gap-3 pb-4">
                  {!fin && <span className={cn('absolute left-[11px] top-6 h-full w-0.5', l.passe ? 'bg-succes-fonce' : 'bg-gris/40')} aria-hidden />}
                  <span className={cn('z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', l.passe ? 'border-succes-fonce bg-succes-fonce text-white' : 'border-gris bg-white')}>
                    {l.passe && <Check className="h-3.5 w-3.5" aria-hidden />}
                  </span>
                  <div className="min-w-0">
                    <p className={cn('font-semibold', !l.passe && 'text-gris-texte font-normal')}>{STATUT_META[l.statut].libelle}</p>
                    {l.passe && l.cp && <p className="text-sm text-gris-texte">{formatDate(l.cp.date)}{l.cp.lieu ? ` · ${l.cp.lieu}` : ''}</p>}
                    {l.passe && !l.cp && <p className="text-sm text-gris-texte">Étape franchie</p>}
                    {!l.passe && <p className="text-sm text-gris-texte">À venir</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card className="border-0">
        <CardHeader className="pb-2">
          <p className="text-sm text-gris-texte">Ton transitaire</p>
          <CardTitle className="text-base">{transitaire.nom}</CardTitle>
        </CardHeader>
        {tel && (
          <CardContent>
            <Button asChild variant="success" size="lg" className="w-full">
              <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden /> Contacter sur WhatsApp</a>
            </Button>
          </CardContent>
        )}
      </Card>

      <ShareButton title={titre} />
    </div>
  );
}
