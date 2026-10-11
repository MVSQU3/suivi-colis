import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { api, bootApp, login, resetDb, tokens } from './helpers';

describe('12. En attente (fonctionnalites non livrees / problemes connus)', () => {
  describe('utilisateur desactive', () => {
    let app: INestApplication; const p = new PrismaClient();
    beforeAll(async () => { await resetDb(); app = await bootApp(); });
    afterAll(async () => { await app?.close(); await p.$disconnect(); });
    // SKIP - probleme connu : le JWT d acces (15 min) d un utilisateur desactive reste valide jusqu a expiration
    it.skip('[connu, skip] le JWT d un utilisateur desactive doit etre refuse immediatement (aujourd hui valide jusqu a 15 min)', async () => {
      const t = await tokens(app);
      const agentToken = await login(app, 'agent@abidjan-express.local');
      const agentId = (await p.user.findUniqueOrThrow({ where: { email: 'agent@abidjan-express.local' } })).id;
      expect((await api(app, t.ownerA).patch(`/users/${agentId}/desactiver`)).status).toBe(200);
      expect((await api(app, agentToken).get('/colis')).status).toBe(401);
    });
    it('un utilisateur desactive ne peut plus se connecter (401)', async () => {
      const t = await tokens(app);
      const agentId = (await p.user.findUniqueOrThrow({ where: { email: 'agent@abidjan-express.local' } })).id;
      expect((await api(app, t.ownerA).patch(`/users/${agentId}/desactiver`)).status).toBe(200);
      await expect(login(app, 'agent@abidjan-express.local')).rejects.toThrow(/401/);
    });
  });
});
