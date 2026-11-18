// Pone la misma contraseña a las 7 cuentas de demostración (seed-demo.ts).
// Uso: DEMO_PASSWORD=... npx ts-node prisma/set-demo-passwords.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) as any });

async function main() {
  const pw = process.env.DEMO_PASSWORD;
  if (!pw) throw new Error('Falta DEMO_PASSWORD');
  const passwordHash = await bcrypt.hash(pw, 10);
  const a = await prisma.platformAdmin.updateMany({ where: { email: 'admin@kronopet.cl' }, data: { passwordHash } });
  const s = await prisma.staffUser.updateMany({ where: { email: { endsWith: '@patitasdelsur.cl' } }, data: { passwordHash } });
  const t = await prisma.tutor.updateMany({
    where: { email: { in: ['carolina.munoz@correo.cl', 'daniela.herrera@correo.cl', 'felipe.sandoval@correo.cl'] } },
    data: { passwordHash },
  });
  console.log(`Contraseñas actualizadas: plataforma ${a.count}, personal ${s.count}, tutores ${t.count}`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); await pool.end(); });
