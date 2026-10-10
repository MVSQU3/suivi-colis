// Génère apps/api/.env à partir de .env.example (secrets aléatoires, DATABASE_URL depuis .db-url.local)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const target = path.join(root, 'apps/api/.env');
const dbFile = path.join(root, '.db-url.local');
const rnd = () => crypto.randomBytes(48).toString('hex');
let existing = {};
if (fs.existsSync(target)) {
  for (const l of fs.readFileSync(target, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) existing[m[1]] = m[2];
  }
}
const seedPwd = process.env.SEED_PASSWORD || 'Demo-' + crypto.randomBytes(5).toString('hex');
let out = example;
const set = (k, v) => { out = out.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`); };
set('JWT_ACCESS_SECRET', existing.JWT_ACCESS_SECRET ?? `"${rnd()}"`);
set('JWT_REFRESH_SECRET', existing.JWT_REFRESH_SECRET ?? `"${rnd()}"`);
set('SEED_ADMIN_PASSWORD', existing.SEED_ADMIN_PASSWORD ?? `"${seedPwd}"`);
set('SEED_USER_PASSWORD', existing.SEED_USER_PASSWORD ?? `"${seedPwd}"`);
if (fs.existsSync(dbFile)) {
  let url = fs.readFileSync(dbFile, 'utf8').trim().replace(/^\uFEFF/, '');
  if (!url.includes('schema=')) url += (url.includes('?') ? '&' : '?') + 'schema=public';
  set('DATABASE_URL', `"${url}"`);
  console.log('DATABASE_URL: lue depuis .db-url.local');
} else if (existing.DATABASE_URL) {
  set('DATABASE_URL', existing.DATABASE_URL);
  console.log('DATABASE_URL: conservée');
} else console.log('ATTENTION: .db-url.local absent, DATABASE_URL factice');
fs.writeFileSync(target, out);
console.log('apps/api/.env écrit');
