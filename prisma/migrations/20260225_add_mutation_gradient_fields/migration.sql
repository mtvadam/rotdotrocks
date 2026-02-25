-- AlterTable
ALTER TABLE "Mutation" ADD COLUMN "gradientColors" TEXT;
ALTER TABLE "Mutation" ADD COLUMN "gradientDirection" TEXT;
ALTER TABLE "Mutation" ADD COLUMN "isAnimated" BOOLEAN NOT NULL DEFAULT false;
