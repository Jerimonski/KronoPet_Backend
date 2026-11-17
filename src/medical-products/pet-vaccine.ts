import { Prisma, VaccineStatus } from '@prisma/client';

export interface PetVaccineData {
  petId: string;
  catalogId: string;
  name: string;
  status: VaccineStatus;
  appliedAt: Date | null;
  expiresAt: Date;
}

// La tabla vaccines no tiene índice único (petId, catalogId): se actualiza el
// registro más reciente de ese producto para la mascota o se crea uno nuevo.
export async function savePetVaccine(
  db: Prisma.TransactionClient,
  data: PetVaccineData,
) {
  const existing = await db.vaccine.findFirst({
    where: { petId: data.petId, catalogId: data.catalogId },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    return db.vaccine.update({
      where: { id: existing.id },
      data,
      include: { catalog: true },
    });
  }

  return db.vaccine.create({ data, include: { catalog: true } });
}
