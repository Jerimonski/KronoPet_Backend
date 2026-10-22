# 🐾 KronoPet - Backend API

Backend en **NestJS** para la gestión de la clínica veterinaria **KronoPet**. Expone una API REST que conecta el sistema de escritorio de la veterinaria (Python) con la app móvil de los tutores (Flutter).

* **Autenticación:** registro e inicio de sesión con contraseñas hasheadas (bcrypt) y tokens JWT.
* **Pacientes:** fichas de mascotas asociadas a su tutor.
* **Historial clínico:** atenciones médicas (motivo, diagnóstico, recomendaciones, peso, veterinario) ordenadas por fecha.
* **Cartola sanitaria:** catálogo de vacunas y antiparasitarios por especie, con estado "Aplicada" / "Pendiente" y fecha de refuerzo.
* **Dashboard:** KPIs y métricas para el sistema de escritorio.

---

## 🚀 Puesta en marcha

### Requisitos

* [Node.js](https://nodejs.org/) 22 o superior
* [pnpm](https://pnpm.io/) 10 (`npm install -g pnpm`)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)

No necesitas instalar PostgreSQL ni pgAdmin: la base de datos corre en Docker y las tablas y datos de prueba se crean con un comando.

### Pasos

La base de datos corre en Docker y el backend en tu equipo, con recarga automática al guardar cambios.

```bash
# 1. Clonar e instalar dependencias (también genera el cliente de Prisma)
git clone https://github.com/Jerimonski/Vety_APP.git
cd Vety_APP
pnpm install

# 2. Crear el archivo de variables de entorno
cp .env.example .env

# 3. Levantar PostgreSQL en Docker
pnpm db:up

# 4. Crear las tablas y cargar datos de prueba
pnpm db:setup

# 5. Levantar el backend en modo desarrollo
pnpm start:dev
```

La API queda en **http://localhost:3001**. Para comprobar que todo está bien:

```bash
curl http://localhost:3001/health
# {"status":"ok","database":"up"}
```

> En Windows con PowerShell, en vez de `cp` usa `Copy-Item .env.example .env`.

### Datos de prueba (seed)

`pnpm db:setup` carga automáticamente:

* **Catálogo de productos:** 10 vacunas y antiparasitarios para perros y gatos.
* **Usuario de prueba:** `tutor@kronopet.cl` / `kronopet123`, con dos mascotas (Max y Luna) y su historial.

El seed se puede correr varias veces sin duplicar datos.

### Variables de entorno

Están en `.env.example`. Los valores por defecto funcionan sin cambios.

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `POSTGRES_USER` | Usuario de PostgreSQL en Docker | `kronopet` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL en Docker | `kronopet` |
| `POSTGRES_DB` | Nombre de la base de datos | `kronopet_db` |
| `DB_PORT` | Puerto del host donde se expone PostgreSQL | `5433` |
| `DATABASE_URL` | Conexión que usa el backend (debe coincidir con lo anterior) | `postgresql://kronopet:kronopet@localhost:5433/kronopet_db?schema=public` |
| `PORT` | Puerto de la API | `3001` |
| `JWT_SECRET` | Secreto para firmar los tokens | `cambia-este-secreto` |

> PostgreSQL se expone en el puerto **5433** para no chocar con un PostgreSQL instalado en el equipo (que suele usar el 5432). Si cambias `DB_PORT`, actualiza también el puerto en `DATABASE_URL`.

### Comandos útiles

| Comando | Qué hace |
|---|---|
| `pnpm db:up` | Levanta PostgreSQL en Docker |
| `pnpm db:down` | Detiene los contenedores (los datos se conservan) |
| `pnpm db:setup` | Aplica las migraciones y carga los datos de prueba |
| `pnpm db:seed` | Vuelve a cargar los datos de prueba |
| `pnpm db:reset` | **Borra toda la base de datos** y la recrea con los datos de prueba |
| `pnpm db:migrate` | Crea una migración nueva después de cambiar `prisma/schema.prisma` |
| `pnpm db:studio` | Abre Prisma Studio en el navegador para ver y editar los datos |
| `pnpm start:dev` | Levanta el backend con recarga automática |
| `pnpm build` | Compila el proyecto en `dist/` |
| `pnpm lint` | Revisa el código con ESLint |
| `pnpm test:e2e` | Corre los tests end-to-end (requiere la base de datos levantada) |

Para borrar también los datos guardados en Docker: `docker compose down -v`.

### Cambios en la base de datos

1. Edita `prisma/schema.prisma`.
2. Corre `pnpm db:migrate` y ponle un nombre a la migración (por ejemplo `add_microchip_to_pet`).
3. Sube a git la carpeta nueva que se crea en `prisma/migrations/`. Tus compañeros solo tienen que correr `pnpm db:setup` al hacer pull.

### Problemas comunes

* **`Can't reach database server`**: la base de datos no está levantada. Revisa que Docker Desktop esté abierto y corre `pnpm db:up`.
* **`port is already allocated`**: otro programa usa el puerto. Cambia `DB_PORT` (y `DATABASE_URL`) o `PORT` en el `.env`.
* **`The database schema is not empty` (P3005)**: tienes una base de datos antigua creada antes de las migraciones actuales. Si no necesitas sus datos, corre `pnpm db:reset`.

---

## 📊 Modelo de base de datos

PostgreSQL gestionado con **Prisma ORM** (`prisma/schema.prisma`). Las eliminaciones van en cascada para mantener la integridad referencial.

1. **User:** tutores de las mascotas (credenciales y contacto).
2. **Pet:** perfil del animal (nombre, especie, raza, género, nacimiento, estado reproductivo, peso).
3. **MedicalEvent:** atenciones clínicas, con categoría y, opcionalmente, el producto aplicado.
4. **MedicalProductCatalog:** catálogo maestro de vacunas y antiparasitarios por especie, con días para el refuerzo.
5. **PetMedicalProduct:** cartola sanitaria; relaciona una mascota con un producto del catálogo y su estado.

---

## 🧠 Stack tecnológico

* **Runtime y framework:** Node.js y NestJS 11
* **Lenguaje:** TypeScript
* **Base de datos y ORM:** PostgreSQL 17 y Prisma 7 (con `@prisma/adapter-pg`)
* **Seguridad:** JWT (`@nestjs/jwt`), bcrypt (`bcryptjs`)
* **Validación:** `class-validator` y `class-transformer`
* **Infraestructura local:** Docker Compose

---

## 🚦 Endpoints

> 💡 Las rutas están abiertas (sin guards de JWT) para facilitar la sincronización con el sistema de escritorio (Python) y las pruebas en la app móvil (Flutter).

### 0. Estado

* **GET `/health`**: indica si la API y la base de datos están funcionando.

### 1. 🔐 Autenticación (Auth)

* **POST `/auth/register`**: registra un tutor. La contraseña se guarda hasheada y no se devuelve en la respuesta.
    ```json
    {
      "email": "tutor.ejemplo@gmail.com",
      "password": "PasswordSegura123",
      "name": "Juan Carlos Pérez",
      "phone": "+56912345678",
      "address": "Av. Connecticut 123"
    }
    ```

* **POST `/auth/login`**: valida las credenciales y devuelve los datos del tutor junto con un `backendToken`.
    ```json
    {
      "email": "tutor.ejemplo@gmail.com",
      "password": "PasswordSegura123"
    }
    ```

* **GET `/auth/users`**: lista todos los tutores con sus mascotas.

### 2. 🐾 Mascotas (Pets)

* **POST `/pets`**: registra una mascota asociada a un tutor (`ownerId`).
    * `species`: `Perro` o `Gato`
    * `gender`: `Macho` o `Hembra`
    * `reproductiveStatus` (opcional): `Intacto` o `Esterilizado`
    ```json
    {
      "name": "Max",
      "species": "Perro",
      "breed": "Golden Retriever",
      "gender": "Macho",
      "weight": 34.5,
      "birthdate": "2022-04-15",
      "reproductiveStatus": "Esterilizado",
      "ownerId": "uuid-del-tutor"
    }
    ```

* **GET `/pets/owner/:ownerId`**: mascotas de un tutor, con sus productos aplicados. Lo usa el Home de Flutter.

* **GET `/pets/:id`**: ficha completa de una mascota, con su historial médico y su cartola.

### 3. 📋 Historial clínico (Medical Events)

* **POST `/medical-events`**: registra una atención.
    * `category`: `Inmunizacion`, `Consulta`, `Cirugia` o `Desparasitacion`
    * `appliedProductId` (opcional): producto del catálogo aplicado. Si requiere refuerzo, actualiza la cartola de la mascota con la fecha de vencimiento calculada.
    ```json
    {
      "petId": "uuid-de-la-mascota",
      "category": "Inmunizacion",
      "title": "Control sano y vacunación anual",
      "reason": "Control de rutina.",
      "observations": "Paciente en excelente condición física.",
      "diagnosis": "Sano sin patologías.",
      "recommendations": "Se receta antiparasitario interno (1 tableta).",
      "weight": 32.5,
      "veterinarian": "Dr. Alejandro Silva",
      "date": "2026-05-30",
      "appliedProductId": "uuid-del-producto"
    }
    ```

* **GET `/medical-events/pet/:petId`**: atenciones de una mascota, de la más reciente a la más antigua.

* **GET `/medical-events/owner/:ownerId`**: atenciones de todas las mascotas de un tutor en una sola petición.

### 4. 🧪 Catálogo y cartola sanitaria (Medical Products)

* **POST `/medical-products`**: agrega un producto al catálogo maestro.
    ```json
    {
      "name": "Antiparasitario Interno Felino Toltrazuril",
      "targetSpecies": "Gato",
      "isBase": true,
      "requiresReinforcement": true,
      "daysToReinforce": 90
    }
    ```

* **POST `/medical-products/assign`**: registra un producto en la cartola de una mascota. Si ya estaba registrado, lo actualiza.
    * `status`: `Aplicada` o `Pendiente`
    ```json
    {
      "petId": "uuid-de-la-mascota",
      "medicalProductCatalogId": "uuid-del-producto",
      "status": "Aplicada",
      "appliedDate": "2026-01-20T00:00:00.000Z",
      "expirationDate": "2027-01-20T00:00:00.000Z"
    }
    ```

* **GET `/medical-products/catalog?species=Gato`**: lista el catálogo, con filtro opcional por especie.

* **GET `/medical-products/pet/:petId`**: cartola completa de la mascota: todos los productos de su especie, con los aplicados y los pendientes.

### 5. 📊 Dashboard

* **GET `/dashboard`**: KPIs globales, registros de hoy, la semana y el mes, y atenciones del mes por categoría, listas para graficar.

---

## 📂 Estructura del proyecto

```text
.
├── docker-compose.yml            # PostgreSQL en Docker
├── Dockerfile                    # Imagen del backend
├── .env.example                  # Variables de entorno de ejemplo
├── prisma.config.ts              # Configuración de Prisma (schema, migraciones, seed)
├── prisma/
│   ├── schema.prisma             # Modelo de datos
│   ├── migrations/               # Migraciones SQL versionadas
│   ├── seed.ts                   # Datos de prueba
│   ├── prisma.module.ts          # Módulo global de Prisma
│   └── prisma.service.ts         # Conexión a PostgreSQL
└── src/
    ├── main.ts                   # Punto de entrada (puerto 3001)
    ├── app.module.ts             # Módulo raíz
    ├── app.controller.ts         # GET /health
    ├── auth/                     # Registro, login y tutores
    ├── pets/                     # Mascotas
    ├── medical-events/           # Historial clínico
    ├── medical-products/         # Catálogo y cartola sanitaria
    └── dashboard/                # Estadísticas para el sistema de escritorio
```
