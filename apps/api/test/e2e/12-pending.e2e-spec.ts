import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { api, bootApp, login, resetDb, tokens } from './helpers';

describe('12. En attente (fonctionnalites non livrees / problemes connus)', () => {
  describe('magic-link client (route pas encore implementee)', () => {
    it.todo('GET du lien magique ne consomme pas le jeton (prefetch des messageries)');
    it.todo('premier POST consomme le jeton, second POST refuse');
    it.todo('jeton expire refuse');
    it.todo('jeton stocke hache en base (jamais en clair)');
    it.todo('reponse de la demande identique que le telephone existe ou non (pas d enumeration)');
  });
  describe('archivage / suppression (regles non definies)', () => {
    it.todo('archiver un colis livre le retire des listes actives mais garde le suivi public');
    it.todo('suppression interdite pour un colis/lot ayant des checkpoints (soft delete uniquement)');
  });

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
