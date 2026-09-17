#!/usr/bin/env node
/**
 * Páginas por cidade da vitrine nacional (fase 3 da rede de parceiros).
 *
 * Para cada cidade que tem unidade pública vendendo endereço fiscal, grava
 *
 *   endereco-fiscal/<cidade>-<uf>.html   →   /endereco-fiscal/<cidade>-<uf>
 *
 * com o preço da tabela nacional, o endereço da unidade, o que está incluso, as
 * perguntas frequentes e o botão que leva ao contratar já com a unidade
 * escolhida. O cabeçalho e o rodapé saem do index.html (mesma fonte do
 * scripts/gerar-paginas.js), com os caminhos relativos virando absolutos porque
 * a página fica numa subpasta.
 *
 * Roda na publicação, antes do build-dist. É à prova de falha: se o app não
 * responder, as páginas que já existem ficam como estão e a publicação segue.
 * As páginas geradas ficam listadas em scripts/cidades-geradas.json, que o
 * scripts/seo.js usa para incluí-las no sitemap.xml.
 *
 *   node scripts/paginas-cidade.js
 */

const fs = require('fs');
const path = require('path');
const Cards = require('../assets/js/cards-plano.js');
const loja = require('../assets/js/loja-config.js');

const RAIZ = path.join(__dirname, '..');
const PASTA = path.join(RAIZ, 'endereco-fiscal');
const LISTA = path.join(__dirname, 'cidades-geradas.json');
const SITE = 'https://cafeworking.com.br';
const CATEGORIA = 'endereco_fiscal';

const esc = Cards.escapar;

/** "Belo Horizonte/MG" → { nome: 'Belo Horizonte', uf: 'MG' }. Sem UF, uf fica ''. */
function partesDaCidade(valor) {
  const bruto = String(valor || '').trim().replace(/\s+/g, ' ');
  if (!bruto) return { nome: '', uf: '' };
  const m = bruto.match(/^(.*?)\s*[/-]\s*([A-Za-z]{2})$/);
  if (m) return { nome: m[1].trim(), uf: m[2].toUpperCase() };
  return { nome: bruto, uf: '' };
}

const limpar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** "Belo Horizonte" + "MG" → "belo-horizonte-mg". */
const slugDaCidade = (nome, uf) => [limpar(nome), limpar(uf)].filter(Boolean).join('-');

/**
 * Agrupa as unidades por cidade, só as que têm plano de endereço fiscal à venda.
 * `enderecos` é { unidadeId: endereço } (vem da unidades-publicas).
 */
function cidadesDoCatalogo(catalogo, enderecos = {}) {
  if (!catalogo || !Array.isArray(catalogo.planos)) return [];
  const planos = catalogo.planos.filter((p) => p.categoria === CATEGORIA && !p.sobConsulta);
  const porSlug = new Map();

  for (const u of catalogo.unidades || []) {
    const meus = planos.filter((p) => p.unidade_id === u.id);
    if (!meus.length) continue;
    const { nome, uf } = partesDaCidade(u.cidade);
    const slug = slugDaCidade(nome, uf);
    if (!slug || !nome) continue;
    if (!porSlug.has(slug)) porSlug.set(slug, { slug, cidade: nome, uf, unidades: [], planos: [] });
    const cidade = porSlug.get(slug);
    cidade.unidades.push({ id: u.id, nome: u.nome, cidade: u.cidade, endereco: enderecos[u.id] || '' });
    cidade.planos.push(...meus);
  }

  for (const c of porSlug.values()) {
    c.precoMinimo = Math.min(...c.planos.map((p) => Number(p.preco) || Infinity));
    if (!Number.isFinite(c.precoMinimo)) c.precoMinimo = 0;
  }
  return [...porSlug.values()].sort((a, b) => a.slug.localeCompare(b.slug, 'pt-BR'));
}

const rotuloCidade = (c) => (c.uf ? `${c.cidade}/${c.uf}` : c.cidade);
const precoTexto = (c) => (c.precoMinimo ? Cards.precoBRL(c.precoMinimo) : '');

function tituloDaCidade(c) {
  const base = `Endereço Fiscal em ${rotuloCidade(c)} | CafeWorking`;
  return base.length <= 62 ? base : `Endereço Fiscal em ${rotuloCidade(c)}`;
}

function descricaoDaCidade(c) {
  const preco = precoTexto(c);
  return `Endereço fiscal em ${rotuloCidade(c)} para usar no CNPJ da sua empresa${preco ? `, a partir de ${preco} por mês` : ''}: ` +
    'recebimento de correspondência, aviso por e-mail e contrato assinado online.';
}

/** Perguntas frequentes da cidade (viram FAQPage no JSON-LD). */
function perguntas(c) {
  const lugar = rotuloCidade(c);
  return [
    ['O endereço fiscal do CafeWorking vale para abrir empresa em ' + lugar + '?',
      'Sim. O endereço é comercial e serve como domicílio fiscal do CNPJ. Você recebe os documentos do imóvel (IPTU com índice cadastral e autorização de uso) para instruir a abertura ou a alteração na Junta Comercial e na prefeitura.'],
    ['Como recebo minha correspondência?',
      'Tudo o que chega é registrado na plataforma e você é avisado por e-mail em até 1 dia útil. Você retira no endereço da unidade, no horário comercial.'],
    ['Preciso ir até a unidade para contratar?',
      'Não. A contratação é online: você escolhe o plano, assina o contrato na tela e paga por PIX, boleto ou cartão. O acesso à área do cliente chega por e-mail.'],
    ['Quem responde pelo espaço em ' + lugar + '?',
      'A unidade é operada por um parceiro credenciado da rede CafeWorking, que fornece o espaço e atende no local. A contratação, a cobrança e a plataforma são da CafeWorking.'],
    ['Posso cancelar quando quiser?',
      'Sim, nas condições do contrato que você assina na contratação, que fica disponível na área do cliente.'],
  ];
}

function jsonLd(c, url) {
  const grafo = [
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#trilha`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Endereço Fiscal', item: `${SITE}/endereco-fiscal` },
        { '@type': 'ListItem', position: 3, name: rotuloCidade(c), item: url },
      ],
    },
    {
      '@type': 'Service',
      '@id': `${url}#servico`,
      name: `Endereço fiscal em ${rotuloCidade(c)}`,
      serviceType: 'Endereço fiscal e recebimento de correspondência',
      provider: { '@type': 'Organization', name: 'CafeWorking', url: `${SITE}/` },
      areaServed: { '@type': 'City', name: c.cidade, ...(c.uf ? { address: { '@type': 'PostalAddress', addressRegion: c.uf, addressCountry: 'BR' } } : {}) },
      ...(c.precoMinimo ? { offers: { '@type': 'Offer', price: c.precoMinimo, priceCurrency: 'BRL', url } } : {}),
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: perguntas(c).map(([q, a]) => ({
        '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ];
  return { '@context': 'https://schema.org', '@graph': grafo };
}

/** Miolo (<main>) da página da cidade. */
function miolo(c) {
  const lugar = esc(rotuloCidade(c));
  const preco = precoTexto(c);
  // Sem abas de propósito: a troca de aba depende do assets/js/vitrine.js, que
  // recarregaria a vitrine com TODAS as unidades do país. Aqui os cards da
  // cidade ficam todos à vista, cada um já com a sua unidade no link.
  const grade = (planos) => `<div class="fiscal-pricing">${planos.map(Cards.cardPlano).join('')}</div>`;
  const cards = c.unidades.length === 1
    ? grade(c.planos)
    : c.unidades.map((u) => {
      const meus = c.planos.filter((p) => p.unidade_id === u.id);
      if (!meus.length) return '';
      return `<h3 class="vitrine-unidade">${esc(Cards.nomeUnidade(u.nome))}</h3>${grade(meus)}`;
    }).join('');

  const enderecos = c.unidades.map((u) => (
    `<article class="card"><h3>${esc(Cards.nomeUnidade(u.nome))}</h3>` +
    `<p>${esc(u.endereco || 'Endereço enviado na contratação.')}</p>` +
    `<p><small>${esc(u.cidade || rotuloCidade(c))}</small></p></article>`
  )).join('');

  const faq = perguntas(c).map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');

  const contratar = c.planos.length
    ? `<a class="btn btn-primary" href="${esc(Cards.urlContratar(c.planos[0]))}">Contratar em ${lugar}</a>`
    : '';

  return `<section class="page-hero"><div class="wrap page-hero-grid"><div><div class="eyebrow">Endereço fiscal</div>` +
    `<h1 class="h1">Endereço fiscal em ${lugar}.</h1>` +
    `<p class="lead">Use um endereço comercial no CNPJ da sua empresa${preco ? `, a partir de <b>${esc(preco)}</b> por mês` : ''}. ` +
    `Sua correspondência é registrada na plataforma e você é avisado por e-mail em até 1 dia útil.</p>` +
    `<div class="hero-actions">${contratar}<a class="btn btn-outline" href="/endereco-fiscal">Como funciona</a></div>` +
    `<p class="cw-nota">Contratação online, com contrato na tela e pagamento por PIX, boleto ou cartão.</p></div>` +
    `<div class="hero-img"><img loading="eager" fetchpriority="high" width="1400" height="933" decoding="async" src="/assets/img/cafe-coworking.webp" alt="Endereço fiscal em ${lugar}"></div></div></section>\n` +

    `<section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Planos</div>` +
    `<h2 class="h2">Preço de tabela nacional, igual em todo o Brasil.</h2></div>` +
    `<p>O mesmo plano vale em qualquer cidade da rede CafeWorking. Você contrata online e começa a usar o endereço assim que o pagamento é confirmado.</p></div>` +
    `<div class="vitrine">${cards}</div></div></section>\n` +

    `<section class="section section-soft"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Incluso</div>` +
    `<h2 class="h2">O que está incluso.</h2></div></div><div class="check-grid">` +
    `<div class="check"><span><b>Endereço comercial</b> para usar no CNPJ, no contrato social e no cartão da empresa.</span></div>` +
    `<div class="check"><span><b>Recebimento de correspondência</b>, com registro na plataforma e aviso por e-mail em até 1 dia útil.</span></div>` +
    `<div class="check"><span><b>Guarda dos documentos</b> até você retirar, no horário comercial.</span></div>` +
    `<div class="check"><span><b>Documentos do imóvel</b> (IPTU com índice cadastral e autorização de uso) para a abertura ou alteração do CNPJ.</span></div>` +
    `<div class="check"><span><b>Área do cliente</b> com contrato, faturas, notas fiscais e o que chegou para você.</span></div>` +
    `</div></div></section>\n` +

    `<section class="section"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Onde fica</div>` +
    `<h2 class="h2">A unidade em ${lugar}.</h2></div></div><div class="cards">${enderecos}</div></div></section>\n` +

    `<section class="section section-soft"><div class="wrap"><div class="section-head"><div><div class="eyebrow">Dúvidas</div>` +
    `<h2 class="h2">Perguntas frequentes.</h2></div></div><div class="faq-list">${faq}</div></div></section>\n` +

    `<section class="section"><div class="wrap"><div class="cta"><h2 class="h2">Pronto para usar o endereço em ${lugar}?</h2>` +
    `<p>Contrate online em poucos minutos. Se preferir falar antes, a equipe do CafeWorking responde pelo WhatsApp.</p>` +
    `${contratar}<a class="btn btn-outline" href="/contato">Falar com a equipe</a></div></div></section>`;
}

/** Cabeçalho e rodapé do index.html, com os caminhos relativos virando absolutos. */
function molduraDoSite() {
  const modelo = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const iBody = modelo.indexOf('<body>');
  const iHeaderFim = modelo.indexOf('</header>') + '</header>'.length;
  const iMainFim = modelo.indexOf('</main>');
  if (iBody < 0 || iHeaderFim < 9 || iMainFim < 0) throw new Error('index.html fora do formato esperado');
  // a página fica em /endereco-fiscal/: "assets/..." apontaria para a subpasta
  const absoluto = (t) => t.replace(/(src|href)="assets\//g, '$1="/assets/');
  return {
    cabecalho: absoluto(modelo.slice(iBody + '<body>'.length, iHeaderFim)),
    rodape: absoluto(modelo.slice(iMainFim + '</main>'.length)),
  };
}

function paginaDaCidade(c, moldura) {
  const url = `${SITE}/endereco-fiscal/${c.slug}`;
  const titulo = tituloDaCidade(c);
  const descricao = descricaoDaCidade(c);
  const imagem = `${SITE}/assets/img/og/og-endereco-fiscal.jpg`;

  return '<!doctype html><html lang="pt-BR"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<title>${esc(titulo)}</title>` +
    `<meta name="description" content="${esc(descricao)}">` +
    '<link rel="stylesheet" href="/assets/css/style.css">' +
    '<script defer src="/assets/js/main.js"></script>' +
    `<link rel="canonical" href="${url}">` +
    '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:site_name" content="CafeWorking">' +
    '<meta property="og:locale" content="pt_BR">' +
    `<meta property="og:title" content="${esc(titulo)}">` +
    `<meta property="og:description" content="${esc(descricao)}">` +
    `<meta property="og:url" content="${url}">` +
    `<meta property="og:image" content="${imagem}">` +
    '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    `<meta name="twitter:title" content="${esc(titulo)}">` +
    `<meta name="twitter:description" content="${esc(descricao)}">` +
    `<meta name="twitter:image" content="${imagem}">` +
    '<meta name="author" content="CafeWorking · Grupo Ciatos">' +
    (c.uf ? `<meta name="geo.region" content="BR-${esc(c.uf)}">` : '') +
    `<meta name="geo.placename" content="${esc(c.cidade)}">` +
    '<link rel="icon" href="/assets/img/icons/favicon-32.png" sizes="32x32" type="image/png">' +
    '<link rel="apple-touch-icon" href="/assets/img/icons/apple-touch-icon.png">' +
    '<link rel="manifest" href="/manifest.json">' +
    '<meta name="theme-color" content="#0E4B4F">' +
    `<script type="application/ld+json">${JSON.stringify(jsonLd(c, url))}</script>` +
    '</head><body>' +
    moldura.cabecalho +
    '<main>\n' + miolo(c) + '\n</main>' +
    moldura.rodape;
}

async function buscarCatalogo() {
  const pedir = async (caminho) => {
    const res = await fetch(`${loja.supabaseUrl}/functions/v1/${caminho}`, {
      headers: { apikey: loja.anonKey, authorization: `Bearer ${loja.anonKey}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${caminho}`);
    return res.json();
  };
  try {
    const [catalogo, publicas] = await Promise.all([
      pedir(`planos-publicos?site=1&categoria=${CATEGORIA}`),
      pedir('unidades-publicas').catch(() => ({ unidades: [] })),
    ]);
    if (!Array.isArray(catalogo.planos)) throw new Error('resposta sem planos');
    const enderecos = {};
    for (const u of publicas.unidades || []) enderecos[u.id] = u.endereco || '';
    return { catalogo, enderecos };
  } catch (e) {
    console.log(`paginas-cidade: catálogo indisponível (${e.message}); páginas mantidas como estão`);
    return null;
  }
}

function gravar(cidades) {
  fs.mkdirSync(PASTA, { recursive: true });
  const moldura = molduraDoSite();
  const atuais = new Set(fs.readdirSync(PASTA).filter((f) => f.endsWith('.html')));
  const gerados = [];

  for (const c of cidades) {
    const arquivo = `${c.slug}.html`;
    fs.writeFileSync(path.join(PASTA, arquivo), paginaDaCidade(c, moldura), 'utf8');
    atuais.delete(arquivo);
    gerados.push({ slug: c.slug, cidade: c.cidade, uf: c.uf, unidades: c.unidades.map((u) => u.id) });
  }
  // cidade que saiu da rede não pode deixar página órfã no ar
  for (const sobra of atuais) fs.unlinkSync(path.join(PASTA, sobra));

  fs.writeFileSync(LISTA, JSON.stringify(gerados, null, 2) + '\n', 'utf8');
  return { gerados, removidos: atuais.size };
}

async function main() {
  const dados = await buscarCatalogo();
  if (!dados) return;
  const cidades = cidadesDoCatalogo(dados.catalogo, dados.enderecos);
  if (!cidades.length) {
    console.log('paginas-cidade: nenhuma cidade com endereço fiscal à venda; páginas mantidas como estão');
    return;
  }
  const r = gravar(cidades);
  console.log(`paginas-cidade: ${r.gerados.length} cidade(s) → ${r.gerados.map((c) => c.slug).join(', ')}` +
    (r.removidos ? ` · ${r.removidos} página(s) antiga(s) removida(s)` : ''));
}

module.exports = { partesDaCidade, slugDaCidade, cidadesDoCatalogo, paginaDaCidade, miolo, molduraDoSite };

if (require.main === module) {
  main().catch((e) => {
    // nunca derruba a publicação por causa das páginas de cidade
    console.log(`paginas-cidade: erro inesperado (${e.message}); páginas mantidas como estão`);
  });
}
