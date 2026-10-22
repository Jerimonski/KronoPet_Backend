CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('veterinario', 'administrador');

-- CreateEnum
CREATE TYPE "Species" AS ENUM ('Perro', 'Gato', 'Ave', 'Conejo', 'Otro');

-- CreateEnum
CREATE TYPE "PetSex" AS ENUM ('Macho', 'Hembra');

-- CreateEnum
CREATE TYPE "ReproductiveStatus" AS ENUM ('Entero', 'Esterilizado');

-- CreateEnum
CREATE TYPE "PetAlertType" AS ENUM ('alergia', 'condicion', 'comportamiento', 'otra');

-- CreateEnum
CREATE TYPE "MedicalReason" AS ENUM ('Consulta General', 'Control Sano y Rutina', 'Urgencia / Emergencia', 'Procedimiento Quirúrgico', 'Examen de Laboratorio', 'Desparasitación');

-- CreateEnum
CREATE TYPE "AttachmentCategory" AS ENUM ('laboratorio', 'imagen', 'documento');

-- CreateEnum
CREATE TYPE "VaccineStatus" AS ENUM ('aplicada', 'pendiente');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('crear', 'editar', 'eliminar', 'deshabilitar', 'habilitar', 'adjuntar', 'enviar');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('tutor', 'mascota', 'ficha', 'vacuna', 'equipo', 'alerta', 'adjunto', 'recordatorio');

-- CreateEnum
CREATE TYPE "ReminderKind" AS ENUM ('vacuna_vencida', 'vacuna_por_vencer', 'vacuna_pendiente', 'control');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('enviado', 'error');

-- CreateTable
CREATE TABLE "staff_users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "rut" VARCHAR(12) NOT NULL,
    "email" CITEXT NOT NULL,
    "phone" VARCHAR(20),
    "role" "StaffRole" NOT NULL,
    "specialty" VARCHAR(120),
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutors" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "rut" VARCHAR(12) NOT NULL,
    "email" CITEXT NOT NULL,
    "phone" VARCHAR(20),
    "address" VARCHAR(200),
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "tutors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pets" (
    "id" UUID NOT NULL,
    "tutorId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "species" "Species" NOT NULL,
    "breed" VARCHAR(80) NOT NULL,
    "sex" "PetSex" NOT NULL,
    "birthDate" DATE,
    "reproductiveStatus" "ReproductiveStatus" NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_alerts" (
    "id" UUID NOT NULL,
    "petId" UUID NOT NULL,
    "type" "PetAlertType" NOT NULL,
    "description" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "pet_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_events" (
    "id" UUID NOT NULL,
    "petId" UUID NOT NULL,
    "vetId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "reason" "MedicalReason" NOT NULL,
    "observations" TEXT,
    "diagnosis" TEXT,
    "recommendations" TEXT NOT NULL DEFAULT '',
    "weightKg" DECIMAL(5,2) NOT NULL,
    "followUpDate" DATE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "petId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(50) NOT NULL,
    "size" INTEGER NOT NULL,
    "category" "AttachmentCategory" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" UUID NOT NULL,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccines" (
    "id" UUID NOT NULL,
    "petId" UUID NOT NULL,
    "catalogId" UUID,
    "name" VARCHAR(120) NOT NULL,
    "status" "VaccineStatus" NOT NULL,
    "appliedAt" DATE,
    "expiresAt" DATE NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_product_catalog" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "targetSpecies" "Species" NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "requiresReinforcement" BOOLEAN NOT NULL DEFAULT true,
    "daysToReinforce" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "medical_product_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" UUID NOT NULL,
    "at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" UUID,
    "action" "AuditAction" NOT NULL,
    "entity" "AuditEntity" NOT NULL,
    "entityId" UUID NOT NULL,
    "entityLabel" VARCHAR(200) NOT NULL,
    "changes" JSONB,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_logs" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "kind" "ReminderKind" NOT NULL,
    "tutorId" UUID NOT NULL,
    "petId" UUID NOT NULL,
    "refId" UUID NOT NULL,
    "dueDate" DATE NOT NULL,
    "toEmail" CITEXT NOT NULL,
    "sentAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentBy" UUID,
    "status" "ReminderStatus" NOT NULL,
    "error" TEXT,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_settings" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "daysBefore" SMALLINT NOT NULL DEFAULT 7,
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "lastAutoRun" DATE,

    CONSTRAINT "reminder_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" CITEXT NOT NULL,
    "clinic" VARCHAR(120),
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_rut_key" ON "staff_users"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tutors_rut_key" ON "tutors"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "tutors_email_key" ON "tutors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "medical_product_catalog_name_key" ON "medical_product_catalog"("name");

-- CreateIndex
CREATE INDEX "reminder_logs_key_idx" ON "reminder_logs"("key");

-- AddForeignKey
ALTER TABLE "pets" ADD CONSTRAINT "pets_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_alerts" ADD CONSTRAINT "pet_alerts_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_alerts" ADD CONSTRAINT "pet_alerts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_events" ADD CONSTRAINT "medical_events_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_events" ADD CONSTRAINT "medical_events_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "medical_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccines" ADD CONSTRAINT "vaccines_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccines" ADD CONSTRAINT "vaccines_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "medical_product_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECKs para MedicalEvent (corregido con comillas dobles)
ALTER TABLE medical_events ADD CONSTRAINT chk_weight CHECK ("weightKg" > 0 AND "weightKg" <= 200);
ALTER TABLE medical_events ADD CONSTRAINT chk_followup CHECK ("followUpDate" IS NULL OR "followUpDate" > date);

-- CHECKs para Attachment
ALTER TABLE attachments ADD CONSTRAINT chk_size CHECK (size <= 10485760);

-- CHECKs para ReminderSettings (corregido con comillas dobles)
ALTER TABLE reminder_settings ADD CONSTRAINT chk_days_before CHECK ("daysBefore" IN (3, 7, 14, 30));
ALTER TABLE reminder_settings ADD CONSTRAINT chk_id CHECK (id = 1);