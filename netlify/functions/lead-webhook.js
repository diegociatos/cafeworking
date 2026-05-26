// CafeWorking — Netlify Function para encaminhar leads para Power Automate/CRM
// Configure POWER_AUTOMATE_LEAD_WEBHOOK nas variáveis de ambiente do Netlify.

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok:false, error:'Método não permitido' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const enriched = {
      source: 'cafeworking-site',
      receivedAt: new Date().toISOString(),
      page: payload.page || event.headers.referer || '',
      userAgent: event.headers['user-agent'] || '',
      ...payload
    };

    const webhook = process.env.POWER_AUTOMATE_LEAD_WEBHOOK;

    if (webhook) {
      const resp = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enriched)
      });

      if (!resp.ok) {
        return { statusCode: 502, body: JSON.stringify({ ok:false, error:'Falha ao enviar ao Power Automate', status: resp.status }) };
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok:true, forwarded:Boolean(webhook) })
    };
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
