// CafeWorking — Netlify Function para encaminhar pedidos de reserva
// Configure POWER_AUTOMATE_RESERVA_WEBHOOK ou use POWER_AUTOMATE_LEAD_WEBHOOK como fallback.

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const payload = JSON.parse(event.body || '{}');
    const enriched = {
      source: 'cafeworking-reservas',
      receivedAt: new Date().toISOString(),
      page: payload.page || event.headers.referer || '',
      ...payload
    };
    const webhook = process.env.POWER_AUTOMATE_RESERVA_WEBHOOK || process.env.POWER_AUTOMATE_LEAD_WEBHOOK;
    if (webhook) {
      const resp = await fetch(webhook, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(enriched) });
      if (!resp.ok) return { statusCode: 502, body: JSON.stringify({ ok:false, status: resp.status }) };
    }
    return { statusCode: 200, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok:true, forwarded:Boolean(webhook) }) };
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ ok:false, error:e.message }) };
  }
};
