-- CreateTable
CREATE TABLE "FavoriteCar" (
    "userId" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteCar_pkey" PRIMARY KEY ("userId","carId")
);

-- CreateIndex
CREATE INDEX "FavoriteCar_userId_idx" ON "FavoriteCar"("userId");

-- CreateIndex
CREATE INDEX "FavoriteCar_carId_idx" ON "FavoriteCar"("carId");

-- AddForeignKey
ALTER TABLE "FavoriteCar" ADD CONSTRAINT "FavoriteCar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteCar" ADD CONSTRAINT "FavoriteCar_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
