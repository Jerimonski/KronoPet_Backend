// Datos de demostración para producción (Railway). Uso (con DATABASE_URL apuntando a la base):
//   npx ts-node prisma/seed-demo.ts
// Crea: 1 cuenta de plataforma, 1 clínica (administrador + 2 veterinarios), 3 tutores con
// contraseña (cada uno con 2 mascotas de distinta especie), 3 fichas por mascota, vacunas,
// alertas, auditoría y catálogo. Las contraseñas se generan al azar y se imprimen una sola vez.
// Es idempotente: si la clínica ya existe, no hace nada.
import 'dotenv/config';
import { randomBytes } from 'crypto';
import { MedicalReason, Prisma, PrismaClient, Species } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) as any });

const password = () =>
  'Kp-' + randomBytes(9).toString('base64').replace(/[+/=]/g, 'x').slice(0, 10);

function dv(body: string): string {
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const r = 11 - (sum % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}
const rut = (body: string) =>
  `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv(body)}`;

const today = new Date(
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(
    new Date(),
  ) + 'T00:00:00.000Z',
);
const ago = (days: number) => {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
};
const stamp = (days: number) => {
  const d = ago(days);
  d.setUTCHours(15, 30);
  return d;
};

const CATALOG = [
  ['Vacuna Óctuple Canina', 'Perro', true, 365],
  ['Vacuna Antirrábica Canina', 'Perro', true, 365],
  ['Vacuna KC (Tos de las perreras)', 'Perro', false, 365],
  ['Antiparasitario Interno Canino', 'Perro', true, 90],
  ['Antiparasitario Externo Canino', 'Perro', true, 30],
  ['Vacuna Triple Felina', 'Gato', true, 365],
  ['Vacuna Antirrábica Felina', 'Gato', true, 365],
  ['Vacuna Leucemia Felina', 'Gato', false, 365],
  ['Antiparasitario Interno Felino', 'Gato', true, 90],
  ['Antiparasitario Externo Felino', 'Gato', true, 30],
] as const;

type Ev = {
  daysAgo: number;
  reason: MedicalReason;
  title: string;
  observations: string;
  diagnosis: string;
  recommendations: string;
  weightKg: number;
  followUpInDays?: number;
  vet: 0 | 1;
};
type Vac = { name: string; appliedDaysAgo?: number; pendingInDays?: number };
type PetT = {
  name: string;
  species: Species;
  breed: string;
  sex: 'Macho' | 'Hembra';
  birthDaysAgo: number;
  sterilized: boolean;
  alerts: { type: 'alergia' | 'condicion' | 'comportamiento' | 'otra'; description: string }[];
  vaccines: Vac[];
  events: Ev[];
};

const TUTORS: {
  name: string;
  rutBody: string;
  email: string;
  phone: string;
  address: string;
  pets: PetT[];
}[] = [
  {
    name: 'Carolina Muñoz Vega',
    rutBody: '15872346',
    email: 'carolina.munoz@correo.cl',
    phone: '+56 9 6123 4455',
    address: 'Av. Los Leones 1420, Providencia',
    pets: [
      {
        name: 'Max',
        species: 'Perro',
        breed: 'Labrador Retriever',
        sex: 'Macho',
        birthDaysAgo: 1900,
        sterilized: true,
        alerts: [{ type: 'alergia', description: 'Alergia alimentaria al pollo' }],
        vaccines: [
          { name: 'Antirrábica', appliedDaysAgo: 120 },
          { name: 'Óctuple (DHPPi+L)', appliedDaysAgo: 350 },
          { name: 'KC (Tos de las perreras)', pendingInDays: 15 },
        ],
        events: [
          {
            daysAgo: 300, reason: 'ControlSanoRutina', vet: 0, weightKg: 31.2,
            title: 'Control anual y vacunación',
            observations: 'Paciente alerta, activo y dócil. T° 38,5 °C, FC 96 lpm, FR 22 rpm, mucosas rosadas, TLLC 1 s. Condición corporal 6/9. Auscultación sin hallazgos, sarro grado I. Se aplican vacunas óctuple y antirrábica sin reacciones.',
            diagnosis: 'Paciente sano. Sobrepeso leve.',
            recommendations: 'Reducir ración en 10 % y aumentar paseos. Cepillado dental semanal. Antiparasitario interno cada 3 meses. Control en 12 meses.',
          },
          {
            daysAgo: 160, reason: 'ConsultaGeneral', vet: 1, weightKg: 31.8,
            title: 'Picazón y enrojecimiento cutáneo',
            observations: 'Tutora refiere rascado intenso en abdomen y patas desde hace 10 días, tras cambiar de alimento. Examen: eritema ventral y interdigital, sin pústulas. Raspado cutáneo negativo a ácaros.',
            diagnosis: 'Dermatitis alérgica probable de origen alimentario.',
            recommendations: 'Volver a la dieta anterior y luego iniciar dieta de eliminación por 8 semanas. Oclacitinib 0,4 mg/kg cada 12 h por 7 días. Control en 3 semanas.',
            followUpInDays: 21,
          },
          {
            daysAgo: 25, reason: 'Desparasitacion', vet: 0, weightKg: 30.4,
            title: 'Desparasitación interna y externa',
            observations: 'Paciente con evolución favorable de la dermatitis tras dieta de eliminación. Sin parásitos externos visibles. Se administra antiparasitario interno de amplio espectro por peso.',
            diagnosis: 'Desparasitación de rutina. Dermatitis controlada.',
            recommendations: 'Mantener dieta hipoalergénica. Antiparasitario externo mensual. Repetir desparasitación interna en 3 meses.',
          },
        ],
      },
      {
        name: 'Nina',
        species: 'Gato',
        breed: 'Angora',
        sex: 'Hembra',
        birthDaysAgo: 1100,
        sterilized: true,
        alerts: [{ type: 'condicion', description: 'Enfermedad renal crónica estadio 1' }],
        vaccines: [
          { name: 'Antirrábica', appliedDaysAgo: 200 },
          { name: 'Triple Felina', appliedDaysAgo: 200 },
          { name: 'Leucemia Felina (FeLV)', appliedDaysAgo: 380 },
        ],
        events: [
          {
            daysAgo: 270, reason: 'ControlSanoRutina', vet: 1, weightKg: 4.1,
            title: 'Control sano y vacunación felina',
            observations: 'Gata activa, pelaje en buen estado. T° 38,7 °C, FC 180 lpm. Palpación abdominal sin dolor. Condición corporal 5/9. Se aplican triple felina y antirrábica.',
            diagnosis: 'Paciente clínicamente sana.',
            recommendations: 'Alimento adulto esterilizado, 55 g al día. Agua fresca siempre disponible. Control en 12 meses.',
          },
          {
            daysAgo: 110, reason: 'ExamenLaboratorio', vet: 0, weightKg: 4.0,
            title: 'Perfil renal por aumento de ingesta de agua',
            observations: 'Tutora nota mayor consumo de agua. Hemograma normal. Creatinina 1,5 mg/dL, BUN 28 mg/dL, SDMA 15 µg/dL. Densidad urinaria 1.030, sin proteinuria.',
            diagnosis: 'Enfermedad renal crónica estadio 1 (IRIS), sin proteinuria.',
            recommendations: 'Dieta renal de apoyo, fuentes de agua múltiples y control de presión arterial. Repetir perfil renal en 3 meses.',
            followUpInDays: 90,
          },
          {
            daysAgo: 20, reason: 'ConsultaGeneral', vet: 0, weightKg: 3.9,
            title: 'Control de enfermedad renal',
            observations: 'Buen apetito y actividad. Presión arterial 135 mmHg. Creatinina 1,4 mg/dL, estable. Peso con leve baja de 100 g.',
            diagnosis: 'Enfermedad renal crónica estable.',
            recommendations: 'Continuar dieta renal. Próximo control con exámenes en 3 meses.',
            followUpInDays: 70,
          },
        ],
      },
    ],
  },
  {
    name: 'Felipe Sandoval Pino',
    rutBody: '17345298',
    email: 'felipe.sandoval@correo.cl',
    phone: '+56 9 7344 1290',
    address: 'Calle Los Olmos 845, Ñuñoa',
    pets: [
      {
        name: 'Bruno',
        species: 'Perro',
        breed: 'Schnauzer miniatura',
        sex: 'Macho',
        birthDaysAgo: 2500,
        sterilized: false,
        alerts: [{ type: 'comportamiento', description: 'Nervioso en la consulta, usar bozal' }],
        vaccines: [
          { name: 'Antirrábica', appliedDaysAgo: 90 },
          { name: 'Óctuple (DHPPi+L)', appliedDaysAgo: 90 },
          { name: 'KC (Tos de las perreras)', appliedDaysAgo: 370 },
        ],
        events: [
          {
            daysAgo: 240, reason: 'ProcedimientoQuirurgico', vet: 1, weightKg: 8.2,
            title: 'Profilaxis dental con extracción',
            observations: 'Anestesia general con monitoreo completo sin eventos. Destartraje y pulido. Extracción de dos incisivos con movilidad grado III. Recuperación tranquila en 40 minutos.',
            diagnosis: 'Enfermedad periodontal grado III.',
            recommendations: 'Dieta blanda 48 h. Amoxicilina con ácido clavulánico cada 12 h por 7 días. Meloxicam 3 días. Control en 10 días.',
            followUpInDays: 10,
          },
          {
            daysAgo: 95, reason: 'UrgenciaEmergencia', vet: 0, weightKg: 8.4,
            title: 'Vómitos y diarrea aguda',
            observations: 'Vómitos repetidos y diarrea desde la noche anterior tras ingerir restos de comida. Deshidratación leve 5 %, abdomen sensible. Radiografía sin cuerpo extraño.',
            diagnosis: 'Gastroenteritis aguda inespecífica.',
            recommendations: 'Fluidoterapia subcutánea, ondansetrón y omeprazol por 5 días, dieta gastrointestinal 5 días. Volver si hay sangre o decaimiento.',
            followUpInDays: 7,
          },
          {
            daysAgo: 12, reason: 'ControlSanoRutina', vet: 1, weightKg: 8.0,
            title: 'Control posterior a gastroenteritis',
            observations: 'Recuperación completa, apetito normal y deposiciones formadas. Peso estable. Sin dolor abdominal.',
            diagnosis: 'Paciente sano, alta médica.',
            recommendations: 'Retomar alimento habitual de forma gradual. Evitar comida humana. Control anual.',
          },
        ],
      },
      {
        name: 'Coco',
        species: 'Conejo',
        breed: 'Cabeza de león',
        sex: 'Macho',
        birthDaysAgo: 700,
        sterilized: true,
        alerts: [{ type: 'otra', description: 'Maloclusión dental: control cada 6 meses' }],
        vaccines: [{ name: 'Mixomatosis', appliedDaysAgo: 150 }],
        events: [
          {
            daysAgo: 280, reason: 'ControlSanoRutina', vet: 1, weightKg: 1.6,
            title: 'Primer control del conejo',
            observations: 'Conejo alerta, pelaje denso sin alopecias. Dentadura con leve crecimiento de incisivos. Heces normales. Dieta con heno y pellet.',
            diagnosis: 'Paciente sano con tendencia a maloclusión.',
            recommendations: 'Heno ilimitado, verduras de hoja, pellet limitado. Control dental cada 6 meses.',
          },
          {
            daysAgo: 130, reason: 'ConsultaGeneral', vet: 0, weightKg: 1.5,
            title: 'Disminución del apetito',
            observations: 'Come menos desde hace 2 días, heces pequeñas. Abdomen con gas leve, ruidos intestinales disminuidos. Incisivos largos.',
            diagnosis: 'Estasis gastrointestinal leve asociada a maloclusión.',
            recommendations: 'Metoclopramida y simeticona 3 días, alimentación asistida con papilla, recorte dental. Control en 48 h.',
            followUpInDays: 3,
          },
          {
            daysAgo: 30, reason: 'Desparasitacion', vet: 1, weightKg: 1.7,
            title: 'Desparasitación y control dental',
            observations: 'Buen apetito y heces normales. Incisivos con longitud adecuada. Se administra fenbendazol por peso.',
            diagnosis: 'Paciente sano. Desparasitación de rutina.',
            recommendations: 'Repetir desparasitación en 6 meses. Control dental en 3 meses.',
            followUpInDays: 90,
          },
        ],
      },
    ],
  },
  {
    name: 'Daniela Herrera Lagos',
    rutBody: '18456723',
    email: 'daniela.herrera@correo.cl',
    phone: '+56 9 5432 8871',
    address: 'Pasaje Las Acacias 312, La Florida',
    pets: [
      {
        name: 'Pelusa',
        species: 'Gato',
        breed: 'Mestizo',
        sex: 'Hembra',
        birthDaysAgo: 420,
        sterilized: false,
        alerts: [],
        vaccines: [
          { name: 'Antirrábica', appliedDaysAgo: 60 },
          { name: 'Triple Felina', appliedDaysAgo: 60 },
          { name: 'Leucemia Felina (FeLV)', pendingInDays: 20 },
        ],
        events: [
          {
            daysAgo: 200, reason: 'ControlSanoRutina', vet: 0, weightKg: 2.8,
            title: 'Control de gatita adoptada',
            observations: 'Gata joven, activa y juguetona. T° 38,6 °C. Pulgas leves en el pelaje. Sin secreciones oculares ni nasales.',
            diagnosis: 'Paciente sana con ectoparasitosis leve.',
            recommendations: 'Antiparasitario externo e interno hoy. Planificar esterilización a los 8 meses.',
          },
          {
            daysAgo: 100, reason: 'ProcedimientoQuirurgico', vet: 1, weightKg: 3.3,
            title: 'Ovariohisterectomía',
            observations: 'Ayuno de 10 h, anestesia general balanceada sin eventos. Cirugía por línea media, sutura intradérmica. Recuperación sin complicaciones.',
            diagnosis: 'Esterilización electiva.',
            recommendations: 'Collar isabelino 10 días, meloxicam 3 días, revisar la herida a diario. Retiro de controles en 10 días.',
            followUpInDays: 10,
          },
          {
            daysAgo: 15, reason: 'ExamenLaboratorio', vet: 0, weightKg: 3.6,
            title: 'Test de retrovirus felinos',
            observations: 'Toma de muestra para test rápido FIV/FeLV previo a vacuna de leucemia. Resultado: negativo a ambos. Hemograma sin alteraciones.',
            diagnosis: 'Negativa a FIV y FeLV.',
            recommendations: 'Aplicar vacuna de leucemia felina con refuerzo a las 3-4 semanas. Mantener dentro del hogar.',
            followUpInDays: 20,
          },
        ],
      },
      {
        name: 'Kiwi',
        species: 'Ave',
        breed: 'Cacatúa ninfa',
        sex: 'Macho',
        birthDaysAgo: 900,
        sterilized: false,
        alerts: [{ type: 'condicion', description: 'Tendencia a picaje de plumas por estrés' }],
        vaccines: [],
        events: [
          {
            daysAgo: 260, reason: 'ControlSanoRutina', vet: 1, weightKg: 0.09,
            title: 'Control sano del ave',
            observations: 'Ave alerta, plumaje brillante, ojos limpios, narinas sin secreción. Quilla con buena musculatura. Dieta de semillas y verduras.',
            diagnosis: 'Paciente sano.',
            recommendations: 'Reducir semillas, aumentar pellet y verduras. Luz natural y 10 h de sueño. Control anual.',
          },
          {
            daysAgo: 140, reason: 'ConsultaGeneral', vet: 0, weightKg: 0.088,
            title: 'Arrancamiento de plumas del pecho',
            observations: 'Tutora refiere picaje desde hace 3 semanas tras mudanza. Piel del pecho enrojecida sin lesiones infecciosas. Peso estable.',
            diagnosis: 'Picaje de origen conductual por estrés.',
            recommendations: 'Enriquecimiento ambiental, juguetes para forrajear y rutina estable. Evitar el collar protector salvo lesión. Control en 4 semanas.',
            followUpInDays: 30,
          },
          {
            daysAgo: 40, reason: 'Desparasitacion', vet: 1, weightKg: 0.092,
            title: 'Control de picaje y desparasitación',
            observations: 'Plumaje del pecho en recuperación. Examen coprológico sin parásitos. Peso 92 g.',
            diagnosis: 'Picaje en mejoría. Sin parasitosis.',
            recommendations: 'Mantener enriquecimiento. Coprológico anual. Alta si no hay recaídas en 2 meses.',
          },
        ],
      },
    ],
  },
];

async function main() {
  const clinicRut = rut('77123456');
  if (await prisma.clinic.findUnique({ where: { rut: clinicRut } })) {
    console.log('La clínica de demostración ya existe: no se hace nada.');
    return;
  }

  for (const [name, targetSpecies, isBase, daysToReinforce] of CATALOG) {
    await prisma.medicalProductCatalog.upsert({
      where: { name },
      update: {},
      create: { name, targetSpecies, isBase, requiresReinforcement: true, daysToReinforce },
    });
  }

  const creds: { rol: string; nombre: string; email: string; password: string; ruta: string }[] = [];
  const mk = async (rol: string, nombre: string, email: string, ruta: string) => {
    const pw = password();
    creds.push({ rol, nombre, email, password: pw, ruta });
    return bcrypt.hash(pw, 10);
  };

  const platformHash = await mk('Plataforma', 'Administración KronoPet', 'admin@kronopet.cl', '/admin/login');
  const platform = await prisma.platformAdmin.upsert({
    where: { email: 'admin@kronopet.cl' },
    update: { passwordHash: platformHash },
    create: { name: 'Administración KronoPet', email: 'admin@kronopet.cl', passwordHash: platformHash },
  });

  const clinic = await prisma.clinic.create({
    data: {
      name: 'Clínica Veterinaria Patitas del Sur',
      rut: clinicRut,
      email: 'contacto@patitasdelsur.cl',
      phone: '+56 2 2987 6543',
      address: 'Av. Apoquindo 4500, Las Condes',
      createdBy: platform.id,
      createdAt: stamp(400),
    },
  });
  const clinicId = clinic.id;

  const staffDefs = [
    { name: 'Marcela Ibáñez Torres', body: '14876532', email: 'marcela.ibanez@patitasdelsur.cl', role: 'administrador', specialty: null, phone: '+56 9 8765 4321' },
    { name: 'Dra. Francisca Núñez Rojas', body: '16789234', email: 'francisca.nunez@patitasdelsur.cl', role: 'veterinario', specialty: 'Medicina interna y felina', phone: '+56 9 7654 3210' },
    { name: 'Dr. Andrés Contreras Silva', body: '15234987', email: 'andres.contreras@patitasdelsur.cl', role: 'veterinario', specialty: 'Cirugía y animales exóticos', phone: '+56 9 6543 2109' },
  ] as const;
  const staff = [];
  for (const s of staffDefs) {
    const hash = await mk(
      s.role === 'administrador' ? 'Clínica (administrador)' : 'Clínica (veterinario)',
      s.name, s.email, '/login',
    );
    staff.push(
      await prisma.staffUser.create({
        data: {
          clinicId, name: s.name, rut: rut(s.body), email: s.email, phone: s.phone,
          role: s.role, specialty: s.specialty, passwordHash: hash, createdAt: stamp(390),
        },
      }),
    );
  }
  const [admin, ...vets] = staff;

  const audit: Prisma.AuditEntryCreateManyInput[] = [];
  let events = 0;
  let pets = 0;
  let vaccines = 0;

  for (const [ti, t] of TUTORS.entries()) {
    const hash = await mk('Tutor', t.name, t.email, '/auth/login (app móvil)');
    const tutor = await prisma.tutor.create({
      data: {
        clinicId, name: t.name, rut: rut(t.rutBody), email: t.email, phone: t.phone,
        address: t.address, passwordHash: hash, createdAt: stamp(330 - ti * 20),
      },
    });
    audit.push({ clinicId, at: tutor.createdAt, actorId: admin.id, action: 'crear', entity: 'tutor', entityId: tutor.id, entityLabel: tutor.name });

    for (const p of t.pets) {
      const pet = await prisma.pet.create({
        data: {
          tutorId: tutor.id, name: p.name, species: p.species, breed: p.breed, sex: p.sex,
          birthDate: ago(p.birthDaysAgo),
          reproductiveStatus: p.sterilized ? 'Esterilizado' : 'Entero',
          createdAt: tutor.createdAt,
          alerts: { create: p.alerts.map((a) => ({ ...a, createdAt: tutor.createdAt, createdBy: admin.id })) },
        },
      });
      pets++;
      audit.push({ clinicId, at: pet.createdAt, actorId: admin.id, action: 'crear', entity: 'mascota', entityId: pet.id, entityLabel: `${pet.name} (${pet.species})` });

      for (const e of p.events) {
        const vet = vets[e.vet];
        const ev = await prisma.medicalEvent.create({
          data: {
            petId: pet.id, vetId: vet.id, date: ago(e.daysAgo), reason: e.reason, title: e.title,
            observations: e.observations, diagnosis: e.diagnosis, recommendations: e.recommendations,
            weightKg: e.weightKg,
            followUpDate: e.followUpInDays ? ago(e.daysAgo - e.followUpInDays) : null,
            createdAt: stamp(e.daysAgo),
          },
        });
        events++;
        audit.push({ clinicId, at: ev.createdAt, actorId: vet.id, action: 'crear', entity: 'ficha', entityId: ev.id, entityLabel: `${ev.title} · ${pet.name}` });
      }

      for (const v of p.vaccines) {
        await prisma.vaccine.create({
          data: v.pendingInDays !== undefined
            ? { petId: pet.id, name: v.name, status: 'pendiente', expiresAt: ago(-v.pendingInDays), description: 'Pendiente de aplicación.' }
            : {
                petId: pet.id, name: v.name, status: 'aplicada', appliedAt: ago(v.appliedDaysAgo!),
                expiresAt: ago(v.appliedDaysAgo! - 365), description: 'Refuerzo anual.',
              },
        });
        vaccines++;
      }
    }
  }

  await prisma.auditEntry.createMany({ data: audit });
  await prisma.reminderSettings.create({ data: { clinicId, daysBefore: 7, autoSend: false } });

  console.log(`Listo: 1 clínica, ${staff.length} del equipo, ${TUTORS.length} tutores, ${pets} mascotas, ${events} fichas, ${vaccines} vacunas.\n`);
  console.log('CREDENCIALES (se muestran solo ahora):');
  console.log(JSON.stringify(creds, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
