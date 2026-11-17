import { AuditAction, AuditEntity, Prisma } from '@prisma/client';

export interface AuditChange {
  field: string;
  from: string;
  to: string;
}

type Formatters<T> = { [K in keyof T]?: (value: T[K]) => string };

/**
 * Registra una entrada de auditoría dentro de la transacción del cambio.
 * Una edición sin cambios no se registra.
 */
export async function recordAudit(
  tx: Prisma.TransactionClient,
  entry: {
    clinicId: string;
    actorId: string | null;
    action: AuditAction;
    entity: AuditEntity;
    entityId: string;
    entityLabel: string;
    changes?: AuditChange[];
  },
) {
  if (entry.action === AuditAction.editar && entry.changes?.length === 0) {
    return;
  }
  const { changes, ...rest } = entry;
  await tx.auditEntry.create({
    data: {
      ...rest,
      entityLabel: rest.entityLabel.slice(0, 200),
      changes: changes
        ? (changes as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });
}

/** Cambios campo a campo con etiquetas legibles (mismo formato que el panel). */
export function diff<T extends object>(
  before: T,
  after: T,
  labels: Partial<Record<keyof T, string>>,
  formatters: Formatters<T> = {},
): AuditChange[] {
  // Los campos auditados son textos, enums o fechas ya formateadas
  const text = (value: unknown) => {
    if (value == null) return '';
    if (value instanceof Date) return value.toISOString();
    return typeof value === 'object'
      ? JSON.stringify(value)
      : `${value as string}`;
  };
  const show = <K extends keyof T>(key: K, value: T[K]) =>
    text(value) === '' ? '—' : (formatters[key]?.(value) ?? text(value));
  return (Object.keys(labels) as (keyof T)[])
    .filter((key) => text(before[key]) !== text(after[key]))
    .map((key) => ({
      field: labels[key]!,
      from: show(key, before[key]),
      to: show(key, after[key]),
    }));
}
