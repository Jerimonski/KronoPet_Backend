import { BadGatewayException, Injectable, Logger } from '@nestjs/common';

// Fotos de mascotas en Supabase Storage (bucket público `pet-photos`).
//
// La API no guarda claves de Supabase: pide las URLs firmadas de subida a la
// Edge Function `pet-photos`, que se autentica con un secreto compartido
// (ver supabase/functions/pet-photos). Cada mascota tiene un único objeto,
// `<petId>`, así que su URL pública se deduce sin columna en la base de datos.
@Injectable()
export class PetPhotosService {
  private readonly logger = new Logger(PetPhotosService.name);

  /** URL pública de la foto de la mascota; `null` si Storage no está configurado. */
  publicUrl(petId: string): string | null {
    const base = process.env.PET_PHOTOS_PUBLIC_URL?.replace(/\/+$/, '');
    return base ? `${base}/${petId.toLowerCase()}` : null;
  }

  /** Agrega `photoUrl` a lo que devuelven las consultas de mascotas. */
  withPhoto<T extends { id: string }>(pet: T): T & { photoUrl: string | null } {
    return { ...pet, photoUrl: this.publicUrl(pet.id) };
  }

  /**
   * Prepara la subida: devuelve la URL firmada donde la app sube la imagen y
   * la URL pública con un `?v=` nuevo para que la app no muestre la anterior.
   */
  async createUpload(petId: string, contentType: string) {
    const functionUrl = process.env.PET_PHOTOS_FUNCTION_URL;
    const secret = process.env.PET_PHOTOS_SECRET;
    const publicUrl = this.publicUrl(petId);
    if (!functionUrl || !secret || !publicUrl) {
      this.logger.error('Faltan PET_PHOTOS_* en el entorno');
      throw new BadGatewayException(
        'Las fotos de mascotas no están disponibles por ahora.',
      );
    }

    let uploadUrl: string | undefined;
    try {
      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pet-photos-secret': secret,
        },
        body: JSON.stringify({ petId, contentType }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        this.logger.error(`pet-photos respondió ${res.status}`);
      } else {
        uploadUrl = ((await res.json()) as { uploadUrl?: string }).uploadUrl;
      }
    } catch (error) {
      this.logger.error(`No se pudo llamar a pet-photos: ${String(error)}`);
    }

    if (!uploadUrl) {
      throw new BadGatewayException(
        'No se pudo preparar la subida de la foto. Inténtalo de nuevo.',
      );
    }
    return { uploadUrl, photoUrl: `${publicUrl}?v=${Date.now()}` };
  }
}
