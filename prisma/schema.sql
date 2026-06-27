-- ============================================================
--  テーブル作成 DDL（Supabase SQL Editor 貼り付け用）
--  prisma/schema.prisma から生成。
--  ※ これを実行してから prisma/seed.sql を実行してください。
-- ============================================================

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'SHOP_ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('PRIMARY', 'SUPPORT');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PART_TIME', 'FULL_TIME');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Position" AS ENUM ('HALL', 'KITCHEN', 'CASHIER', 'MANAGER', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "employmentType" "EmploymentType",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "primaryShopId" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" SERIAL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_memberships" (
    "id" SERIAL,
    "userId" INTEGER NOT NULL,
    "shopId" INTEGER NOT NULL,
    "type" "MembershipType" NOT NULL DEFAULT 'PRIMARY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_requests" (
    "id" SERIAL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMPTZ(6) NOT NULL,
    "endTime" TIMESTAMPTZ(6) NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "shopId" INTEGER NOT NULL,

    CONSTRAINT "shift_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_shifts" (
    "id" SERIAL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMPTZ(6) NOT NULL,
    "endTime" TIMESTAMPTZ(6) NOT NULL,
    "position" "Position" NOT NULL DEFAULT 'HALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "shopId" INTEGER NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "final_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_employmentType_idx" ON "users"("employmentType");

-- CreateIndex
CREATE INDEX "users_primaryShopId_idx" ON "users"("primaryShopId");

-- CreateIndex
CREATE INDEX "shops_name_idx" ON "shops"("name");

-- CreateIndex
CREATE INDEX "shops_isActive_idx" ON "shops"("isActive");

-- CreateIndex
CREATE INDEX "shop_memberships_shopId_idx" ON "shop_memberships"("shopId");

-- CreateIndex
CREATE INDEX "shop_memberships_userId_idx" ON "shop_memberships"("userId");

-- CreateIndex
CREATE INDEX "shop_memberships_type_idx" ON "shop_memberships"("type");

-- CreateIndex
CREATE UNIQUE INDEX "shop_memberships_userId_shopId_key" ON "shop_memberships"("userId", "shopId");

-- CreateIndex
CREATE INDEX "shift_requests_shopId_date_idx" ON "shift_requests"("shopId", "date");

-- CreateIndex
CREATE INDEX "shift_requests_userId_date_idx" ON "shift_requests"("userId", "date");

-- CreateIndex
CREATE INDEX "shift_requests_status_idx" ON "shift_requests"("status");

-- CreateIndex
CREATE INDEX "shift_requests_date_idx" ON "shift_requests"("date");

-- CreateIndex
CREATE INDEX "final_shifts_shopId_date_idx" ON "final_shifts"("shopId", "date");

-- CreateIndex
CREATE INDEX "final_shifts_userId_date_idx" ON "final_shifts"("userId", "date");

-- CreateIndex
CREATE INDEX "final_shifts_date_idx" ON "final_shifts"("date");

-- CreateIndex
CREATE INDEX "final_shifts_position_idx" ON "final_shifts"("position");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_primaryShopId_fkey" FOREIGN KEY ("primaryShopId") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_memberships" ADD CONSTRAINT "shop_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_memberships" ADD CONSTRAINT "shop_memberships_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_requests" ADD CONSTRAINT "shift_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_requests" ADD CONSTRAINT "shift_requests_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_shifts" ADD CONSTRAINT "final_shifts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_shifts" ADD CONSTRAINT "final_shifts_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_shifts" ADD CONSTRAINT "final_shifts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
