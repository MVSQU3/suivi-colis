import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const env = fs.readFileSync('apps/api/.env', 'utf8');
const url = env.match(/^DATABASE_URL="?([^"\r\n]+)"?/m)[1].split('?')[0];
fs.mkdirSync('backups', { recursive: true });
const d = new Date(); const p = (n) => String(n).padStart(2, '0');
const file = `backups/suivi_colis_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.dump`;
const r = spawnSync('pg_dump', ['-Fc', '-f', file, url], { stdio: 'inherit' });
process.exit(r.status ?? 1);
