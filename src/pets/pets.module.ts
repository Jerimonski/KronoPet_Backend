import { Module } from '@nestjs/common';
import { PetsService } from './pets.service';
import { PetsController } from './pets.controller';
import { PetPhotosService } from './pet-photos.service';

@Module({
  providers: [PetsService, PetPhotosService],
  controllers: [PetsController],
})
export class PetsModule {}
