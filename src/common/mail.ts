// Envío de correo con la API HTTP de Resend (sin dependencias).
// Sin RESEND_API_KEY lanza un error que el llamador registra.

export async function sendMail(
  to: string,
  subject: string,
  html: string,
  text: string,
  replyTo?: string,
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      'El servicio de correo no está configurado (falta RESEND_API_KEY).',
    );
  }

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'KronoPet <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
        text,
        reply_to: replyTo,
      }),
    });
  } catch {
    throw new Error('No se pudo contactar al servicio de correo.');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      body.message ?? `El servicio de correo respondió ${response.status}.`,
    );
  }
}
