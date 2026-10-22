import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

// Seed idempotente: se puede correr las veces que quieras sin duplicar datos.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) as any });

const CATALOG = [
  { name: 'Vacuna Óctuple Canina', targetSpecies: 'Perro', isBase: true, requiresReinforcement: true, daysToReinforce: 365 },
  { name: 'Vacuna Antirrábica Canina', targetSpecies: 'Perro', isBase: true, requiresReinforcement: true, daysToReinforce: 365 },
  { name: 'Vacuna KC (Tos de las perreras)', targetSpecies: 'Perro', isBase: false, requiresReinforcement: true, daysToReinforce: 365 },
  { name: 'Antiparasitario Interno Canino', targetSpecies: 'Perro', isBase: true, requiresReinforcement: true, daysToReinforce: 90 },
  { name: 'Antiparasitario Externo Canino', targetSpecies: 'Perro', isBase: true, requiresReinforcement: true, daysToReinforce: 30 },
  { name: 'Vacuna Triple Felina', targetSpecies: 'Gato', isBase: true, requiresReinforcement: true, daysToReinforce: 365 },
  { name: 'Vacuna Antirrábica Felina', targetSpecies: 'Gato', isBase: true, requiresReinforcement: true, daysToReinforce: 365 },
  { name: 'Vacuna Leucemia Felina', targetSpecies: 'Gato', isBase: false, requiresReinforcement: true, daysToReinforce: 365 },
  { name: 'Antiparasitario Interno Felino', targetSpecies: 'Gato', isBase: true, requiresReinforcement: true, daysToReinforce: 90 },
  { name: 'Antiparasitario Externo Felino', targetSpecies: 'Gato', isBase: true, requiresReinforcement: true, daysToReinforce: 30 },
];

const DEMO_USER = {
  email: 'tutor@kronopet.cl',
  password: 'kronopet123',
  name: 'Tutor de Prueba',
  phone: '+56912345678',
  address: 'Av. Siempre Viva 742',
};

async function main() {
  for (const product of CATALOG) {
    await prisma.medicalProductCatalog.upsert({
      where: { name: product.name },
      update: {},
      create: product,
    });
  }

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: {},
    create: {
      ...DEMO_USER,
      password: await bcrypt.hash(DEMO_USER.password, 10),
    },
  });

  const petCount = await prisma.pet.count({ where: { ownerId: user.id } });
  if (petCount === 0) {
    const octuple = await prisma.medicalProductCatalog.findUniqueOrThrow({
      where: { name: 'Vacuna Óctuple Canina' },
    });

    const appliedDate = new Date();
    appliedDate.setMonth(appliedDate.getMonth() - 2);
    const expirationDate = new Date(appliedDate);
    expirationDate.setDate(expirationDate.getDate() + 365);

    await prisma.pet.create({
      data: {
        name: 'Max',
        species: 'Perro',
        breed: 'Golden Retriever',
        gender: 'Macho',
        birthdate: new Date('2022-04-15'),
        reproductiveStatus: 'Esterilizado',
        weight: 32.5,
        ownerId: user.id,
        medicalEvents: {
          create: [
            {
              date: appliedDate,
              category: 'Inmunizacion',
              title: 'Vacunación anual',
              reason: 'Control de rutina y vacuna anual.',
              observations: 'Paciente en excelente condición física.',
              diagnosis: 'Sano sin patologías.',
              recommendations: 'Próximo refuerzo en un año.',
              weight: 32.5,
              veterinarian: 'Dr. Alejandro Silva',
              appliedProductId: octuple.id,
            },
          ],
        },
        medicalProducts: {
          create: [
            {
              medicalProductCatalogId: octuple.id,
              status: 'Aplicada',
              appliedDate,
              expirationDate,
            },
          ],
        },
      },
    });

    await prisma.pet.create({
      data: {
        name: 'Luna',
        species: 'Gato',
        breed: 'Doméstico pelo corto',
        gender: 'Hembra',
        birthdate: new Date('2023-09-01'),
        weight: 4.1,
        ownerId: user.id,
        medicalEvents: {
          create: [
            {
              category: 'Consulta',
              title: 'Consulta general',
              reason: 'Revisión por estornudos.',
              observations: 'Leve congestión nasal, sin fiebre.',
              diagnosis: 'Rinitis leve.',
              recommendations: 'Control en 7 días si persisten los síntomas.',
              weight: 4.1,
              veterinarian: 'Dra. Camila Rojas',
            },
          ],
        },
      },
    });
  }

  console.log(`Seed listo: ${CATALOG.length} productos en catálogo`);
  console.log(`Usuario de prueba: ${DEMO_USER.email} / ${DEMO_USER.password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
