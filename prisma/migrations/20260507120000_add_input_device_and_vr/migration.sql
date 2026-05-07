-- CreateEnum
CREATE TYPE "InputDevice" AS ENUM ('GAMEPAD', 'WHEEL');

-- AlterTable
ALTER TABLE "TimeRecord"
  ADD COLUMN "inputDevice" "InputDevice" NOT NULL DEFAULT 'GAMEPAD',
  ADD COLUMN "usesVr" BOOLEAN NOT NULL DEFAULT false;
