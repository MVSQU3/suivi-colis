import * as fs from 'node:fs';
import * as path from 'node:path';
/** Charge apps/api/.env (sans dépendance) puis valide la configuration. */
export function loadEnv() {
  const file = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
    }
  }
  const errors: string[] = [];
  for (const k of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const v = process.env[k] ?? '';
    if (v.startsWith('CHANGE_ME') || v.length < 32) errors.push(`${k} doit être un secret aléatoire d'au moins 32 caractères (lancer \`pnpm env:setup\`)`);
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('CHANGE_ME')) errors.push('DATABASE_URL non configurée');
  if (errors.length) { console.error('Configuration invalide :\n - ' + errors.join('\n - ')); process.exit(1); }
}
