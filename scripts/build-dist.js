#!/usr/bin/env node
/**
 * Monta dist/ para o Cloudflare Pages: só o que é público vai para o ar.
 *
 * Na Netlify o site era servido da raiz do repositório, então páginas internas,
 * documentação e scripts/ ficavam acessíveis pela web. Aqui entra somente o que
 * está na lista de públicos, menos o que estiver em scripts/internos.json.
 *
 * Também converte o _redirects gerado por scripts/seo.js (sintaxe Netlify) para
 * o Pages:
 *  - "301!" vira "301" (o Pages não tem a marca de força);
 *  - somem os 301 de /pagina.html para /pagina (o Pages já faz isso sozinho);
 *  - some a regra "/* /404.html 404" (o Pages serve o 404.html sozinho, com status 404).
 *
 *   node scripts/build-dist.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const DIST = path.join(RAIZ, 'dist');

// arquivos soltos da raiz que o site precisa (além das páginas .html)
const ARQUIVOS_PUBLICOS = ['robots.txt', 'llms.txt', 'sitemap.xml', 'manifest.json', 'sw.js', '_headers', 'favicon.ico'];
// endereco-fiscal/: páginas por cidade geradas por scripts/paginas-cidade.js
// (/endereco-fiscal/<cidade>-<uf>). A pasta só existe depois de o script rodar.
const PASTAS_PUBLICAS = ['assets', 'endereco-fiscal'];

// páginas de uso interno que nunca vão para o ar (complementado por scripts/internos.json)
const INTERNOS_PADRAO = [
  'admin*.html', 'analytics-tags.html', 'checklist-publicacao.html', 'documentos.html', 'financeiro.html',
  'google-business-profile.html', 'guia-fotos-site.html', 'modelos-mensagens.html', 'perfil.html', 'reservas.html',
  'solicitacoes.html', 'login.html', 'cadastro.html', 'area-do-cliente.html', 'area-do-membro.html',
];

function lerInternos() {
  const arq = path.join(RAIZ, 'scripts', 'internos.json');
  if (!fs.existsSync(arq)) return INTERNOS_PADRAO;
  const extra = JSON.parse(fs.readFileSync(arq, 'utf8'));
  // formato: lista simples, ou { arquivos: [...], padroes: [...] } (as pastas já ficam fora: só assets/ é copiada)
  const lista = Array.isArray(extra) ? extra : [...(extra.arquivos || []), ...(extra.padroes || [])];
  return [...new Set([...INTERNOS_PADRAO, ...lista.map(String)])];
}

const paraRegex = (padrao) => new RegExp('^' + padrao.replace(/^\/+/, '').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i');

function copiar(origem, destino) {
  const st = fs.statSync(origem);
  if (st.isDirectory()) {
    fs.mkdirSync(destino, { recursive: true });
    for (const nome of fs.readdirSync(origem)) copiar(path.join(origem, nome), path.join(destino, nome));
  } else {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.copyFileSync(origem, destino);
  }
}

function converterRedirects(texto) {
  const saida = [];
  let removidos = 0;
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    const limpa = linha.trim();
    if (!limpa || limpa.startsWith('#')) { saida.push(linha); continue; }
    const partes = limpa.split(/\s+/);
    const [origem, destino, codigoBruto] = partes;
    const codigo = (codigoBruto || '301').replace('!', '');
    if (codigo === '404') { removidos++; continue; }
    if (/\.html$/i.test(origem) && destino === (origem.replace(/\.html$/i, '') || '/')) { removidos++; continue; }
    if (origem === '/index.html' && destino === '/') { removidos++; continue; }
    saida.push(`${origem} ${destino} ${codigo}`);
  }
  return { texto: saida.join('\n').replace(/\n{3,}/g, '\n\n'), removidos };
}

// ---------------------------------------------------------------------------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST);

const internos = lerInternos().map(paraRegex);
const ehInterno = (nome) => internos.some((re) => re.test(nome));

let paginas = 0;
const fora = [];
for (const nome of fs.readdirSync(RAIZ)) {
  const caminho = path.join(RAIZ, nome);
  if (!fs.statSync(caminho).isFile()) continue;
  const html = nome.endsWith('.html');
  if (!html && !ARQUIVOS_PUBLICOS.includes(nome)) continue;
  if (html && ehInterno(nome)) { fora.push(nome); continue; }
  copiar(caminho, path.join(DIST, nome));
  if (html) paginas++;
}
for (const pasta of PASTAS_PUBLICAS) {
  if (fs.existsSync(path.join(RAIZ, pasta))) copiar(path.join(RAIZ, pasta), path.join(DIST, pasta));
}

const origemRedirects = path.join(RAIZ, '_redirects');
let removidos = 0;
if (fs.existsSync(origemRedirects)) {
  const r = converterRedirects(fs.readFileSync(origemRedirects, 'utf8'));
  removidos = r.removidos;
  fs.writeFileSync(path.join(DIST, '_redirects'), r.texto, 'utf8');
}

console.log(`build-dist: ${paginas} página(s) publicadas, ${fora.length} interna(s) fora do ar, ${removidos} regra(s) de redirect dispensadas no Pages`);
if (fora.length) console.log(`build-dist: fora do ar -> ${fora.join(', ')}`);

