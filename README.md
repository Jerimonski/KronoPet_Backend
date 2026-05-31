# 🐾 VETY - Backend API

📌 **Descripción General**

Backend desarrollado con **NestJS** para la gestión integral de la clínica veterinaria **VETY**. Provee una API REST robusta, modular y centralizada encargada de comunicar el sistema de escritorio de la veterinaria (desarrollado en Python) con la aplicación móvil de consulta para los tutores (desarrollada en Flutter).

* **Autenticación y Cuentas:** Sistema de registro e inicio de sesión con hashing asíncrono de contraseñas y firma de tokens JWT.
* **Gestión Centralizada de Pacientes:** Control absoluto de fichas de mascotas asociadas directamente a sus dueños mediante llaves foráneas (`UUID`).
* **Historial Clínico Digital:** Registro detallado de atenciones médicas (diagnósticos, observaciones, recetas escritas en texto plano y control de peso) ordenadas cronológicamente.
* **Carnet Sanitario de Vacunas:** Control preventivo del estado de inmunizaciones ("Aplicada" o "Pendiente") con alertas de expiración/refuerzo.

---

📊 **Modelo de Base de Datos**

Estructura relacional nativa diseñada en **PostgreSQL** y gestionada mediante **Prisma ORM**. Las eliminaciones están configuradas en cascada (`onDelete: Cascade`) para asegurar la integridad referencial. El diseño definitivo cuenta con las siguientes entidades:

1.  **User:** Datos básicos de inicio de sesión, credenciales y contacto de los tutores/dueños de mascotas.
2.  **Pet:** Información del perfil del animal (nombre, especie, raza, género, fecha de nacimiento y estado reproductivo).
3.  **MedicalEvent:** Bloque completo de texto plano que almacena las consultas médicas y recetas digitadas por el veterinario.
4.  **Vaccine:** Registro del calendario preventivo y dosis de inmunización de cada paciente.

---

🏗 **Arquitectura Modular**

El proyecto sigue una arquitectura limpia basada en dominios para asegurar la mantenibilidad y un acoplamiento débil entre componentes:

* **Modules:** Organización lógica por contexto de negocio (`AuthModule`, `PetsModule`, `MedicalEventsModule`, `VaccinesModule`, `PrismaModule`).
* **Controllers:** Capa encargada de exponer y mapear los endpoints HTTP correspondientes.
* **Services:** Contenedores aislados de la lógica de negocio, validaciones y queries hacia Prisma.
* **Prisma Infrastructure:** Capa de infraestructura configurada mediante un driver adapter profesional para la gestión óptima del pool de conexiones en la base de datos.

---

🧠 **Stack Tecnológico**

* **Runtime & Framework:** Node.js & NestJS 11
* **Lenguaje:** TypeScript
* **Base de Datos & ORM:** PostgreSQL & Prisma ORM
* **Control de Conexiones:** `pg` (Node-Postgres Pool) & `@prisma/adapter-pg`
* **Seguridad:** JWT (`@nestjs/jwt`), bcrypt
* **Validación:** `class-validator` & `class-transformer`

---

🚦 **Documentación de la API (Endpoints)**

> 💡 **Nota de desarrollo:** Las rutas se encuentran abiertas (sin Guards de JWT obligatorios) para facilitar la sincronización nativa directa del software de escritorio (Python) y agilizar las pruebas en el entorno móvil (Flutter).

### 1. 🔐 Autenticación (Auth)

* **POST `/auth/register`**
    * *Descripción:* Registra un nuevo dueño en el sistema (usualmente ingresado desde la veterinaria). Ocurre hashing de contraseña y omite datos sensibles en la respuesta.
    * *Body (JSON):*
        ```json
        {
          "email": "tutor.ejemplo@gmail.com",
          "password": "PasswordSegura123",
          "name": "Juan Carlos Pérez",
          "phone": "+56912345678"
        }
        ```

* **POST `/auth/login`**
    * *Descripción:* Valida las credenciales del usuario en la base de datos y genera un `backendToken` junto con los datos del perfil para la app móvil.
    * *Body (JSON):*
        ```json
        {
          "email": "tutor.ejemplo@gmail.com",
          "password": "PasswordSegura123"
        }
        ```

### 2. 🐾 Mascotas (Pets)

* **POST `/pets`**
    * *Descripción:* Registra una mascota en la base de datos amarrándola a un dueño mediante su `ownerId`.
    * *Body (JSON):*
        ```json
        {
          "name": "Max",
          "species": "Perro",
          "breed": "Golden Retriever",
          "gender": "Macho",
          "birthdate": "2022-04-15",
          "reproductiveStatus": "Castrado",
          "ownerId": "uuid-del-dueño-aqui"
        }
        ```

* **GET `/pets/owner/:ownerId`**
    * *Descripción:* Devuelve la lista completa de las mascotas registradas a nombre de ese usuario. Utilizado por Flutter para renderizar las tarjetas del Home.

* **GET `/pets/:id`**
    * *Descripción:* Devuelve la ficha médica extendida de una mascota específica, incluyendo arrays anidados de todo su historial médico y vacunas.

### 📋 3. Historial Clínico (Medical Events)

* **POST `/medical-events`**
    * *Descripción:* Registra una nueva atención clínica en el sistema (utilizado por el veterinario desde la app de Python).
    * *Body (JSON):*
        ```json
        {
          "petId": "uuid-de-la-mascota-aqui",
          "title": "Control Sano y Vacunación Anual",
          "reason": "Control de rutina.",
          "observations": "Paciente en excelente condición física.",
          "diagnosis": "Sano sin patologías.",
          "recommendations": "Se receta antiparasitario interno (1 tableta).",
          "weight": 32.5,
          "veterinarian": "Dr. Alejandro Silva",
          "date": "2026-05-30"
        }
        ```

* **GET `/medical-events/pet/:petId`**
    * *Descripción:* Trae la lista completa de atenciones médicas exclusivas de la mascota, ordenadas cronológicamente (más reciente primero) para alimentar el Timeline en Flutter.

### 💉 4. Control de Vacunas (Vaccines)

* **POST `/vaccines`**
    * *Descripción:* Registra una dosis de inmunización aplicada o programa una dosis pendiente en el calendario.
    * *Body (JSON):*
        ```json
        {
          "petId": "uuid-de-la-mascota-aqui",
          "name": "Vacuna Antirrábica",
          "status": "Aplicada",
          "appliedDate": "2026-05-30",
          "expirationDate": "2027-05-30"
        }
        ```

* **GET `/vaccines/pet/:petId`**
    * *Descripción:* Devuelve la cartola preventiva de la mascota. Utilizado por Flutter para pintar el estado visual (Vacunas al día / Pendientes).

---

📂 **Estructura del Proyecto**

```text
src/
├── main.ts                       # Punto de entrada de la aplicación (Puerto 3001)
├── app.module.ts                 # Módulo raíz que centraliza los 5 módulos del dominio
├── prisma/                       # Infraestructura global del ORM (Servicio y Módulo)
├── auth/                         # Módulo de Autenticación (DTOs, Servicio, Controlador)
├── pets/                         # Módulo de Mascotas (DTOs, Servicio, Controlador)
├── medical-events/               # Módulo de Atenciones Clínicas (DTOs, Servicio, Controlador)
└── vaccines/                     # Módulo de Inmunizaciones (DTOs, Servicio, Controlador)
```
## Scripts de Inicialización
### 1. Instalación de dependencias
```
pnpm install
```
### 2. Generar el Cliente de Prisma
```
pnpm prisma generate
```
### 3. Ejecutar Migraciones (Base de Datos)
```
pnpm prisma migrate dev
```
### 4. Levantar el Entorno de Desarrollo
```
pnpm run start:dev
```
