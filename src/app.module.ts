import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './../prisma/prisma.module';
import { PetsModule } from './pets/pets.module';
import { MedicalProductsModule } from './medical-products/medical-products.module';
import { MedicalEventsModule } from './medical-events/medical-events.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { StaffModule } from './staff/staff.module';
import { TutorsModule } from './tutors/tutors.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { VaccinesModule } from './vaccines/vaccines.module';
import { AuditModule } from './audit/audit.module';
import { RemindersModule } from './reminders/reminders.module';
import { ContactModule } from './contact/contact.module';
import { PlatformModule } from './platform/platform.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    StaffModule,
    TutorsModule,
    PetsModule,
    MedicalProductsModule,
    MedicalEventsModule,
    AttachmentsModule,
    VaccinesModule,
    AuditModule,
    RemindersModule,
    ContactModule,
    DashboardModule,
    PlatformModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Todo es privado salvo las rutas marcadas con @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
