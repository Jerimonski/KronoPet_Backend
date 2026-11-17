// Datos de prueba de KronoPet. Uso:
//   pnpm db:seed         agrega los datos si faltan (idempotente)
//   pnpm db:seed:fresh   BORRA todos los registros y vuelve a cargar el seed
//
// Los datos de la clínica son los mismos que tenía el panel en modo simulado
// (KronoPet_Frontend/src/core/mocks/seed.ts): deterministas (PRNG con semilla)
// y relativos a la fecha de hoy, para que el dashboard siempre tenga actividad.
import 'dotenv/config';
import { MedicalReason, Prisma, PrismaClient, Species } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) as any });

const FRESH = process.argv.includes('--fresh');

/** Contraseña de los veterinarios de la clínica de prueba. */
const STAFF_PASSWORD = 'vety1234';

// Credenciales de prueba desde el .env (ver .env.example)
const PLATFORM_ADMIN = {
  name: process.env.SEED_PLATFORM_ADMIN_NAME ?? 'Administración KronoPet',
  email: process.env.SEED_PLATFORM_ADMIN_EMAIL ?? 'admin@kronopet.cl',
  password: process.env.SEED_PLATFORM_ADMIN_PASSWORD ?? 'kronopet-admin',
};
/** Cuenta de la clínica de prueba: su administradora (primer integrante de STAFF). */
const CLINIC_ACCOUNT = {
  email: process.env.SEED_CLINIC_EMAIL ?? 'camila.rojas@vety.cl',
  password: process.env.SEED_CLINIC_PASSWORD ?? STAFF_PASSWORD,
};
/** Cuenta de la segunda clínica (Umbrella): su administrador. */
const CLINIC2_ACCOUNT = {
  email: process.env.SEED_CLINIC2_EMAIL ?? 'umbrella@gmail.com',
  password: process.env.SEED_CLINIC2_PASSWORD ?? 'umbrella',
};
const CLINIC = {
  name: 'Clínica Veterinaria Vety',
  rutBody: '76543210',
  email: 'contacto@vety.cl',
  phone: '+56 2 2345 6789',
  address: 'Av. Providencia 1234, Providencia',
};

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

// --- Utilidades -------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function computeDv(body: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (sum % 11);
  if (dv === 11) return '0';
  if (dv === 10) return 'K';
  return String(dv);
}

/** "12887402" → "12.887.402-K" */
function rutFromBody(body: string): string {
  const dotted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${dotted}-${computeDv(body)}`;
}

const todayISO = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(
    new Date(),
  );
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
function addDays(iso: string, days: number): string {
  const date = day(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function addMonths(iso: string, months: number): string {
  const date = day(iso);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}
const daysBetween = (from: string, to: string) =>
  Math.round((day(to).getTime() - day(from).getTime()) / 86_400_000);

// --- Datos de la clínica ----------------------------------------------------

const STAFF = [
  {
    name: 'Dra. Camila Rojas',
    rutBody: '12887402',
    email: 'camila.rojas@vety.cl',
    phone: '+56 9 6123 4401',
    role: 'administrador',
    specialty: 'Medicina interna',
    daysAgo: 1400,
  },
  {
    name: 'Dr. Matías Fuentes',
    rutBody: '15204881',
    email: 'matias.fuentes@vety.cl',
    phone: '+56 9 7342 1180',
    role: 'veterinario',
    specialty: 'Cirugía general',
    daysAgo: 1100,
  },
  {
    name: 'Dra. Valentina Soto',
    rutBody: '17553920',
    email: 'valentina.soto@vety.cl',
    phone: '+56 9 8456 2093',
    role: 'veterinario',
    specialty: 'Medicina felina',
    daysAgo: 700,
  },
  {
    name: 'Dr. Benjamín Araya',
    rutBody: '18902117',
    email: 'benjamin.araya@vety.cl',
    phone: '+56 9 5521 7740',
    role: 'veterinario',
    specialty: 'Animales exóticos',
    daysAgo: 420,
  },
] as const;

const TUTOR_NAMES = [
  'María José González',
  'Felipe Muñoz',
  'Catalina Pérez',
  'Sebastián Díaz',
  'Javiera Morales',
  'Diego Contreras',
  'Antonia Silva',
  'Nicolás Martínez',
  'Fernanda Sepúlveda',
  'Tomás Castillo',
  'Isidora Torres',
  'Cristóbal Herrera',
  'Constanza Vargas',
  'Joaquín Espinoza',
  'Daniela Reyes',
  'Ignacio Campos',
];

const STREETS = [
  'Av. Providencia',
  'Los Leones',
  'Irarrázaval',
  'Av. Grecia',
  'Pedro de Valdivia',
  'Av. Matta',
  'Manuel Montt',
  'Av. Vicuña Mackenna',
];

const COMMUNES = [
  'Providencia',
  'Ñuñoa',
  'Santiago',
  'La Florida',
  'Macul',
  'Las Condes',
];

const PET_TEMPLATES: {
  name: string;
  species: Species;
  breed: string;
  baseWeight: number;
}[] = [
  {
    name: 'Luna',
    species: 'Perro',
    breed: 'Labrador Retriever',
    baseWeight: 28,
  },
  {
    name: 'Simón',
    species: 'Gato',
    breed: 'Europeo de pelo corto',
    baseWeight: 4.6,
  },
  { name: 'Rocky', species: 'Perro', breed: 'Bulldog Francés', baseWeight: 12 },
  { name: 'Mía', species: 'Gato', breed: 'Siamés', baseWeight: 3.8 },
  { name: 'Toby', species: 'Perro', breed: 'Quiltro', baseWeight: 18 },
  {
    name: 'Kiwi',
    species: 'Ave',
    breed: 'Cotorra argentina',
    baseWeight: 0.12,
  },
  { name: 'Max', species: 'Perro', breed: 'Golden Retriever', baseWeight: 31 },
  { name: 'Nala', species: 'Gato', breed: 'Persa', baseWeight: 4.1 },
  { name: 'Bruno', species: 'Perro', breed: 'Pastor Alemán', baseWeight: 34 },
  { name: 'Copito', species: 'Conejo', breed: 'Belier', baseWeight: 1.9 },
  { name: 'Olivia', species: 'Perro', breed: 'Beagle', baseWeight: 11 },
  { name: 'Garfield', species: 'Gato', breed: 'Maine Coon', baseWeight: 7.2 },
  { name: 'Chispa', species: 'Perro', breed: 'Poodle Toy', baseWeight: 3.5 },
  { name: 'Lola', species: 'Perro', breed: 'Schnauzer', baseWeight: 8.4 },
  { name: 'Michi', species: 'Gato', breed: 'Bengalí', baseWeight: 5 },
  { name: 'Pipo', species: 'Ave', breed: 'Canario', baseWeight: 0.03 },
  { name: 'Thor', species: 'Perro', breed: 'Husky Siberiano', baseWeight: 24 },
  { name: 'Canela', species: 'Perro', breed: 'Cocker Spaniel', baseWeight: 13 },
  { name: 'Salem', species: 'Gato', breed: 'Bombay', baseWeight: 4.4 },
  {
    name: 'Spike',
    species: 'Otro',
    breed: 'Erizo de tierra africano',
    baseWeight: 0.4,
  },
  { name: 'Frida', species: 'Perro', breed: 'Dachshund', baseWeight: 7.5 },
  { name: 'Milo', species: 'Gato', breed: 'Ragdoll', baseWeight: 6.1 },
  { name: 'Coco', species: 'Perro', breed: 'Shih Tzu', baseWeight: 6.3 },
  {
    name: 'Tambor',
    species: 'Conejo',
    breed: 'Holandés enano',
    baseWeight: 1.2,
  },
  { name: 'Maya', species: 'Perro', breed: 'Border Collie', baseWeight: 17 },
  { name: 'Oreo', species: 'Gato', breed: 'Europeo bicolor', baseWeight: 4.9 },
];

const PET_ALERTS: Record<
  string,
  { type: 'alergia' | 'condicion' | 'comportamiento'; description: string }[]
> = {
  Luna: [{ type: 'alergia', description: 'Alergia a la penicilina' }],
  Garfield: [
    { type: 'condicion', description: 'Enfermedad renal crónica (IRIS 2)' },
  ],
  Thor: [
    { type: 'comportamiento', description: 'Agresivo al manejo: usar bozal' },
  ],
  Michi: [
    { type: 'alergia', description: 'Hipersensibilidad alimentaria al pollo' },
    {
      type: 'comportamiento',
      description: 'Se estresa con perros en sala de espera',
    },
  ],
  Rocky: [
    {
      type: 'condicion',
      description: 'Síndrome braquicefálico: riesgo anestésico',
    },
  ],
};

interface EventTemplate {
  title: string;
  observations: string;
  diagnosis: string;
  recommendations: string;
}

const EVENT_TEMPLATES: Record<MedicalReason, EventTemplate[]> = {
  ConsultaGeneral: [
    {
      title: 'Consulta por vómitos',
      observations:
        'Tutor refiere 3 episodios de vómito en 24 h. Mucosas rosadas, hidratación normal.',
      diagnosis: 'Gastritis aguda leve',
      recommendations:
        'Dieta blanda por 3 días, omeprazol 1 mg/kg c/24 h. Control si persiste.',
    },
    {
      title: 'Consulta dermatológica',
      observations: 'Prurito intenso en zona lumbar, eritema y alopecia focal.',
      diagnosis: 'Dermatitis alérgica por pulgas',
      recommendations:
        'Antiparasitario externo mensual, shampoo medicado 2 veces por semana.',
    },
    {
      title: 'Consulta por cojera',
      observations: 'Claudicación de miembro posterior derecho grado II/IV.',
      diagnosis: 'Esguince leve de tarso',
      recommendations:
        'Reposo relativo 10 días, meloxicam 0,1 mg/kg c/24 h por 5 días.',
    },
  ],
  ControlSanoRutina: [
    {
      title: 'Control anual',
      observations:
        'Paciente activo, condición corporal 5/9. Auscultación sin hallazgos.',
      diagnosis: 'Paciente sano',
      recommendations:
        'Mantener alimentación actual y plan de vacunación al día.',
    },
    {
      title: 'Control de peso',
      observations:
        'Aumento de peso respecto al control anterior. Condición corporal 6/9.',
      diagnosis: 'Sobrepeso leve',
      recommendations:
        'Reducir ración diaria un 10% y aumentar actividad física.',
    },
  ],
  UrgenciaEmergencia: [
    {
      title: 'Urgencia por ingesta de cuerpo extraño',
      observations:
        'Ingesta de juguete hace 2 h. Paciente estable, dolor abdominal leve.',
      diagnosis: 'Cuerpo extraño gástrico',
      recommendations:
        'Se induce emesis con éxito. Observación 24 h en casa, dieta blanda.',
    },
    {
      title: 'Urgencia por traumatismo',
      observations:
        'Caída desde altura. Laceración superficial en extremidad anterior.',
      diagnosis: 'Herida cortante superficial',
      recommendations:
        'Curación diaria, collar isabelino y antibiótico por 7 días.',
    },
  ],
  ProcedimientoQuirurgico: [
    {
      title: 'Esterilización',
      observations:
        'Procedimiento sin complicaciones bajo anestesia inhalatoria.',
      diagnosis: 'Ovariohisterectomía electiva',
      recommendations:
        'Collar isabelino 10 días, analgesia por 3 días, retiro de puntos en 10 días.',
    },
    {
      title: 'Profilaxis dental',
      observations:
        'Sarro grado III, gingivitis moderada. Se extrae una pieza dental.',
      diagnosis: 'Enfermedad periodontal grado II',
      recommendations:
        'Alimento blando por 5 días, cepillado dental 3 veces por semana.',
    },
  ],
  ExamenLaboratorio: [
    {
      title: 'Perfil bioquímico',
      observations: 'Toma de muestra en ayuno de 12 h para chequeo preventivo.',
      diagnosis: 'Valores dentro de rango de referencia',
      recommendations: 'Repetir perfil en 12 meses.',
    },
    {
      title: 'Hemograma y urianálisis',
      observations: 'Poliuria y polidipsia referidas por el tutor.',
      diagnosis: 'Infección urinaria baja',
      recommendations: 'Antibiótico por 14 días y urocultivo de control.',
    },
  ],
  Desparasitacion: [
    {
      title: 'Desparasitación interna',
      observations:
        'Desparasitación de rutina. Paciente sin signos digestivos.',
      diagnosis: 'Desparasitación preventiva',
      recommendations: 'Repetir en 3 meses.',
    },
    {
      title: 'Desparasitación interna y externa',
      observations: 'Se observan pulgas en la revisión.',
      diagnosis: 'Pulicosis',
      recommendations:
        'Antiparasitario externo mensual y limpieza del entorno.',
    },
  ],
};

const REASON_WEIGHTS: Record<MedicalReason, number> = {
  ConsultaGeneral: 30,
  ControlSanoRutina: 24,
  UrgenciaEmergencia: 8,
  ProcedimientoQuirurgico: 9,
  ExamenLaboratorio: 12,
  Desparasitacion: 17,
};

const VACCINES_BY_SPECIES: Partial<Record<Species, string[]>> = {
  Perro: ['Antirrábica', 'Óctuple (DHPPi+L)', 'KC (Tos de las perreras)'],
  Gato: ['Antirrábica', 'Triple Felina', 'Leucemia Felina (FeLV)'],
  Conejo: ['Mixomatosis'],
};

const VACCINE_DESCRIPTIONS: Record<string, string> = {
  Antirrábica:
    'Protección contra el virus de la rabia. Refuerzo anual obligatorio.',
  'Óctuple (DHPPi+L)':
    'Distemper, hepatitis, parvovirus, parainfluenza y leptospirosis.',
  'KC (Tos de las perreras)':
    'Bordetella bronchiseptica y parainfluenza canina.',
  'Triple Felina': 'Panleucopenia, rinotraqueítis y calicivirus felino.',
  'Leucemia Felina (FeLV)': 'Protección contra el virus de la leucemia felina.',
  Mixomatosis: 'Protección contra el virus de la mixomatosis en conejos.',
};

// --- Carga ------------------------------------------------------------------

async function wipe() {
  // Orden inverso a las FK; contact_messages no depende de nadie
  await prisma.$transaction([
    prisma.auditEntry.deleteMany(),
    prisma.reminderLog.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.vaccine.deleteMany(),
    prisma.medicalEvent.deleteMany(),
    prisma.petAlert.deleteMany(),
    prisma.pet.deleteMany(),
    prisma.tutor.deleteMany(),
    prisma.staffUser.deleteMany(),
    prisma.medicalProductCatalog.deleteMany(),
    prisma.reminderSettings.deleteMany(),
    prisma.contactMessage.deleteMany(),
    prisma.clinic.deleteMany(),
    prisma.platformAdmin.deleteMany(),
  ]);
  console.log('Base vaciada (--fresh).');
}

async function seedCatalog() {
  for (const product of CATALOG) {
    await prisma.medicalProductCatalog.upsert({
      where: { name: product.name },
      update: {},
      create: product,
    });
  }
}

async function seedPlatformAdmin() {
  await prisma.platformAdmin.upsert({
    where: { email: PLATFORM_ADMIN.email },
    update: {},
    create: {
      name: PLATFORM_ADMIN.name,
      email: PLATFORM_ADMIN.email,
      passwordHash: await bcrypt.hash(PLATFORM_ADMIN.password, 10),
    },
  });
}

async function seedClinic(platformAdminId: string) {
  const rand = mulberry32(20251124);
  const pick = <T>(items: readonly T[]) =>
    items[Math.floor(rand() * items.length)];
  const between = (min: number, max: number) =>
    Math.floor(rand() * (max - min + 1)) + min;
  const today = todayISO();
  const stamp = (iso: string) =>
    new Date(
      `${iso}T${String(between(12, 22)).padStart(2, '0')}:${String(between(0, 59)).padStart(2, '0')}:00.000Z`,
    );

  const clinic = await prisma.clinic.create({
    data: {
      name: CLINIC.name,
      rut: rutFromBody(CLINIC.rutBody),
      email: CLINIC.email,
      phone: CLINIC.phone,
      address: CLINIC.address,
      createdBy: platformAdminId,
      createdAt: stamp(addDays(today, -1400)),
    },
  });
  const clinicId = clinic.id;

  // Personal: la administradora usa la cuenta de la clínica del .env
  const passwordHash = await bcrypt.hash(STAFF_PASSWORD, 10);
  const clinicHash = await bcrypt.hash(CLINIC_ACCOUNT.password, 10);
  const staff = [];
  for (const [i, member] of STAFF.entries()) {
    staff.push(
      await prisma.staffUser.create({
        data: {
          clinicId,
          name: member.name,
          rut: rutFromBody(member.rutBody),
          email: i === 0 ? CLINIC_ACCOUNT.email : member.email,
          phone: member.phone,
          role: member.role,
          specialty: member.specialty,
          passwordHash: i === 0 ? clinicHash : passwordHash,
          createdAt: stamp(addDays(today, -member.daysAgo)),
        },
      }),
    );
  }
  const admin = staff[0];
  // Solo un veterinario puede firmar una ficha (regla de medical-events)
  const vets = staff.filter((s) => s.role === 'veterinario');
  const surgeon = vets[0];

  const audit: Prisma.AuditEntryCreateManyInput[] = [];

  // Tutores
  const tutors = [];
  for (const [i, name] of TUTOR_NAMES.entries()) {
    const body = String(between(9_000_000, 21_000_000));
    const createdAt = addDays(
      today,
      i >= TUTOR_NAMES.length - 3 ? -between(2, 25) : -between(240, 900),
    );
    const [first, last] = name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(' ');
    const tutor = await prisma.tutor.create({
      data: {
        clinicId,
        name,
        rut: rutFromBody(body),
        email: `${first}.${last}@correo.cl`,
        phone: `+56 9 ${between(1000, 9999)} ${between(1000, 9999)}`,
        address: `${pick(STREETS)} ${between(100, 4500)}, ${pick(COMMUNES)}`,
        createdAt: stamp(createdAt),
        updatedAt: stamp(addDays(createdAt, between(0, 15))),
      },
    });
    tutors.push({ ...tutor, createdDay: createdAt });
    audit.push({
      clinicId,
      at: tutor.createdAt,
      actorId: admin.id,
      action: 'crear',
      entity: 'tutor',
      entityId: tutor.id,
      entityLabel: tutor.name,
    });
  }

  // Mascotas, alertas, fichas y vacunas
  let eventCount = 0;
  let vaccineCount = 0;
  for (const [i, tpl] of PET_TEMPLATES.entries()) {
    const tutor = tutors[i < tutors.length ? i : between(0, tutors.length - 1)];
    const pet = await prisma.pet.create({
      data: {
        name: tpl.name,
        species: tpl.species,
        breed: tpl.breed,
        sex: rand() > 0.5 ? 'Macho' : 'Hembra',
        birthDate: day(addDays(today, -between(150, 4200))),
        reproductiveStatus: rand() > 0.4 ? 'Esterilizado' : 'Entero',
        tutorId: tutor.id,
        createdAt: tutor.createdAt,
        alerts: {
          create: (PET_ALERTS[tpl.name] ?? []).map((alert) => ({
            ...alert,
            createdAt: tutor.createdAt,
            createdBy: admin.id,
          })),
        },
      },
    });
    audit.push({
      clinicId,
      at: pet.createdAt,
      actorId: admin.id,
      action: 'crear',
      entity: 'mascota',
      entityId: pet.id,
      entityLabel: `${pet.name} (${pet.species})`,
    });

    // Las mascotas recién registradas tienen menos historial
    const historyDays = Math.min(360, daysBetween(tutor.createdDay, today));
    const count = Math.min(between(3, 9), 1 + Math.floor(historyDays / 20));
    for (let n = 0; n < count; n++) {
      const total = Object.values(REASON_WEIGHTS).reduce((a, b) => a + b, 0);
      let roll = rand() * total;
      let reason: MedicalReason = 'ConsultaGeneral';
      for (const [key, weight] of Object.entries(REASON_WEIGHTS)) {
        roll -= weight;
        if (roll <= 0) {
          reason = key as MedicalReason;
          break;
        }
      }
      const content = pick(EVENT_TEMPLATES[reason]);
      const date = addDays(today, -between(0, historyDays));
      const drift = 1 + (rand() - 0.5) * 0.12;
      // Algunas atenciones recientes dejan agendado un control (genera recordatorios)
      const followUp =
        daysBetween(date, today) <= 30 && rand() < 0.45
          ? addDays(date, between(10, 40))
          : null;
      const vet = reason === 'ProcedimientoQuirurgico' ? surgeon : pick(vets);
      const event = await prisma.medicalEvent.create({
        data: {
          petId: pet.id,
          vetId: vet.id,
          date: day(date),
          reason,
          ...content,
          weightKg: Math.max(
            0.01,
            Math.round(tpl.baseWeight * drift * 100) / 100,
          ),
          followUpDate: followUp ? day(followUp) : null,
          createdAt: stamp(date),
        },
      });
      eventCount++;
      audit.push({
        clinicId,
        at: event.createdAt,
        actorId: vet.id,
        action: 'crear',
        entity: 'ficha',
        entityId: event.id,
        entityLabel: `${event.title} · ${pet.name}`,
      });
    }

    for (const name of VACCINES_BY_SPECIES[tpl.species] ?? []) {
      const roll = rand();
      const description = VACCINE_DESCRIPTIONS[name] ?? '';
      if (roll < 0.15) {
        // Pendiente de aplicación, con fecha límite próxima
        await prisma.vaccine.create({
          data: {
            petId: pet.id,
            name,
            status: 'pendiente',
            expiresAt: day(addDays(today, between(3, 45))),
            description,
          },
        });
      } else {
        // Aplicada: queda vigente, próxima a vencer o vencida (refuerzo de 12 meses)
        let appliedAt: string;
        if (roll < 0.3) appliedAt = addDays(today, -between(370, 460));
        else if (roll < 0.5) appliedAt = addDays(today, -between(336, 360));
        else appliedAt = addDays(today, -between(10, 320));
        await prisma.vaccine.create({
          data: {
            petId: pet.id,
            name,
            status: 'aplicada',
            appliedAt: day(appliedAt),
            expiresAt: day(addMonths(appliedAt, 12)),
            description,
          },
        });
      }
      vaccineCount++;
    }
  }

  await prisma.auditEntry.createMany({ data: audit });
  await prisma.reminderSettings.create({
    data: { clinicId, daysBefore: 7, autoSend: false },
  });

  console.log(
    `${CLINIC.name}: ${staff.length} personas del equipo, ${tutors.length} tutores, ${PET_TEMPLATES.length} mascotas, ${eventCount} fichas, ${vaccineCount} vacunas.`,
  );
}

// --- Segunda clínica: Umbrella ------------------------------------------------
// Historial escrito a mano (no aleatorio): un tutor, una mascota y sus fichas.
// Si la cuenta ya existe (creada desde /admin) se usa su clínica; si no, se crea.

const UMBRELLA_VET = {
  name: 'Dr. Rodrigo Valenzuela',
  rutBody: '16482735',
  email: 'rodrigo.valenzuela@umbrella.cl',
  phone: '+56 9 7715 3324',
  specialty: 'Medicina general y traumatología',
};

const UMBRELLA_TUTOR = {
  name: 'Paula Aravena Cifuentes',
  rutBody: '13745902',
  email: 'paula.aravena.c@gmail.com',
  phone: '+56 9 8234 6671',
  address: 'Los Alerces 2847, Ñuñoa',
};

/** Fichas de Kira, de la más antigua a la más reciente (`daysAgo` relativo a hoy). */
const UMBRELLA_EVENTS: {
  daysAgo: number;
  time: string;
  reason: MedicalReason;
  title: string;
  observations: string;
  diagnosis: string;
  recommendations: string;
  weightKg: number;
  followUpInDays?: number;
}[] = [
  {
    daysAgo: 320,
    time: '14:20',
    reason: 'ControlSanoRutina',
    title: 'Control anual y vacunación',
    observations:
      'Primera atención en la clínica; trae carné con vacunas al día hasta el año pasado. Paciente alerta y dócil al manejo. T° 38,6 °C, FC 92 lpm, FR 24 rpm, TLLC 1 s, mucosas rosadas. Condición corporal 5/9. Auscultación cardiopulmonar sin hallazgos, palpación abdominal sin dolor, linfonodos normales. Sarro grado II en premolares y molares superiores, con leve halitosis. Se aplican vacuna óctuple y antirrábica sin reacciones inmediatas.',
    diagnosis: 'Paciente clínicamente sana. Enfermedad periodontal incipiente.',
    recommendations:
      'Mantener alimento actual (adulto raza grande), 320 g al día en dos raciones. Iniciar cepillado dental 3 veces por semana con pasta enzimática. Evaluar profilaxis dental durante el año. Antiparasitario interno cada 3 meses y externo mensual. Próximo control anual en 12 meses.',
    weightKg: 31.4,
  },
  {
    daysAgo: 214,
    time: '16:45',
    reason: 'ConsultaGeneral',
    title: 'Consulta por otitis en oído derecho',
    observations:
      'Tutora refiere sacudidas de cabeza y rascado del oído derecho hace 5 días, con mal olor. Estuvo en la playa dos semanas antes. Al examen: pabellón derecho eritematoso, conducto con abundante secreción café oscura y dolor a la palpación de la base de la oreja. Otoscopía: conducto inflamado, tímpano íntegro. Oído izquierdo sin alteraciones. Citología ótica: abundantes levaduras compatibles con Malassezia (más de 10 por campo), escasos cocos, sin bacilos.',
    diagnosis: 'Otitis externa unilateral derecha por Malassezia pachydermatis',
    recommendations:
      'Limpieza ótica con solución ceruminolítica cada 48 h. Gotas óticas con miconazol, polimixina B y prednisolona: 5 gotas en oído derecho cada 12 h por 10 días. Secar bien los oídos después de baños o piscina. No usar cotonitos. Control en 10 días con citología; volver antes si inclina la cabeza o pierde el equilibrio.',
    weightKg: 32.1,
  },
  {
    daysAgo: 150,
    time: '13:10',
    reason: 'ExamenLaboratorio',
    title: 'Exámenes prequirúrgicos para profilaxis dental',
    observations:
      'Paciente en ayuno de 10 h. Toma de muestra de vena cefálica sin incidentes. Hemograma: hematocrito 46 %, leucocitos 9.800/µL, plaquetas 285.000/µL, sin alteraciones morfológicas. Perfil bioquímico: creatinina 1,0 mg/dL, BUN 18 mg/dL, ALT 42 U/L, FA 68 U/L, proteínas totales 6,7 g/dL, albúmina 3,3 g/dL, glicemia 94 mg/dL. Tiempos de coagulación dentro de rango. Otitis previa resuelta, sin recidiva.',
    diagnosis:
      'Exámenes dentro de rangos de referencia. Riesgo anestésico ASA II.',
    recommendations:
      'Apta para anestesia general. Se agenda profilaxis dental. Ayuno de sólidos de 10 h y de agua de 2 h antes del procedimiento. Traer a las 9:00 con collar y correa.',
    weightKg: 32.6,
  },
  {
    daysAgo: 141,
    time: '18:30',
    reason: 'ProcedimientoQuirurgico',
    title: 'Profilaxis dental con extracción del premolar 108',
    observations:
      'Premedicación con dexmedetomidina 3 µg/kg y metadona 0,2 mg/kg IM; inducción con propofol a efecto; mantención con isoflurano. Monitoreo con ECG, pulsioximetría, capnografía y presión arterial, sin eventos. Destartraje con ultrasonido y pulido de todas las piezas. Sondaje periodontal: bolsas de 2 a 3 mm, sin movilidad. Cuarto premolar superior derecho (108) con fractura en laja y exposición pulpar: extracción quirúrgica con colgajo y sutura con monofilamento absorbible 4-0. Bloqueo infraorbitario con bupivacaína. Tiempo anestésico 70 min, recuperación tranquila.',
    diagnosis:
      'Enfermedad periodontal grado II. Fractura complicada de corona de la pieza 108.',
    recommendations:
      'Alimento húmedo o pellet remojado por 7 días. Meloxicam 0,1 mg/kg cada 24 h por 4 días, con comida. Amoxicilina con ácido clavulánico 20 mg/kg cada 12 h por 7 días. Sin juguetes duros ni huesos por 2 semanas. Los puntos se reabsorben solos. Retomar el cepillado desde el día 14. Control en 10 días.',
    weightKg: 32.4,
  },
  {
    daysAgo: 62,
    time: '23:15',
    reason: 'UrgenciaEmergencia',
    title: 'Urgencia por vómitos y diarrea con sangre',
    observations:
      'Ingresa de urgencia. Tutora refiere 6 vómitos y diarrea líquida con sangre fresca desde la madrugada; el día anterior comió restos de asado con huesos. Decaída, deshidratación estimada 7 %, T° 39,4 °C, FC 128 lpm, TLLC 2,5 s, dolor abdominal craneal moderado. Test rápido de parvovirus negativo. Radiografía abdominal: sin cuerpo extraño obstructivo, contenido mineralizado fino en colon. Hematocrito 56 %, proteínas totales 6,4 g/dL, lactato 2,9 mmol/L. Se hospitaliza 8 h con Ringer lactato, maropitant 1 mg/kg EV y omeprazol 1 mg/kg EV. Al alta: hidratada, sin vómitos, tolera agua.',
    diagnosis:
      'Gastroenteritis hemorrágica aguda por indiscreción alimentaria (ingesta de huesos)',
    recommendations:
      'Dieta gastrointestinal en 4 raciones pequeñas por 5 días y transición gradual al alimento habitual. Maropitant 2 mg/kg oral cada 24 h por 3 días. Omeprazol 1 mg/kg cada 24 h en ayunas por 7 días. Probiótico por 7 días. No dar huesos ni restos de comida. Volver de inmediato si reaparecen vómitos, sangre en las heces o decaimiento. Control en 7 días.',
    weightKg: 31.0,
  },
  {
    daysAgo: 55,
    time: '15:40',
    reason: 'ConsultaGeneral',
    title: 'Control post gastroenteritis',
    observations:
      'Sin vómitos desde el alta. Heces formadas desde el tercer día, sin sangre. Apetito normal y ánimo recuperado. Hidratación normal, T° 38,5 °C, FC 96 lpm, abdomen blando y sin dolor. Hematocrito de control 47 %. Completó el tratamiento indicado sin problemas.',
    diagnosis: 'Gastroenteritis hemorrágica resuelta. Alta médica.',
    recommendations:
      'Volver al alimento habitual en su ración normal. Mantener la restricción de huesos y restos de comida. Desparasitación interna pendiente: realizar en una semana.',
    weightKg: 31.5,
  },
  {
    daysAgo: 9,
    time: '17:05',
    reason: 'ConsultaGeneral',
    title: 'Consulta por cojera de miembro posterior izquierdo',
    observations:
      'Tutora nota hace 3 semanas rigidez al levantarse y cojera del posterior izquierdo después de paseos largos; le cuesta subir al auto. Claudicación grado II/V en frío que mejora al calentar. Dolor a la extensión de ambas caderas, mayor a izquierda, con leve atrofia de la musculatura glútea. Signo de cajón y compresión tibial negativos, rótulas estables, sin déficit neurológico. Radiografía ventrodorsal de pelvis bajo sedación: subluxación coxofemoral bilateral, aplanamiento de la cabeza femoral izquierda y osteofitos en el borde acetabular.',
    diagnosis:
      'Displasia de cadera bilateral con osteoartritis secundaria, mayor a izquierda',
    recommendations:
      'Carprofeno 2,2 mg/kg cada 12 h por 10 días, con comida; suspender y avisar si hay vómitos o heces oscuras. Condroprotector diario (glucosamina, condroitín y omega 3) de forma permanente. Bajar a 30 kg: reducir la ración a 290 g al día. Paseos cortos con correa, 15 a 20 min dos veces al día; evitar saltos, escaleras y juegos bruscos. Piso antideslizante y cama acolchada. Control en 3 semanas para evaluar respuesta y derivación a fisioterapia.',
    weightKg: 32.8,
    followUpInDays: 21,
  },
];

async function seedUmbrella(platformAdminId: string) {
  const today = todayISO();
  const at = (iso: string, time = '15:00') =>
    new Date(`${iso}T${time}:00.000Z`);

  let admin = await prisma.staffUser.findUnique({
    where: { email: CLINIC2_ACCOUNT.email },
  });
  if (admin) {
    const hasData = await prisma.tutor.count({
      where: { clinicId: admin.clinicId },
    });
    if (hasData > 0) {
      console.log(
        'La clínica Umbrella ya tenía datos (no se agregan otra vez).',
      );
      return;
    }
  }

  await prisma.$transaction(async (tx) => {
    if (!admin) {
      const clinic = await tx.clinic.create({
        data: {
          name: 'Clínica Umbrella Corporation',
          rut: rutFromBody('77123456'),
          email: 'contacto@umbrella.cl',
          phone: '+56 2 2987 4410',
          address: 'Av. Irarrázaval 3150, Ñuñoa',
          createdBy: platformAdminId,
          createdAt: at(addDays(today, -400)),
        },
      });
      admin = await tx.staffUser.create({
        data: {
          clinicId: clinic.id,
          name: 'Administración Umbrella',
          rut: rutFromBody('14326587'),
          email: CLINIC2_ACCOUNT.email,
          role: 'administrador',
          specialty: 'Administración',
          passwordHash: await bcrypt.hash(CLINIC2_ACCOUNT.password, 10),
          createdAt: at(addDays(today, -400)),
        },
      });
    }
    const clinicId = admin.clinicId;
    const audit: Prisma.AuditEntryCreateManyInput[] = [];

    // La cuenta de la clínica es administradora: las fichas las firma un veterinario
    const vet = await tx.staffUser.create({
      data: {
        clinicId,
        name: UMBRELLA_VET.name,
        rut: rutFromBody(UMBRELLA_VET.rutBody),
        email: UMBRELLA_VET.email,
        phone: UMBRELLA_VET.phone,
        role: 'veterinario',
        specialty: UMBRELLA_VET.specialty,
        passwordHash: await bcrypt.hash(CLINIC2_ACCOUNT.password, 10),
        createdAt: at(addDays(today, -380)),
      },
    });
    audit.push({
      clinicId,
      at: vet.createdAt,
      actorId: admin.id,
      action: 'crear',
      entity: 'equipo',
      entityId: vet.id,
      entityLabel: vet.name,
    });

    const registeredAt = at(addDays(today, -320), '14:05');
    const tutor = await tx.tutor.create({
      data: {
        clinicId,
        name: UMBRELLA_TUTOR.name,
        rut: rutFromBody(UMBRELLA_TUTOR.rutBody),
        email: UMBRELLA_TUTOR.email,
        phone: UMBRELLA_TUTOR.phone,
        address: UMBRELLA_TUTOR.address,
        createdAt: registeredAt,
        updatedAt: registeredAt,
      },
    });
    audit.push({
      clinicId,
      at: registeredAt,
      actorId: admin.id,
      action: 'crear',
      entity: 'tutor',
      entityId: tutor.id,
      entityLabel: tutor.name,
    });

    const pet = await tx.pet.create({
      data: {
        tutorId: tutor.id,
        name: 'Kira',
        species: 'Perro',
        breed: 'Pastor Alemán',
        sex: 'Hembra',
        birthDate: day(addDays(today, -2290)),
        reproductiveStatus: 'Esterilizado',
        createdAt: registeredAt,
        alerts: {
          create: [
            {
              type: 'condicion',
              description: 'Displasia de cadera bilateral: manejo cuidadoso',
              createdAt: at(addDays(today, -9), '17:10'),
              createdBy: vet.id,
            },
            {
              type: 'otra',
              description:
                'Antecedente de gastroenteritis por ingesta de huesos',
              createdAt: at(addDays(today, -62), '23:20'),
              createdBy: vet.id,
            },
          ],
        },
      },
    });
    audit.push({
      clinicId,
      at: registeredAt,
      actorId: admin.id,
      action: 'crear',
      entity: 'mascota',
      entityId: pet.id,
      entityLabel: `${pet.name} (${pet.species})`,
    });

    for (const {
      daysAgo,
      time,
      followUpInDays,
      ...content
    } of UMBRELLA_EVENTS) {
      const date = addDays(today, -daysAgo);
      const event = await tx.medicalEvent.create({
        data: {
          petId: pet.id,
          vetId: vet.id,
          date: day(date),
          ...content,
          followUpDate: followUpInDays
            ? day(addDays(date, followUpInDays))
            : null,
          createdAt: at(date, time),
        },
      });
      audit.push({
        clinicId,
        at: event.createdAt,
        actorId: vet.id,
        action: 'crear',
        entity: 'ficha',
        entityId: event.id,
        entityLabel: `${event.title} · ${pet.name}`,
      });
    }

    // Vacunas del primer control (vencen en ~45 días) y una pendiente
    const vaccinatedAt = addDays(today, -320);
    for (const name of ['Óctuple (DHPPi+L)', 'Antirrábica']) {
      await tx.vaccine.create({
        data: {
          petId: pet.id,
          name,
          status: 'aplicada',
          appliedAt: day(vaccinatedAt),
          expiresAt: day(addMonths(vaccinatedAt, 12)),
          description: VACCINE_DESCRIPTIONS[name],
          createdAt: at(vaccinatedAt, '14:30'),
        },
      });
    }
    await tx.vaccine.create({
      data: {
        petId: pet.id,
        name: 'KC (Tos de las perreras)',
        status: 'pendiente',
        expiresAt: day(addDays(today, 20)),
        description: VACCINE_DESCRIPTIONS['KC (Tos de las perreras)'],
      },
    });

    await tx.auditEntry.createMany({ data: audit });
    await tx.reminderSettings.upsert({
      where: { clinicId },
      update: {},
      create: { clinicId, daysBefore: 7, autoSend: false },
    });
  });

  console.log(
    `Umbrella: 1 veterinario (${UMBRELLA_VET.email}), 1 tutor, 1 mascota (Kira), ${UMBRELLA_EVENTS.length} fichas, 3 vacunas.`,
  );
}

async function main() {
  if (FRESH) await wipe();

  await seedCatalog();
  await seedPlatformAdmin();
  const platformAdmin = await prisma.platformAdmin.findUniqueOrThrow({
    where: { email: PLATFORM_ADMIN.email },
  });

  const seeded = await prisma.clinic.findUnique({
    where: { rut: rutFromBody(CLINIC.rutBody) },
  });
  if (seeded) {
    console.log(
      'El seed ya estaba cargado (usa pnpm db:seed:fresh para recargarlo).',
    );
  } else {
    await seedClinic(platformAdmin.id);
  }
  await seedUmbrella(platformAdmin.id);

  console.log(`Catálogo: ${CATALOG.length} productos.`);
  console.log(`Plataforma (/admin/login): ${PLATFORM_ADMIN.email}`);
  console.log(`Cuenta de la clínica (/login): ${CLINIC_ACCOUNT.email}`);
  console.log(`Cuenta de Umbrella (/login): ${CLINIC2_ACCOUNT.email}`);
  console.log(
    `Veterinarios: ${STAFF.slice(1)
      .map((s) => s.email)
      .join(', ')} / ${STAFF_PASSWORD}`,
  );
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
