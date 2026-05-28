# 📌 Descripción General

Backend desarrollado con **NestJS** para la gestión integral de una clínica veterinaria. Provee una API robusta, modular y altamente escalable para el control de usuarios, mascotas y agendamiento de horas médicas.

- **Autenticación Segura:** Sistema de registro e inicio de sesión protegido con hashing de contraseñas y firma de tokens de acceso.
- **Gestión de Mascotas (Próximamente):** Control de fichas clínicas, especies, razas y asociación directa con sus dueños.
- **Agendamiento de Citas (Próximamente):** Gestión de horas veterinarias y registro de observaciones clínicas.

---

## 📊 Modelo de Base de Datos

Estructura relacional diseñada en **PostgreSQL** y gestionada mediante **Prisma ORM**. El diseño actual cuenta con las siguientes entidades principales:

* **User:** Propietarios de mascotas y personal de la clínica.
* **Pet:** Información de los pacientes (mascotas) asociados a un dueño.
* **Appointment:** Registro de citas médicas agendadas.
* **ClinicNote:** Observaciones y recomendaciones veterinarias detalladas de cada cita.

---

## 🏗 Arquitectura Modular

El proyecto sigue una arquitectura limpia basada en dominios para asegurar la mantenibilidad y un acoplamiento débil:

- **Modules:** Organización lógica por contexto de negocio (`AuthModule`, `PrismaModule`).
- **Controllers:** Capa de entrada encargada de recibir las peticiones HTTP y mapear los endpoints.
- **Services:** Contenedores de la lógica de negocio y procesamiento de datos.
- **Prisma Infrastructure:** Capa de infraestructura de persistencia configurada mediante un driver adapter profesional para la gestión eficiente del pool de conexiones.

---

## 🧠 Stack Tecnológico

- **Runtime & Framework:** Node.js & NestJS 11
- **Lenguaje:** TypeScript
- **Base de Datos & ORM:** PostgreSQL & Prisma ORM
- **Control de Conexiones:** `pg` (Node-Postgres Pool) & `@prisma/adapter-pg`
- **Seguridad:** JWT (`@nestjs/jwt`), `bcryptjs`
- **Validación:** `class-validator` & `class-transformer`

---

## 🔐 Autenticación (Auth)

### ➔ POST `/auth/register`
Registra un nuevo usuario/cliente en la plataforma. Protege la contraseña mediante hashing asíncrono y omite datos sensibles en la respuesta.

**Body:**
```json
{
  "email": "contacto@vety.com",
  "password": "PasswordSegura123",
  "name": "Jeremy",
  "phone": "+56912345678"
}
```

### ➔ POST `/auth/login`
Valida las credenciales del usuario contra la base de datos y genera un token JWT firmado para la autorización de rutas protegidas en el frontend.

**Body:**
```json
{
  "email": "contacto@vety.com",
  "password": "PasswordSegura123"
}
```
## Estructura del Proyecto
```
src/
├── main.ts                 # Punto de entrada de la aplicación (Puerto 3001)
├── app.module.ts           # Módulo raíz que centraliza las importaciones
├── auth/                   # Módulo de Autenticación
│   ├── dto/                # Validaciones de entrada (LoginDto, RegisterDto)
│   ├── auth.controller.ts  # Endpoints de registro y login
│   └── auth.service.ts     # Lógica de hashing, validación y JWT
└── prisma/                 # Módulo de Infraestructura de Base de Datos
    ├── prisma.module.ts    # Envoltura global del ORM
    └── prisma.service.ts   # Cliente Prisma extendido con Node-Postgres Pool adapter
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
