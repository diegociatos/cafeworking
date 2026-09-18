// Renderização pura: recebe SOMENTE a allowlist de unidades-publicas do app.
// Não consulta produção e não escreve arquivos. Integrar ao build após staging.
const Cards = require('../assets/js/cards-plano.js');
const esc = Cards.escapar;
const slug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const nomes = { endereco_fiscal: 'Endereço fiscal', coworking: 'Estação e sala compartilhada', sala_hora: 'Reunião / auditório por hora', sala_privativa: 'Sala privativa' };
function paginaDaUnidade(u) {
  // Não gerar combinações cidade×serviço: uma página canônica por unidade.
  if (u.publicacao_aprovada !== true || !u.id || !u.bairro || !u.cidade || String(u.descricao || '').trim().length < 80) return null;
  const servicos = (u.servicos || []).filter((s) => nomes[s]);
  if (!servicos.length) return null;
  const caminho = `/unidades/${slug(u.cidade)}/${slug(u.bairro)}-${slug(u.id)}`;
  const canonical = `https://cafeworking.com.br${caminho}`;
  const title = `${u.nome} · ${u.bairro} · ${u.cidade}`;
  const json = JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: u.nome, url: canonical, address: u.endereco, description: u.descricao }).replace(/</g, '\\u003c');
  const fotos = (u.fotos || []).filter((url) => /^https:\/\/[^\s]+$/.test(url)).slice(0, 20);
  return { caminho, canonical, html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(u.descricao.slice(0, 155))}"><link rel="canonical" href="${canonical}"><link rel="stylesheet" href="/assets/css/style.css"><script type="application/ld+json">${json}</script></head><body><main class="wrap section"><a href="/unidades">Todas as unidades CafeWorking</a><h1>${esc(title)}</h1><p class="lead">${esc(u.descricao)}</p><p>${esc(u.endereco)}</p><h2>Serviços desta unidade</h2><ul>${servicos.map((s) => `<li>${esc(nomes[s])}</li>`).join('')}</ul><h2>Planeje sua visita</h2><p>Horários: ${esc(u.horarios || 'Consulte a unidade')}</p><p>Acessibilidade: ${esc(u.acessibilidade || 'Consulte a unidade')}</p><p>Estacionamento: ${esc(u.estacionamento || 'Consulte a unidade')}</p><p>${esc(u.comodidades || '')}</p>${fotos.map((url) => `<img src="${esc(url)}" alt="Ambiente da unidade ${esc(u.nome)}" loading="lazy" style="max-width:100%;height:auto">`).join('')}<p><a class="btn" href="/planos?unidade=${encodeURIComponent(u.id)}">Consultar planos e disponibilidade</a></p></main></body></html>` };
}
module.exports = { paginaDaUnidade };
