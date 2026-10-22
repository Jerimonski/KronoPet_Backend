-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "gender" TEXT NOT NULL,
    "birthdate" TIMESTAMP(3) NOT NULL,
    "reproductiveStatus" TEXT NOT NULL DEFAULT 'Intacto',
    "weight" DOUBLE PRECISION,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalEvent" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "observations" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "veterinarian" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "appliedProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalEvent_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalProductCatalog_name_key" ON "MedicalProductCatalog"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PetMedicalProduct_petId_medicalProductCatalogId_key" ON "PetMedicalProduct"("petId", "medicalProductCatalogId");

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEvent" ADD CONSTRAINT "MedicalEvent_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEvent" ADD CONSTRAINT "MedicalEvent_appliedProductId_fkey" FOREIGN KEY ("appliedProductId") REFERENCES "MedicalProductCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetMedicalProduct" ADD CONSTRAINT "PetMedicalProduct_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetMedicalProduct" ADD CONSTRAINT "PetMedicalProduct_medicalProductCatalogId_fkey" FOREIGN KEY ("medicalProductCatalogId") REFERENCES "MedicalProductCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

