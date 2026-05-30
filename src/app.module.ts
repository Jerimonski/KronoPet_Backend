import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './../prisma/prisma.module';
import { PetsModule } from './pets/pets.module';
import { VaccinesModule } from './vaccines/vaccines.module';
import { MedicalEventsModule } from './medical-events/medical-events.module';
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PetsModule,
    VaccinesModule,
    MedicalEventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
