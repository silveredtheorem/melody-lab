-- AlterTable: add nullable familyId first, backfill with unique values, then make NOT NULL
ALTER TABLE "RefreshToken" ADD COLUMN     "deprecatedAt" TIMESTAMP(3);
ALTER TABLE "RefreshToken" ADD COLUMN     "familyId" TEXT;

-- Each existing token becomes the root of its own family
UPDATE "RefreshToken" SET "familyId" = gen_random_uuid()::text WHERE "familyId" IS NULL;

ALTER TABLE "RefreshToken" ALTER COLUMN "familyId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
