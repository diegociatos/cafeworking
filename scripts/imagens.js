#!/usr/bin/env node
/**
 * imagens.js - dono unico dos atributos das tags <img> do site.
 *
 *   1. width/height intrinsecos  -> o navegador reserva o espaco antes de baixar
 *                                   a imagem, o que zera o CLS (Core Web Vitals).
 *   2. loading / fetchpriority   -> a imagem do hero carrega eager com prioridade
 *                                   alta e ganha um <link rel="preload"> no head
 *                                   (e a LCP da pagina); o logo carrega eager sem
 *                                   prioridade; todo o resto vira lazy.
 *   3. decoding="async"          -> em todas.
 *   4. alt                       -> preenche o alt do logo quando faltar e lista
 *                                   no fim as imagens que ainda precisam de um.
 *   5. atributo repetido         -> remove (o HTML antigo tinha decoding duas vezes).
 *
 * As dimensoes sao lidas do proprio arquivo (WebP/PNG/JPEG/SVG), sem dependencia
 * externa. O script e idempotente e autoritativo: ele reescreve loading e
 * fetchpriority em vez de so completar o que falta, entao rodar de novo depois
 * do seo.js ou do gerar-paginas.js sempre devolve o mesmo resultado.
 *
 *   node scripts/imagens.js
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');

/* O logo aparece no topo de toda pagina: nao pode ser lazy (some por um instante
 * na abertura), mas tambem nao leva fetchpriority - quem precisa da banda
 * primeiro e a imagem do hero. */
const LOGO = /logo-cafeworking/;

/* Como o seo.js identifica o hero: a primeira imagem cujo contexto imediato
 * anterior fala em hero ou post em destaque. */
const CONTEXTO_HERO = /hero|featured-post/i;
const JANELA_CONTEXTO = 900;

const ALT_PADRAO = [[LOGO, 'CafeWorking']];

/* ---------- leitura das dimensoes ---------- */

function dimensoesPNG(b) {
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

function dimensoesJPEG(b) {
  if (b.readUInt16BE(0) !== 0xffd8) return null;
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i++; continue; }
    const marcador = b[i + 1];
    // SOF0..SOF15, menos os marcadores que nao carregam dimensao (DHT/JPG/DAC).
    if (marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador)) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

function dimensoesWebP(b) {
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const formato = b.toString('ascii', 12, 16);
  if (formato === 'VP8X') return { w: (b.readUIntLE(24, 3) & 0xffffff) + 1, h: (b.readUIntLE(27, 3) & 0xffffff) + 1 };
  if (formato === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (formato === 'VP8L') {
    const n = b.readUInt32LE(21);
    return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function dimensoesSVG(texto) {
  const vb = texto.match(/viewBox\s*=\s*["']\s*[\d.-]+[ ,]+[\d.-]+[ ,]+([\d.]+)[ ,]+([\d.]+)/i);
  if (vb) return { w: Math.round(+vb[1]), h: Math.round(+vb[2]) };
  const w = texto.match(/\bwidth\s*=\s*["'](\d+)/i);
  const h = texto.match(/\bheight\s*=\s*["'](\d+)/i);
  return w && h ? { w: +w[1], h: +h[1] } : null;
}

const cache = new Map();

function dimensoes(src) {
  if (cache.has(src)) return cache.get(src);
  const arquivo = path.join(RAIZ, src.replace(/^\//, ''));
  let r = null;
  try {
    if (src.endsWith('.svg')) r = dimensoesSVG(fs.readFileSync(arquivo, 'utf8'));
    else {
      const b = fs.readFileSync(arquivo);
      r = dimensoesPNG(b) || dimensoesJPEG(b) || dimensoesWebP(b);
    }
  } catch { r = null; }
  cache.set(src, r);
  return r;
}

/* ---------- reescrita das tags ---------- */

const temAtributo = (tag, nome) => new RegExp('[\\s]' + nome + '[\\s]*=', 'i').test(tag);
const semAtributo = (tag, nome) => tag.replace(new RegExp('[\\s]' + nome + '="[^"]*"', 'gi'), '');

const faltando = new Set();
const semAlt = new Set();
let repetidos = 0;

/* Algumas paginas trazem o mesmo atributo duas vezes (ex.: decoding="async"
 * decoding="async"); o navegador ignora a repeticao, mas o HTML fica invalido.
 * Mantem sempre a primeira ocorrencia. */
function semRepetidos(tag) {
  const vistos = new Set();
  return tag.replace(/\s([a-zA-Z-]+)(="[^"]*")?/g, (todo, nome) => {
    const chave = nome.toLowerCase();
    if (vistos.has(chave)) { repetidos++; return ''; }
    vistos.add(chave);
    return todo;
  });
}

function normalizar(tag, papel) {
  const src = (tag.match(/\ssrc\s*=\s*"([^"]+)"/i) || [])[1];
  if (!src || /^(https?:)?\/\//.test(src) || src.startsWith('data:')) return tag;

  const limpo = src.replace(/^\//, '');

  // loading e fetchpriority sao reescritos, nao completados: o papel da imagem
  // na pagina e quem manda, independente do que estava no HTML antes.
  let saida = semAtributo(semAtributo(tag, 'loading'), 'fetchpriority');
  const novos = [];
  if (papel === 'lcp') novos.push('loading="eager"', 'fetchpriority="high"');
  else if (papel === 'logo') novos.push('loading="eager"');
  else novos.push('loading="lazy"');

  if (!temAtributo(saida, 'decoding')) novos.push('decoding="async"');

  // width/height tambem sao reescritos a partir do arquivo. Se fossem apenas
  // completados, trocar uma foto por outra de proporcao diferente (ou reduzir o
  // logo) deixaria a dimensao antiga no HTML - e o espaco reservado na tela
  // ficaria errado, que e justamente o problema que esses atributos resolvem.
  const d = dimensoes(src);
  if (d) {
    saida = semAtributo(semAtributo(saida, 'width'), 'height');
    novos.push(`width="${d.w}"`, `height="${d.h}"`);
  } else if (!temAtributo(saida, 'width')) {
    faltando.add(src);
  }
  if (!temAtributo(saida, 'alt')) {
    const padrao = ALT_PADRAO.find(([re]) => re.test(limpo));
    if (padrao) novos.push(`alt="${padrao[1]}"`);
    else semAlt.add(src);
  }

  return semRepetidos(saida.replace(/^<img/i, `<img ${novos.join(' ')}`));
}

/* ---------- preload da imagem do hero ---------- */

const MARCA_PRELOAD = '<link rel="preload" as="image" ';

/* O preload avisa o navegador da imagem do LCP antes dele chegar ao <body>,
 * o que costuma adiantar a maior pintura em algumas centenas de ms. */
function ajustarPreload(html, srcHero) {
  // remove o preload da rodada anterior, para nao acumular
  html = html.replace(/<link rel="preload" as="image"[^>]*>/gi, '');
  if (!srcHero) return html;
  const href = srcHero.startsWith('/') ? srcHero : '/' + srcHero;
  const tag = `${MARCA_PRELOAD}href="${href}" fetchpriority="high">`;
  return html.replace(/<\/head>/i, () => `${tag}</head>`);
}

/* ---------- execucao ---------- */

const paginas = fs.readdirSync(RAIZ).filter(f => f.endsWith('.html'));
let alteradas = 0;
let tags = 0;
let comHero = 0;

for (const pagina of paginas) {
  const caminho = path.join(RAIZ, pagina);
  const antes = fs.readFileSync(caminho, 'utf8');

  let heroUsado = false;
  let logoUsado = false;
  let srcHero = null;

  let depois = antes.replace(/<img\b[^>]*>/gi, (tag, posicao) => {
    tags++;
    const src = (tag.match(/\ssrc\s*=\s*"([^"]+)"/i) || [])[1] || '';
    let papel = 'normal';

    if (LOGO.test(src)) {
      // so o logo do cabecalho e eager; o do rodape esta abaixo da dobra.
      if (!logoUsado) { papel = 'logo'; logoUsado = true; }
    } else if (!heroUsado) {
      const contexto = antes.slice(Math.max(0, posicao - JANELA_CONTEXTO), posicao);
      if (CONTEXTO_HERO.test(contexto)) {
        papel = 'lcp';
        heroUsado = true;
        srcHero = src;
      }
    }
    return normalizar(tag, papel);
  });

  depois = ajustarPreload(depois, srcHero);
  if (srcHero) comHero++;

  if (depois !== antes) {
    fs.writeFileSync(caminho, depois, 'utf8');
    alteradas++;
  }
}

console.log(`imagens.js: ${tags} tags <img> em ${paginas.length} paginas; ${alteradas} atualizadas; ${comHero} com preload de hero; ${repetidos} atributos repetidos removidos`);
if (faltando.size) console.log(`sem dimensao legivel (${faltando.size}):`, [...faltando].join(', '));
if (semAlt.size) console.log(`ainda sem alt (${semAlt.size}):`, [...semAlt].join(', '));
