import 'dotenv/config';

// Las pruebas e2e escriben en la base: si existe TEST_DATABASE_URL se usa esa
// en vez de la de desarrollo.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
