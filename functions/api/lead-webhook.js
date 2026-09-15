// Encaminha leads do site para o Power Automate/CRM (Cloudflare Pages Function).
// Substitui a Netlify Function de mesmo nome. Configure POWER_AUTOMATE_LEAD_WEBHOOK
// nas variáveis do projeto no Cloudflare Pages; sem ela, só confirma o recebimento.

export async function onRequestPost({ request, env }) {
  try {
    const payload = await request.json().catch(() => ({}));
    const enriquecido = {
      source: 'cafeworking-site',
      receivedAt: new Date().toISOString(),
      page: payload.page || request.headers.get('referer') || '',
      userAgent: request.headers.get('user-agent') || '',
      ...payload,
    };
    const webhook = env.POWER_AUTOMATE_LEAD_WEBHOOK;
    if (webhook) {
      const resp = await fetch(webhook, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(enriquecido),
      });
      if (!resp.ok) return Response.json({ ok: false, error: 'Falha ao enviar ao Power Automate', status: resp.status }, { status: 502 });
    }
    return Response.json({ ok: true, forwarded: Boolean(webhook) });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 400 });
  }
}

export const onRequest = () => Response.json({ ok: false, error: 'Método não permitido' }, { status: 405 });
