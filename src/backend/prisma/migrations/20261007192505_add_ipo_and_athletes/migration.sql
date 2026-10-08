-- CreateEnum
CREATE TYPE "IpoStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUCCESSFUL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'REFUNDED');

-- CreateTable
CREATE TABLE "athletes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipo_offers" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "sharePrice" DECIMAL(18,4) NOT NULL,
    "totalShares" INTEGER NOT NULL,
    "softCapShares" INTEGER NOT NULL,
    "hardCapShares" INTEGER NOT NULL,
    "soldShares" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "IpoStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ipo_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipo_reservations" (
    "id" TEXT NOT NULL,
    "ipoOfferId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sharesCount" INTEGER NOT NULL,
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ipo_reservations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_offers" ADD CONSTRAINT "ipo_offers_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_reservations" ADD CONSTRAINT "ipo_reservations_ipoOfferId_fkey" FOREIGN KEY ("ipoOfferId") REFERENCES "ipo_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_reservations" ADD CONSTRAINT "ipo_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
