// Edge Function `pet-photos` (proyecto Supabase "Vety").
//
// Entrega a la API de Vety una URL firmada para subir la foto de una mascota
// al bucket público `pet-photos`. La API es la única que la llama: autentica
// con el secreto compartido PET_PHOTOS_SECRET (cabecera x-pet-photos-secret) y
// ya comprobó antes que la mascota es del tutor. La app sube la imagen directo
// a Storage con la URL firmada, sin pasar por la API.
//
// Cada mascota tiene un único objeto: `<petId>` (se reemplaza al subir otra).
import { createClient } from 'npm:@supabase/supabase-js@2.47.10';

const BUCKET = 'pet-photos';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Comparación en tiempo constante, para no filtrar el secreto por tiempos.
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ message: 'Método no permitido.' }, 405);

  const secret = Deno.env.get('PET_PHOTOS_SECRET');
  const provided = req.headers.get('x-pet-photos-secret') ?? '';
  if (!secret || !safeEqual(provided, secret)) {
    return json({ message: 'No autorizado.' }, 401);
  }

  let body: { petId?: unknown; contentType?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ message: 'Cuerpo inválido.' }, 400);
  }
  const { petId, contentType } = body;
  if (typeof petId !== 'string' || !UUID.test(petId)) {
    return json({ message: 'petId inválido.' }, 400);
  }
  if (typeof contentType !== 'string' || !CONTENT_TYPES.has(contentType)) {
    return json({ message: 'Formato de imagen no permitido.' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const path = petId.toLowerCase();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: true });
  if (error || !data) {
    console.error('createSignedUploadUrl', error);
    return json({ message: 'No se pudo preparar la subida.' }, 502);
  }

  return json({
    uploadUrl: data.signedUrl,
    publicUrl: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
  });
});
