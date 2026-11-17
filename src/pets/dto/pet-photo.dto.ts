import { IsIn } from 'class-validator';

export const PHOTO_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export class PetPhotoDto {
  @IsIn(PHOTO_CONTENT_TYPES, {
    message: 'La foto debe ser una imagen JPG, PNG o WebP.',
  })
  contentType!: (typeof PHOTO_CONTENT_TYPES)[number];
}
