import 'dotenv/config';
import { execSync } from 'child_process';

// Deja la base de pruebas (TEST_DATABASE_URL) vacía, migrada y con el seed.
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error('Falta TEST_DATABASE_URL en el .env');
}

const env = { ...process.env, DATABASE_URL: url };
execSync('prisma migrate reset --force', { stdio: 'inherit', env });
execSync('prisma db seed', { stdio: 'inherit', env });
