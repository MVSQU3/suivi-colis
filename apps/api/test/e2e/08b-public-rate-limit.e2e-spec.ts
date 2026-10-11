import { INestApplication } from '@nestjs/common';
import { api, bootApp } from './helpers';

describe('8b. Suivi public : limitation de debit', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await bootApp(); });
  afterAll(async () => { await app?.close(); });

  it('429 apres TRACKING_RATE_LIMIT_PER_MIN requetes par minute', async () => {
    const limit = Number(process.env.TRACKING_RATE_LIMIT_PER_MIN ?? 30);
    for (let i = 0; i < limit; i++) expect((await api(app).get('/public/suivi/ABCD-EFGH-JKMN')).status).toBe(404);
    expect((await api(app).get('/public/suivi/ABCD-EFGH-JKMN')).status).toBe(429);
  });
});
