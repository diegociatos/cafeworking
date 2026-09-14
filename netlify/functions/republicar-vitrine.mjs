// Republica o site uma vez por dia para os cards de planos acompanharem o app
// (o build roda scripts/vitrine.js). A página já confere os preços ao vivo; esta
// rotina mantém o HTML publicado, que é o que o Google lê, em dia.
//
// Precisa da variável NETLIFY_BUILD_HOOK_URL (Netlify > Site configuration >
// Build & deploy > Build hooks). Sem ela, não faz nada.

export default async () => {
  const hook = process.env.NETLIFY_BUILD_HOOK_URL;
  if (!hook) {
    console.log('republicar-vitrine: NETLIFY_BUILD_HOOK_URL não configurada; nada a fazer');
    return new Response('sem build hook', { status: 200 });
  }
  const res = await fetch(`${hook}?trigger_title=${encodeURIComponent('Vitrine diária de planos')}`, { method: 'POST' });
  console.log(`republicar-vitrine: build hook respondeu ${res.status}`);
  return new Response(`build hook ${res.status}`, { status: 200 });
};

// 9h UTC = 6h em Brasília, antes do horário comercial
export const config = { schedule: '0 9 * * *' };
