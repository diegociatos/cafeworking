// Encaminha pedidos de reserva do site (Cloudflare Pages Function).
// Substitui a Netlify Function de mesmo nome. Usa POWER_AUTOMATE_RESERVA_WEBHOOK
// ou, na falta dela, POWER_AUTOMATE_LEAD_WEBHOOK.

export async function onRequestPost({ request, env }) {
  try {
    const payload = await request.json().catch(() => ({}));
    const enriquecido = {
      source: 'cafeworking-reservas',
      receivedAt: new Date().toISOString(),
      page: payload.page || request.headers.get('referer') || '',
      ...payload,
    };
    const webhook = env.POWER_AUTOMATE_RESERVA_WEBHOOK || env.POWER_AUTOMATE_LEAD_WEBHOOK;
    if (webhook) {
      const resp = await fetch(webhook, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(enriquecido),
      });
      if (!resp.ok) return Response.json({ ok: false, status: resp.status }, { status: 502 });
    }
    return Response.json({ ok: true, forwarded: Boolean(webhook) });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 400 });
  }
}

export const onRequest = () => Response.json({ ok: false, error: 'Método não permitido' }, { status: 405 });
