import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MedicalProductsService } from './medical-products.service';
import { MedicalProductsController } from './medical-products.controller';
@Module({
  imports: [PrismaModule],
  controllers: [MedicalProductsController],
  providers: [MedicalProductsService],
})
export class MedicalProductsModule {}
