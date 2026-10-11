CREATE TABLE "LienAcces" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "clientId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LienAcces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LienAcces_tokenHash_key" ON "LienAcces"("tokenHash");
CREATE INDEX "LienAcces_clientId_idx" ON "LienAcces"("clientId");
ALTER TABLE "LienAcces" ADD CONSTRAINT "LienAcces_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SessionClient" (
    "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "clientId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionClient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SessionClient_tokenHash_key" ON "SessionClient"("tokenHash");
CREATE INDEX "SessionClient_clientId_idx" ON "SessionClient"("clientId");
ALTER TABLE "SessionClient" ADD CONSTRAINT "SessionClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Un seul lien actif (non utilise, non revoque) par client
CREATE UNIQUE INDEX "LienAcces_un_actif_par_client" ON "LienAcces"("clientId") WHERE "usedAt" IS NULL AND "revokedAt" IS NULL;