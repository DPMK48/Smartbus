-- CreateEnum
CREATE TYPE "BusStatus" AS ENUM ('ACTIVE', 'FULL', 'DEPARTED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'USED', 'EXPIRED', 'CANCELED');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bus" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "status" "BusStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departedAt" TIMESTAMP(3),

    CONSTRAINT "Bus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paystackRef" TEXT NOT NULL,
    "qrToken" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "purchasedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "scannedAt" TIMESTAMP(3),
    "scannedByAdminId" TEXT,
    "floatHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ScanLog" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT,
    "qrTokenTried" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Bus_status_createdAt_idx" ON "Bus"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_paystackRef_key" ON "Reservation"("paystackRef");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_qrToken_key" ON "Reservation"("qrToken");

-- CreateIndex
CREATE INDEX "Reservation_busId_status_idx" ON "Reservation"("busId", "status");

-- CreateIndex
CREATE INDEX "Reservation_status_expiresAt_idx" ON "Reservation"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
