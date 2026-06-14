/*
  Warnings:

  - You are about to drop the `Vaccine` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `category` to the `MedicalEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `MedicalEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Pet` table without a default value. This is not possible if the table is not empty.
  - Made the column `birthdate` on table `Pet` required. This step will fail if there are existing NULL values in that column.
  - Made the column `gender` on table `Pet` required. This step will fail if there are existing NULL values in that column.
  - Made the column `reproductiveStatus` on table `Pet` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `address` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Vaccine" DROP CONSTRAINT "Vaccine_petId_fkey";

-- AlterTable
ALTER TABLE "MedicalEvent" ADD COLUMN     "appliedProductId" TEXT,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "birthdate" SET NOT NULL,
ALTER COLUMN "gender" SET NOT NULL,
ALTER COLUMN "reproductiveStatus" SET NOT NULL,
ALTER COLUMN "reproductiveStatus" SET DEFAULT 'Intacto';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "address" SET NOT NULL;

-- DropTable
DROP TABLE "Vaccine";

-- CreateTable
CREATE TABLE "MedicalProductCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetSpecies" TEXT NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "requiresReinforcement" BOOLEAN NOT NULL DEFAULT true,
    "daysToReinforce" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalProductCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetMedicalProduct" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendiente',
    "appliedDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "petId" TEXT NOT NULL,
    "medicalProductCatalogId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetMedicalProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicalProductCatalog_name_key" ON "MedicalProductCatalog"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PetMedicalProduct_petId_medicalProductCatalogId_key" ON "PetMedicalProduct"("petId", "medicalProductCatalogId");

-- AddForeignKey
ALTER TABLE "MedicalEvent" ADD CONSTRAINT "MedicalEvent_appliedProductId_fkey" FOREIGN KEY ("appliedProductId") REFERENCES "MedicalProductCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetMedicalProduct" ADD CONSTRAINT "PetMedicalProduct_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetMedicalProduct" ADD CONSTRAINT "PetMedicalProduct_medicalProductCatalogId_fkey" FOREIGN KEY ("medicalProductCatalogId") REFERENCES "MedicalProductCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
