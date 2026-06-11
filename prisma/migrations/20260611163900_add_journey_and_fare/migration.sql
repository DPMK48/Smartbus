-- CreateEnum
CREATE TYPE "JourneyRoute" AS ENUM ('YELWA_TO_GUBI', 'GUBI_TO_YELWA');

-- AlterTable
ALTER TABLE "Bus" ADD COLUMN "journey" "JourneyRoute" NOT NULL,
ADD COLUMN "fareKobo" INTEGER;

-- DropIndex
DROP INDEX "Bus_status_createdAt_idx";

-- CreateIndex
CREATE INDEX "Bus_journey_status_createdAt_idx" ON "Bus"("journey", "status", "createdAt");
