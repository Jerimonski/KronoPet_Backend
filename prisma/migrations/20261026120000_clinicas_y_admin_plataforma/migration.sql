-- Clínicas (multi-clínica) y cuenta de administración de la plataforma.
-- Los datos que ya existían quedan en una clínica inicial con id fijo.

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" CITEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinics" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "rut" VARCHAR(12) NOT NULL,
    "email" CITEXT NOT NULL,
    "phone" VARCHAR(20),
    "address" VARCHAR(200),
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- Clínica inicial solo si ya hay datos que asignar
INSERT INTO "clinics" ("id", "name", "rut", "email")
SELECT '00000000-0000-4000-8000-000000000001', 'Clínica Veterinaria Vety', '76.543.210-3', 'contacto@vety.cl'
WHERE EXISTS (SELECT 1 FROM "staff_users")
   OR EXISTS (SELECT 1 FROM "tutors")
   OR EXISTS (SELECT 1 FROM "audit_entries")
   OR EXISTS (SELECT 1 FROM "reminder_settings");

-- AlterTable
ALTER TABLE "staff_users" ADD COLUMN "clinicId" UUID;
UPDATE "staff_users" SET "clinicId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "staff_users" ALTER COLUMN "clinicId" SET NOT NULL;

ALTER TABLE "tutors" ADD COLUMN "clinicId" UUID;
UPDATE "tutors" SET "clinicId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "tutors" ALTER COLUMN "clinicId" SET NOT NULL;

ALTER TABLE "audit_entries" ADD COLUMN "clinicId" UUID;
UPDATE "audit_entries" SET "clinicId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "audit_entries" ALTER COLUMN "clinicId" SET NOT NULL;

-- reminder_settings: de fila única (id = 1, CHECK chk_id) a una fila por clínica
ALTER TABLE "reminder_settings" DROP CONSTRAINT "reminder_settings_pkey";
ALTER TABLE "reminder_settings" DROP CONSTRAINT "chk_id";
ALTER TABLE "reminder_settings" DROP COLUMN "id";
ALTER TABLE "reminder_settings" ADD COLUMN "clinicId" UUID;
UPDATE "reminder_settings" SET "clinicId" = '00000000-0000-4000-8000-000000000001';
ALTER TABLE "reminder_settings" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "reminder_settings" ADD CONSTRAINT "reminder_settings_pkey" PRIMARY KEY ("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");
CREATE UNIQUE INDEX "clinics_rut_key" ON "clinics"("rut");
CREATE INDEX "audit_entries_clinicId_at_idx" ON "audit_entries"("clinicId", "at");
CREATE INDEX "staff_users_clinicId_idx" ON "staff_users"("clinicId");
CREATE INDEX "tutors_clinicId_idx" ON "tutors"("clinicId");

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tutors" ADD CONSTRAINT "tutors_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reminder_settings" ADD CONSTRAINT "reminder_settings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

