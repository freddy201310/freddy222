-- AlterTable
ALTER TABLE "Family" ALTER COLUMN "trialEndsAt" SET DEFAULT (now() + interval '30 days');

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "totpLastStep" INTEGER NOT NULL DEFAULT 0;

