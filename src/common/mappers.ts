import {
  Attachment,
  AuditEntry,
  MedicalEvent,
  Pet,
  PetAlert,
  ReminderLog,
  ReminderSettings,
  StaffUser,
  Tutor,
  Vaccine,
} from '@prisma/client';
import { fromDbDate } from './dates';

// Convierten filas de Prisma a la forma que consume el panel
// (KronoPet_Frontend/src/core/types/models.ts): días YYYY-MM-DD, textos
// opcionales como "", peso como número y nunca hashes ni rutas internas.

export function toStaff(s: StaffUser) {
  return {
    id: s.id,
    name: s.name,
    rut: s.rut,
    email: s.email,
    phone: s.phone ?? '',
    role: s.role,
    specialty: s.specialty ?? '',
    active: s.active,
    createdAt: s.createdAt.toISOString(),
    deactivatedAt: s.deactivatedAt?.toISOString() ?? null,
  };
}

export function toTutor(t: Tutor) {
  return {
    id: t.id,
    name: t.name,
    rut: t.rut,
    email: t.email,
    phone: t.phone ?? '',
    address: t.address ?? '',
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function toAlert(a: PetAlert) {
  return {
    id: a.id,
    type: a.type,
    description: a.description,
    createdAt: a.createdAt.toISOString(),
    createdBy: a.createdBy,
  };
}

export function toPet(p: Pet & { alerts?: PetAlert[] }) {
  return {
    id: p.id,
    name: p.name,
    species: p.species,
    breed: p.breed,
    sex: p.sex,
    birthDate: fromDbDate(p.birthDate) ?? '',
    reproductiveStatus: p.reproductiveStatus,
    tutorId: p.tutorId,
    createdAt: p.createdAt.toISOString(),
    alerts: (p.alerts ?? []).map(toAlert),
  };
}

export function toMedicalEvent(e: MedicalEvent) {
  return {
    id: e.id,
    petId: e.petId,
    vetId: e.vetId,
    date: fromDbDate(e.date),
    title: e.title,
    // Nombre del enum (ConsultaGeneral); el panel lo traduce a su etiqueta
    reason: e.reason,
    observations: e.observations ?? '',
    diagnosis: e.diagnosis ?? '',
    recommendations: e.recommendations,
    weightKg: Number(e.weightKg),
    followUpDate: fromDbDate(e.followUpDate),
    createdAt: e.createdAt.toISOString(),
  };
}

export function toAttachment(a: Attachment) {
  return {
    id: a.id,
    eventId: a.eventId,
    petId: a.petId,
    name: a.name,
    mimeType: a.mimeType,
    size: a.size,
    category: a.category,
    uploadedAt: a.uploadedAt.toISOString(),
    uploadedBy: a.uploadedBy,
  };
}

export function toVaccine(v: Vaccine) {
  return {
    id: v.id,
    petId: v.petId,
    catalogId: v.catalogId,
    name: v.name,
    status: v.status,
    appliedAt: fromDbDate(v.appliedAt),
    expiresAt: fromDbDate(v.expiresAt),
    description: v.description,
  };
}

export function toAuditEntry(a: AuditEntry) {
  return {
    id: a.id,
    at: a.at.toISOString(),
    actorId: a.actorId,
    action: a.action,
    entity: a.entity,
    entityId: a.entityId,
    entityLabel: a.entityLabel,
    changes:
      (a.changes as { field: string; from: string; to: string }[] | null) ??
      undefined,
  };
}

export function toReminderLog(r: ReminderLog) {
  return {
    id: r.id,
    key: r.key,
    kind: r.kind,
    tutorId: r.tutorId,
    petId: r.petId,
    refId: r.refId,
    dueDate: fromDbDate(r.dueDate),
    to: r.toEmail,
    sentAt: r.sentAt.toISOString(),
    sentBy: r.sentBy,
    status: r.status,
    error: r.error ?? undefined,
  };
}

export function toReminderSettings(s: ReminderSettings) {
  return {
    daysBefore: s.daysBefore,
    autoSend: s.autoSend,
    lastAutoRun: fromDbDate(s.lastAutoRun),
  };
}
