-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('FORWARD', 'REVERSE');

-- CreateEnum
CREATE TYPE "Weather" AS ENUM ('DRY', 'WET', 'SNOW', 'ICE');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('DAY', 'NIGHT', 'DUSK', 'DAWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "photoUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "isDlc" BOOLEAN NOT NULL DEFAULT false,
    "dlcPack" TEXT,
    "photoUrl" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "direction" "Direction" NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "classCode" TEXT NOT NULL,
    "drivetrain" TEXT,
    "year" INTEGER,
    "isDlc" BOOLEAN NOT NULL DEFAULT false,
    "dlcPack" TEXT,
    "isRallycross" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeRecord" (
    "id" TEXT NOT NULL,
    "runnerId" TEXT NOT NULL,
    "registrarId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "timeMs" INTEGER NOT NULL,
    "penaltyMs" INTEGER NOT NULL DEFAULT 0,
    "isDnf" BOOLEAN NOT NULL DEFAULT false,
    "weather" "Weather" NOT NULL DEFAULT 'DRY',
    "timeOfDay" "TimeOfDay" NOT NULL DEFAULT 'DAY',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_country_key" ON "Location"("name", "country");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_name_locationId_key" ON "Stage"("name", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Car_name_key" ON "Car"("name");

-- CreateIndex
CREATE INDEX "TimeRecord_stageId_carId_idx" ON "TimeRecord"("stageId", "carId");

-- CreateIndex
CREATE INDEX "TimeRecord_runnerId_idx" ON "TimeRecord"("runnerId");

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_registrarId_fkey" FOREIGN KEY ("registrarId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
