import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) as any });

const CATALOG = [
  {
    name: 'Vacuna Óctuple Canina',
    targetSpecies: 'Perro',
    isBase: true,
    requiresReinforcement: true,
    daysToReinforce: 365,
  },
  {
    name: 'Vacuna Antirrábica Canina',
    targetSpecies: 'Perro',
    isBase: true,
    requiresReinforcement: true,
    daysToReinforce: 365,
  },
  {
    name: 'Vacuna KC (Tos de las perreras)',
    targetSpecies: 'Perro',
    isBase: false,
    requiresReinforcement: true,
    daysToReinforce: 365,
  },
  {
    name: 'Antiparasitario Interno Canino',
    targetSpecies: 'Perro',
    isBase: true,
    requiresReinforcement: true,
    daysToReinforce: 90,
  },
  {
    name: 'Antiparasitario Externo Canino',
    targetSpecies: 'Perro',
    isBase: true,
    requiresReinforcement: true,
    daysToReinforce: 30,
  },
  {
    name: 'Vacuna Triple Felina',
    targetSpecies: 'Gato',
    isBase: true,
    requiresReinforcement: true,
    daysToReinforce: 365,
  },
  {
    name: 'Vacuna Antirrábica Felina',
    targetSpecies: 'Gato',
    isBase: true,
    requiresReinforcement: true,
    daysToReinforce: 365,
  },
  {
    name: 'Vacuna Leucemia Felina',
    targetSpecies: 'Gato',
    isBase: false,
    requiresReinforcement: true,
    daysToReinforce: 365,
  },
  {
    name: 'Antiparasitario Interno Felino',
    targetSpecies: 'Gato',
    isBase: true,
    requiresReinforcement: true,
    daysToReinforce: 90,
  },
  {
    name: 'Antiparasitario Externo Felino',
    targetSpecies: 'Gato',
    isBase: true,
    requiresReinforcement: true,
    daysToReinforce: 30,
  },
] as const;

const DEMO_STAFF = {
  email: 'vet@kronopet.cl',
  name: 'Dr. Alejandro Silva',
  rut: '11111111-1',
  role: 'veterinario' as const,
};

const DEMO_USER = {
  email: 'tutor@kronopet.cl',
  name: 'Tutor de Prueba',
  rut: '22222222-2',
  phone: '+56912345678',
  address: 'Av. Siempre Viva 742',
};

async function main() {
  // 1. Catálogo
  for (const product of CATALOG) {
    await prisma.medicalProductCatalog.upsert({
      where: { name: product.name },
      update: {},
      create: product,
    });
  }

  // 2. StaffUser (Veterinario)
  const staff = await prisma.staffUser.upsert({
    where: { email: DEMO_STAFF.email },
    update: {},
    create: {
      ...DEMO_STAFF,
      passwordHash: await bcrypt.hash('kronopet123', 10),
    },
  });

  // 3. Tutor
  const user = await prisma.tutor.upsert({
    where: { email: DEMO_USER.email },
    update: {},
    create: {
      ...DEMO_USER,
      passwordHash: await bcrypt.hash('kronopet123', 10),
    },
  });

  const petCount = await prisma.pet.count({ where: { tutorId: user.id } });
  if (petCount === 0) {
    const octuple = await prisma.medicalProductCatalog.findUniqueOrThrow({
      where: { name: 'Vacuna Óctuple Canina' },
    });

    const appliedDate = new Date();
    appliedDate.setMonth(appliedDate.getMonth() - 2);
    const expirationDate = new Date(appliedDate);
    expirationDate.setDate(expirationDate.getDate() + 365);

    // 4. Mascota Max
    await prisma.pet.create({
      data: {
        name: 'Max',
        species: 'Perro',
        breed: 'Golden Retriever',
        sex: 'Macho',
        birthDate: new Date('2022-04-15'),
        reproductiveStatus: 'Esterilizado',
        tutorId: user.id,
        medicalEvents: {
          create: [
            {
              date: appliedDate,
              title: 'Vacunación anual',
              reason: 'ControlSanoRutina',
              observations: 'Paciente en excelente condición física.',
              diagnosis: 'Sano sin patologías.',
              recommendations: 'Próximo refuerzo en un año.',
              weightKg: 32.5,
              vetId: staff.id,
            },
          ],
        },
        vaccines: {
          create: [
            {
              catalogId: octuple.id,
              name: octuple.name,
              status: 'aplicada',
              appliedAt: appliedDate,
              expiresAt: expirationDate,
            },
          ],
        },
      },
    });

    // 5. Mascota Luna
    await prisma.pet.create({
      data: {
        name: 'Luna',
        species: 'Gato',
        breed: 'Doméstico pelo corto',
        sex: 'Hembra',
        reproductiveStatus: 'Entero',
        birthDate: new Date('2023-09-01'),
        tutorId: user.id,
        medicalEvents: {
          create: [
            {
              date: new Date(),
              title: 'Consulta general',
              reason: 'ConsultaGeneral',
              observations: 'Leve congestión nasal, sin fiebre.',
              diagnosis: 'Rinitis leve.',
              recommendations: 'Control en 7 días si persisten los síntomas.',
              weightKg: 4.1,
              vetId: staff.id,
            },
          ],
        },
      },
    });
  }

  console.log(`Seed listo: ${CATALOG.length} productos en catálogo`);
  console.log(`Veterinario: ${DEMO_STAFF.email} / kronopet123`);
  console.log(`Tutor: ${DEMO_USER.email} / kronopet123`);
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
