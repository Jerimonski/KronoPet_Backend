import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './../prisma/prisma.module';
import { PetsModule } from './pets/pets.module';
import { MedicalProductsModule } from './medical-products/medical-products.module';
import { MedicalEventsModule } from './medical-events/medical-events.module';
import { DashboardModule } from './dashboard.service.ts/dashboard.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PetsModule,
    MedicalProductsModule,
    MedicalEventsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
