import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/app.setup';
import { PrismaService } from './../prisma/prisma.service';
import { computeDv, formatRut } from './../src/common/rut';

// Flujo completo contra la base real (usar TEST_DATABASE_URL): personal y
// tutor → mascota → atención con vacuna → cartola → dashboard.
// Cada corrida crea sus datos con un sufijo único y los borra al final.
describe('Flujo KronoPet (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now().toString().slice(-7);
  const rut = (n: number) => `${n}${suffix}-K`; // 8 dígitos + DV
  const password = 'clave-segura-123';
  // RUT con dígito verificador real (las rutas que usan @IsRut lo validan)
  const validRut = (n: number) => {
    const body = `${n}${suffix}`;
    return formatRut(body + computeDv(body));
  };

  const tutorData = {
    clinicId: '',
    email: `tutor.${suffix}@e2e.cl`,
    password,
    name: 'Tutor E2E',
    rut: rut(1),
    phone: '+56911112222',
  };

  let clinicId: string;
  let platformToken: string;
  let vetId: string;
  let adminId: string;
  let disabledId: string;
  let tutorId: string;
  let dogId: string;
  let catId: string;
  let freeProductId: string;
  let octupleId: string;
  let felineProductId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    // Clínica de prueba y su personal, directo en la base
    const passwordHash = await bcrypt.hash(password, 10);
    clinicId = (
      await prisma.clinic.create({
        data: {
          name: `Clínica E2E ${suffix}`,
          rut: validRut(5),
          email: `clinica.${suffix}@e2e.cl`,
        },
      })
    ).id;
    tutorData.clinicId = clinicId;
    await prisma.platformAdmin.create({
      data: {
        name: 'Plataforma E2E',
        email: `plataforma.${suffix}@e2e.cl`,
        passwordHash,
      },
    });
    const staff = (
      role: 'veterinario' | 'administrador',
      n: number,
      active = true,
    ) =>
      prisma.staffUser.create({
        data: {
          clinicId,
          name: `Staff ${n} E2E`,
          rut: rut(n),
          email: `staff${n}.${suffix}@e2e.cl`,
          role,
          passwordHash,
          active,
        },
      });
    vetId = (await staff('veterinario', 2)).id;
    adminId = (await staff('administrador', 3)).id;
    disabledId = (await staff('veterinario', 4, false)).id;

    octupleId = (
      await prisma.medicalProductCatalog.findUniqueOrThrow({
        where: { name: 'Vacuna Óctuple Canina' },
      })
    ).id;
    felineProductId = (
      await prisma.medicalProductCatalog.findUniqueOrThrow({
        where: { name: 'Vacuna Triple Felina' },
      })
    ).id;

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/staff/login')
      .send({ email: `staff2.${suffix}@e2e.cl`, password });
    staffToken = login.body.backendToken;
  });

  afterAll(async () => {
    // Se borra todo lo de @e2e.cl (también lo que haya dejado una corrida
    // fallida). Las mascotas borran en cascada fichas, vacunas y alertas.
    const e2eEmail = { endsWith: '@e2e.cl' };
    await prisma.pet.deleteMany({ where: { tutor: { email: e2eEmail } } });
    await prisma.tutor.deleteMany({ where: { email: e2eEmail } });
    // La auditoría referencia al personal y a la clínica
    await prisma.auditEntry.deleteMany({
      where: {
        OR: [{ actor: { email: e2eEmail } }, { clinic: { email: e2eEmail } }],
      },
    });
    await prisma.staffUser.deleteMany({ where: { email: e2eEmail } });
    await prisma.clinic.deleteMany({ where: { email: e2eEmail } });
    await prisma.platformAdmin.deleteMany({ where: { email: e2eEmail } });
    await prisma.medicalProductCatalog.deleteMany({
      where: { name: { startsWith: 'Producto sin refuerzo' } },
    });
    await app.close();
  });

  // Todas las rutas van bajo /api/v1 y, salvo las públicas, con el token del
  // veterinario de prueba (las públicas lo ignoran)
  const PREFIX = '/api/v1';
  let staffToken: string;
  const http = () => {
    const agent = request(app.getHttpServer());
    const auth = (test: request.Test) =>
      staffToken ? test.set('Authorization', `Bearer ${staffToken}`) : test;
    return {
      get: (path: string) => auth(agent.get(PREFIX + path)),
      post: (path: string) => auth(agent.post(PREFIX + path)),
    };
  };

  describe('Autenticación', () => {
    it('registra un tutor sin exponer el hash de la contraseña', async () => {
      const res = await http()
        .post('/auth/register')
        .send(tutorData)
        .expect(201);

      expect(res.body).toMatchObject({
        email: tutorData.email,
        rut: tutorData.rut,
        address: null,
      });
      expect(res.body).not.toHaveProperty('passwordHash');
      tutorId = res.body.id;
    });

    it('rechaza un tutor con correo o RUT repetido', async () => {
      await http()
        .post('/auth/register')
        .send({ ...tutorData, email: `otro.${suffix}@e2e.cl` })
        .expect(400);
    });

    it('rechaza un RUT con formato inválido', async () => {
      const res = await http()
        .post('/auth/register')
        .send({ ...tutorData, rut: '123' })
        .expect(400);
      expect(res.body.message).toContain(
        'El RUT debe tener el formato 12345678-9',
      );
    });

    it('el tutor inicia sesión y recibe un token con rol tutor', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ email: tutorData.email, password })
        .expect(200);

      expect(res.body.user.id).toBe(tutorId);
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body.user).not.toHaveProperty('clinic');
      // La app muestra la clínica del tutor
      expect(res.body.clinic).toMatchObject({
        id: clinicId,
        name: expect.any(String),
      });
      const payload = JSON.parse(
        Buffer.from(res.body.backendToken.split('.')[1], 'base64').toString(),
      );
      expect(payload).toMatchObject({ sub: tutorId, role: 'tutor' });
    });

    it('el correo no distingue mayúsculas (citext)', async () => {
      await http()
        .post('/auth/login')
        .send({ email: tutorData.email.toUpperCase(), password })
        .expect(200);
    });

    it('rechaza una contraseña incorrecta', async () => {
      await http()
        .post('/auth/login')
        .send({ email: tutorData.email, password: 'incorrecta' })
        .expect(401);
    });

    it('el personal inicia sesión por su ruta y recibe su rol', async () => {
      const res = await http()
        .post('/auth/staff/login')
        .send({ email: `staff2.${suffix}@e2e.cl`, password })
        .expect(200);

      expect(res.body.user).toMatchObject({ id: vetId, role: 'veterinario' });
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('un tutor no puede entrar por el login del personal', async () => {
      await http()
        .post('/auth/staff/login')
        .send({ email: tutorData.email, password })
        .expect(401);
    });

    it('el personal deshabilitado no puede iniciar sesión', async () => {
      const res = await http()
        .post('/auth/staff/login')
        .send({ email: `staff4.${suffix}@e2e.cl`, password })
        .expect(403);
      expect(res.body.message).toBe(
        'Tu cuenta está deshabilitada. Contacta al administrador de la clínica.',
      );
    });

    it('las rutas privadas exigen token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/pets')
        .expect(401);
      expect(res.body).toEqual({
        statusCode: 401,
        message: 'Tu sesión expiró. Vuelve a iniciar sesión.',
      });
    });

    it('un veterinario no puede leer la auditoría (solo administradores)', async () => {
      await http().get('/audit').expect(403);
    });

    it('lista los tutores con sus mascotas sin hashes', async () => {
      const res = await http().get('/auth/tutors').expect(200);
      const tutor = res.body.find((t: { id: string }) => t.id === tutorId);

      expect(tutor).toBeDefined();
      expect(tutor).not.toHaveProperty('passwordHash');
      expect(tutor.pets).toEqual([]);
    });
  });

  describe('Mascotas', () => {
    const dog = {
      name: 'Rocky',
      species: 'Perro',
      breed: 'Labrador',
      sex: 'Macho',
      birthDate: '2021-05-10',
      reproductiveStatus: 'Entero',
    };

    it('crea un perro y un gato asociados al tutor', async () => {
      const resDog = await http()
        .post('/pets')
        .send({ ...dog, tutorId })
        .expect(201);
      expect(resDog.body).toMatchObject({ tutorId, species: 'Perro' });
      dogId = resDog.body.id;

      const resCat = await http()
        .post('/pets')
        .send({
          name: 'Misu',
          species: 'Gato',
          breed: 'Siamés',
          sex: 'Hembra',
          reproductiveStatus: 'Esterilizado',
          tutorId,
        })
        .expect(201);
      expect(resCat.body.birthDate).toBe('');
      catId = resCat.body.id;
    });

    it('rechaza valores fuera de los enums', async () => {
      await http()
        .post('/pets')
        .send({ ...dog, species: 'Pez', tutorId })
        .expect(400);
      await http()
        .post('/pets')
        .send({ ...dog, reproductiveStatus: 'Intacto', tutorId })
        .expect(400);
    });

    it('responde 400 si el tutor no existe', async () => {
      const res = await http()
        .post('/pets')
        .send({ ...dog, tutorId: '00000000-0000-4000-8000-000000000000' })
        .expect(400);
      expect(res.body.message).toBe(
        'La mascota debe estar asociada a un tutor válido.',
      );
    });

    it('lista las mascotas del tutor', async () => {
      const res = await http().get(`/pets/tutor/${tutorId}`).expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty('vaccines');
      expect(res.body[0]).toHaveProperty('alerts');
    });

    describe('Foto de la mascota (Supabase Storage)', () => {
      const publicUrl = 'https://storage.e2e.test/public/pet-photos';
      const saved = { ...process.env };
      let tutorToken: string;
      let otherTutorToken: string;
      let fetchSpy: jest.SpyInstance;

      const login = async (email: string, pass: string) =>
        (
          await request(app.getHttpServer())
            .post(`${PREFIX}/auth/login`)
            .send({ email, password: pass })
            .expect(200)
        ).body.backendToken as string;
      const upload = (token: string, id: string, contentType = 'image/png') =>
        request(app.getHttpServer())
          .post(`${PREFIX}/pets/${id}/photo`)
          .set('Authorization', `Bearer ${token}`)
          .send({ contentType });

      beforeAll(async () => {
        process.env.PET_PHOTOS_FUNCTION_URL = 'https://fn.e2e.test/pet-photos';
        process.env.PET_PHOTOS_SECRET = 'secreto-e2e';
        process.env.PET_PHOTOS_PUBLIC_URL = publicUrl;

        tutorToken = await login(tutorData.email, password);
        const other = {
          ...tutorData,
          email: `otro.${suffix}@e2e.cl`,
          rut: rut(7),
        };
        await request(app.getHttpServer())
          .post(`${PREFIX}/auth/register`)
          .send(other)
          .expect(201);
        otherTutorToken = await login(other.email, password);
      });

      beforeEach(() => {
        fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
          new Response(
            JSON.stringify({
              uploadUrl: 'https://storage.e2e.test/sign?t=1',
            }),
            { status: 200 },
          ),
        );
      });

      afterEach(() => fetchSpy.mockRestore());

      afterAll(async () => {
        process.env = saved;
        await prisma.tutor.deleteMany({
          where: { email: `otro.${suffix}@e2e.cl` },
        });
      });

      it('el listado y el detalle traen photoUrl', async () => {
        const list = await http().get(`/pets/tutor/${tutorId}`).expect(200);
        expect(list.body[0].photoUrl).toBe(`${publicUrl}/${list.body[0].id}`);
        const detail = await http().get(`/pets/${dogId}`).expect(200);
        expect(detail.body.photoUrl).toBe(`${publicUrl}/${dogId}`);
      });

      it('el tutor pide la subida de la foto de su mascota', async () => {
        const res = await upload(tutorToken, dogId).expect(201);

        expect(res.body.uploadUrl).toBe('https://storage.e2e.test/sign?t=1');
        expect(res.body.photoUrl).toMatch(
          new RegExp(`^${publicUrl}/${dogId}\\?v=\\d+$`),
        );
        const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://fn.e2e.test/pet-photos');
        expect(
          (init.headers as Record<string, string>)['x-pet-photos-secret'],
        ).toBe('secreto-e2e');
        expect(JSON.parse(init.body as string)).toEqual({
          petId: dogId,
          contentType: 'image/png',
        });
      });

      it('rechaza formatos que no son JPG, PNG o WebP', async () => {
        const res = await upload(tutorToken, dogId, 'image/gif').expect(400);
        expect(res.body.message).toBe(
          'La foto debe ser una imagen JPG, PNG o WebP.',
        );
        expect(fetchSpy).not.toHaveBeenCalled();
      });

      it('un tutor no puede cambiar la foto de una mascota ajena', async () => {
        await upload(otherTutorToken, dogId).expect(403);
        expect(fetchSpy).not.toHaveBeenCalled();
      });

      it('exige sesión', async () => {
        await request(app.getHttpServer())
          .post(`${PREFIX}/pets/${dogId}/photo`)
          .send({ contentType: 'image/png' })
          .expect(401);
      });

      it('responde 502 si la función de Storage falla', async () => {
        fetchSpy.mockResolvedValue(new Response('{}', { status: 500 }));
        const res = await upload(tutorToken, dogId).expect(502);
        expect(res.body.message).toBe(
          'No se pudo preparar la subida de la foto. Inténtalo de nuevo.',
        );
      });
    });
  });

  describe('Catálogo de productos', () => {
    it('filtra el catálogo por especie', async () => {
      const res = await http()
        .get('/medical-products/catalog?species=Gato')
        .expect(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(
        res.body.every(
          (p: { targetSpecies: string }) => p.targetSpecies === 'Gato',
        ),
      ).toBe(true);
    });

    it('rechaza una especie que no existe', async () => {
      await http().get('/medical-products/catalog?species=Pez').expect(400);
    });

    it('crea un producto sin refuerzo sin exigir días de refuerzo', async () => {
      const res = await http()
        .post('/medical-products')
        .send({
          name: `Producto sin refuerzo ${suffix}`,
          targetSpecies: 'Perro',
          isBase: false,
          requiresReinforcement: false,
        })
        .expect(201);
      expect(res.body.daysToReinforce).toBeNull();
      freeProductId = res.body.id;
    });

    it('exige días de refuerzo si el producto lo requiere', async () => {
      await http()
        .post('/medical-products')
        .send({
          name: `Producto con refuerzo ${suffix}`,
          targetSpecies: 'Perro',
          isBase: false,
          requiresReinforcement: true,
        })
        .expect(400);
    });
  });

  describe('Atenciones médicas', () => {
    const event = {
      date: '2026-10-01',
      title: 'Vacunación anual',
      reason: 'ControlSanoRutina',
      observations: 'Sin novedades',
      weightKg: 28.75,
      followUpDate: '2027-10-01',
    };

    it('registra la atención y la vacuna aplicada en la cartola', async () => {
      const res = await http()
        .post('/medical-events')
        .send({ ...event, petId: dogId, vetId, appliedProductId: octupleId })
        .expect(201);

      expect(res.body).toMatchObject({
        petId: dogId,
        vetId,
        reason: 'ControlSanoRutina',
        recommendations: '',
        diagnosis: '',
        date: '2026-10-01',
        followUpDate: '2027-10-01',
      });
      // El mapper convierte el Decimal(5,2) en número para el panel
      expect(res.body.weightKg).toBe(28.75);

      const vaccines = await prisma.vaccine.findMany({
        where: { petId: dogId },
      });
      expect(vaccines).toHaveLength(1);
      expect(vaccines[0]).toMatchObject({
        catalogId: octupleId,
        name: 'Vacuna Óctuple Canina',
        status: 'aplicada',
      });
      expect(vaccines[0].expiresAt.toISOString()).toBe(
        '2027-10-01T00:00:00.000Z',
      );
    });

    it('no aplica un producto de otra especie (y no deja la ficha)', async () => {
      await http()
        .post('/medical-events')
        .send({
          ...event,
          petId: dogId,
          vetId,
          appliedProductId: felineProductId,
        })
        .expect(400);
      expect(await prisma.medicalEvent.count({ where: { petId: dogId } })).toBe(
        1,
      );
    });

    it('exige un veterinario activo con rol veterinario', async () => {
      await http()
        .post('/medical-events')
        .send({ ...event, petId: catId, vetId: adminId })
        .expect(400);
      await http()
        .post('/medical-events')
        .send({ ...event, petId: catId, vetId: disabledId })
        .expect(400);
    });

    it('valida motivo y peso', async () => {
      await http()
        .post('/medical-events')
        .send({ ...event, reason: 'Consulta', petId: catId, vetId })
        .expect(400);
      await http()
        .post('/medical-events')
        .send({ ...event, weightKg: 200.5, petId: catId, vetId })
        .expect(400);
    });

    it('exige que el próximo control sea posterior a la atención', async () => {
      const res = await http()
        .post('/medical-events')
        .send({ ...event, followUpDate: event.date, petId: catId, vetId })
        .expect(400);
      expect(res.body.message).toBe(
        'La fecha del próximo control debe ser posterior a la de la atención',
      );
    });

    it('lista el historial de la mascota con el veterinario', async () => {
      const res = await http().get(`/medical-events/pet/${dogId}`).expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].vet).toEqual({
        id: vetId,
        name: 'Staff 2 E2E',
        specialty: null,
      });
      expect(res.body[0]).toHaveProperty('attachments');
    });

    it('lista el historial de todas las mascotas del tutor', async () => {
      const res = await http()
        .get(`/medical-events/tutor/${tutorId}`)
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].pet).toMatchObject({ name: 'Rocky' });
    });
  });

  describe('Cartola sanitaria', () => {
    it('muestra el catálogo de la especie con lo aplicado y lo pendiente', async () => {
      const res = await http()
        .get(`/medical-products/pet/${dogId}`)
        .expect(200);

      const dogCatalog = await prisma.medicalProductCatalog.count({
        where: { targetSpecies: 'Perro' },
      });
      expect(res.body).toHaveLength(dogCatalog);

      const octuple = res.body.find(
        (v: { catalogId: string }) => v.catalogId === octupleId,
      );
      expect(octuple.status).toBe('aplicada');
      expect(octuple.id).not.toMatch(/^temp-/);

      const pending = res.body.filter(
        (v: { status: string }) => v.status === 'pendiente',
      );
      expect(pending).toHaveLength(dogCatalog - 1);
      expect(
        pending.every((v: { id: string }) => v.id.startsWith('temp-')),
      ).toBe(true);
    });

    it('asignar el mismo producto actualiza el registro y no duplica', async () => {
      const res = await http()
        .post('/medical-products/assign')
        .send({ petId: dogId, catalogId: octupleId, status: 'pendiente' })
        .expect(201);

      expect(res.body).toMatchObject({ status: 'pendiente', appliedAt: null });
      expect(await prisma.vaccine.count({ where: { petId: dogId } })).toBe(1);
    });

    it('calcula expiresAt con los días de refuerzo del catálogo', async () => {
      const res = await http()
        .post('/medical-products/assign')
        .send({
          petId: catId,
          catalogId: felineProductId,
          status: 'aplicada',
          appliedAt: '2026-01-15',
        })
        .expect(201);
      expect(res.body.expiresAt).toBe('2027-01-15T00:00:00.000Z');
    });

    it('exige expiresAt si el producto no tiene días de refuerzo', async () => {
      await http()
        .post('/medical-products/assign')
        .send({ petId: dogId, catalogId: freeProductId, status: 'aplicada' })
        .expect(400);
    });

    it('rechaza asignar un producto de otra especie', async () => {
      await http()
        .post('/medical-products/assign')
        .send({ petId: dogId, catalogId: felineProductId, status: 'pendiente' })
        .expect(400);
    });
  });

  describe('Plataforma y clínicas', () => {
    const newClinic = () => ({
      clinic: {
        name: 'Clínica Nueva E2E',
        rut: validRut(6),
        email: `nueva.${suffix}@e2e.cl`,
        phone: '+56 2 2345 6789',
        address: 'Av. Siempre Viva 742',
      },
      admin: {
        name: 'Admin Nueva E2E',
        rut: validRut(7),
        email: `admin.nueva.${suffix}@e2e.cl`,
        phone: '+56 9 1111 2222',
        password,
      },
    });
    const asPlatform = (test: request.Test) =>
      test.set('Authorization', `Bearer ${platformToken}`);
    let newClinicId: string;

    it('la cuenta de plataforma inicia sesión por su ruta', async () => {
      const res = await request(app.getHttpServer())
        .post(`${PREFIX}/auth/platform/login`)
        .send({ email: `plataforma.${suffix}@e2e.cl`, password })
        .expect(200);
      expect(res.body.user).toMatchObject({ name: 'Plataforma E2E' });
      platformToken = res.body.backendToken;
    });

    it('el personal no entra por el login de la plataforma', async () => {
      await request(app.getHttpServer())
        .post(`${PREFIX}/auth/platform/login`)
        .send({ email: `staff2.${suffix}@e2e.cl`, password })
        .expect(401);
    });

    it('crea una clínica con su cuenta de administrador', async () => {
      const res = await asPlatform(
        request(app.getHttpServer()).post(`${PREFIX}/platform/clinics`),
      )
        .send(newClinic())
        .expect(201);
      newClinicId = res.body.id;
      expect(res.body).toMatchObject({
        name: 'Clínica Nueva E2E',
        admin: { email: `admin.nueva.${suffix}@e2e.cl` },
        staffCount: 1,
        tutorCount: 0,
      });
    });

    it('rechaza una clínica con RUT repetido', async () => {
      const data = newClinic();
      data.admin.email = `otro.admin.${suffix}@e2e.cl`;
      data.admin.rut = validRut(8);
      await asPlatform(
        request(app.getHttpServer()).post(`${PREFIX}/platform/clinics`),
      )
        .send(data)
        .expect(409);
    });

    it('la cuenta nueva entra a su clínica y no ve los datos de otra', async () => {
      const login = await request(app.getHttpServer())
        .post(`${PREFIX}/auth/staff/login`)
        .send({ email: `admin.nueva.${suffix}@e2e.cl`, password })
        .expect(200);
      expect(login.body.clinic).toMatchObject({ name: 'Clínica Nueva E2E' });
      const as = (path: string) =>
        request(app.getHttpServer())
          .get(PREFIX + path)
          .set('Authorization', `Bearer ${login.body.backendToken}`);

      expect((await as('/tutors').expect(200)).body).toEqual([]);
      expect((await as('/pets').expect(200)).body).toEqual([]);
      const staff = (await as('/staff').expect(200)).body;
      expect(staff).toHaveLength(1);
      await as(`/pets/${dogId}`).expect(404);
      // Su alta quedó en su auditoría, sin actor (la hizo la plataforma)
      const audit = (await as('/audit').expect(200)).body;
      expect(audit).toHaveLength(1);
      expect(audit[0]).toMatchObject({ actorId: null, entity: 'equipo' });
    });

    it('cada cuenta solo entra a sus rutas', async () => {
      await http().get('/platform/clinics').expect(403);
      await asPlatform(
        request(app.getHttpServer()).get(`${PREFIX}/tutors`),
      ).expect(403);
      await asPlatform(
        request(app.getHttpServer()).get(`${PREFIX}/pets/${dogId}`),
      ).expect(403);
      const res = await asPlatform(
        request(app.getHttpServer()).get(`${PREFIX}/platform/clinics`),
      ).expect(200);
      expect(res.body.some((c: { id: string }) => c.id === clinicId)).toBe(
        true,
      );
    });

    it('edita los datos de una clínica', async () => {
      const data = { ...newClinic().clinic, name: 'Clínica Editada E2E' };
      const res = await asPlatform(
        request(app.getHttpServer()).patch(
          `${PREFIX}/platform/clinics/${newClinicId}`,
        ),
      )
        .send(data)
        .expect(200);
      expect(res.body).toMatchObject({ id: newClinicId, name: data.name });
      // El RUT de otra clínica no se puede usar
      const other = await prisma.clinic.findUniqueOrThrow({
        where: { id: clinicId },
      });
      await asPlatform(
        request(app.getHttpServer()).patch(
          `${PREFIX}/platform/clinics/${newClinicId}`,
        ),
      )
        .send({ ...data, rut: other.rut })
        .expect(409);
    });

    it('elimina una clínica con todos sus datos', async () => {
      // Le agrega un tutor con mascota para comprobar que se borra todo
      const tutor = await prisma.tutor.create({
        data: {
          clinicId: newClinicId,
          name: 'Tutor Borrable E2E',
          rut: validRut(9),
          email: `borrable.${suffix}@e2e.cl`,
          phone: '+56911112222',
          passwordHash: 'x',
          pets: {
            create: {
              name: 'Borrable',
              species: 'Perro',
              breed: 'Mestizo',
              sex: 'Macho',
              reproductiveStatus: 'Entero',
            },
          },
        },
      });
      await asPlatform(
        request(app.getHttpServer()).delete(
          `${PREFIX}/platform/clinics/${newClinicId}`,
        ),
      ).expect(204);
      expect(
        await prisma.clinic.findUnique({ where: { id: newClinicId } }),
      ).toBeNull();
      expect(
        await prisma.tutor.findUnique({ where: { id: tutor.id } }),
      ).toBeNull();
      expect(
        await prisma.staffUser.count({ where: { clinicId: newClinicId } }),
      ).toBe(0);
      await request(app.getHttpServer())
        .post(`${PREFIX}/auth/staff/login`)
        .send({ email: `admin.nueva.${suffix}@e2e.cl`, password })
        .expect(401);
      await asPlatform(
        request(app.getHttpServer()).delete(
          `${PREFIX}/platform/clinics/${newClinicId}`,
        ),
      ).expect(404);
    });
  });

  describe('Detalle y dashboard', () => {
    it('el detalle de la mascota trae tutor, historial y vacunas', async () => {
      const res = await http().get(`/pets/${dogId}`).expect(200);
      expect(res.body.tutor).toMatchObject({ id: tutorId });
      expect(res.body.tutor).not.toHaveProperty('passwordHash');
      expect(res.body.medicalEvents).toHaveLength(1);
      expect(res.body.vaccines[0].catalog.id).toBe(octupleId);
    });

    it('el dashboard agrupa las atenciones por motivo', async () => {
      const res = await http().get('/dashboard').expect(200);
      expect(res.body.kpisGenerales).toHaveProperty('motivoMasAtendidoMes');
      expect(res.body.kpisGenerales.totalTutores).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.graficoAtencionesMes)).toBe(true);
    });
  });
});
