/**
 * Prepare l'environnement des tests e2e AVANT tout import de l'app :
 *  - charge apps/api/.env (sans ecraser les variables deja definies)
 *  - force DATABASE_URL sur la base dediee suivicolis_e2e (URL lue dans .db-url.local, jamais affichee).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const apiDir = path.resolve(__dirname, '..', '..');
const repoDir = path.resolve(apiDir, '..', '..');

const envFile = path.join(apiDir, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
    if (m && m[1] !== 'DATABASE_URL' && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
}

const base = fs.readFileSync(path.join(repoDir, '.db-url.local'), 'utf8').trim();
const e2eUrl = base.replace(/\/suivicolis(\?.*)?$/, '/suivicolis_e2e$1');
if (!/\/suivicolis_e2e(\?.*)?$/.test(e2eUrl)) throw new Error('Impossible de deriver l URL de la base suivicolis_e2e depuis .db-url.local');
process.env.DATABASE_URL = e2eUrl;
