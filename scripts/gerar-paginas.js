#!/usr/bin/env node
/**
 * Gera paginas novas reaproveitando o cabecalho e o rodape do site.
 *
 * O conteudo de cada pagina fica em scripts/conteudo/<arquivo>.html (so o
 * miolo, o que vai dentro de <main>). Este script monta o HTML completo com
 * o mesmo header/footer das demais paginas e grava na raiz.
 *
 * Depois de rodar, rode tambem "node scripts/seo.js" para aplicar
 * title/description/canonical/JSON-LD nas paginas novas.
 *
 *   node scripts/gerar-paginas.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const CONTEUDO = path.join(__dirname, 'conteudo');

const modelo = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

const iBody = modelo.indexOf('<body>');
const iHeaderFim = modelo.indexOf('</header>') + '</header>'.length;
const iMainFim = modelo.indexOf('</main>');

const CABECALHO = modelo.slice(iBody + '<body>'.length, iHeaderFim);
const RODAPE = modelo.slice(iMainFim + '</main>'.length);

if (!fs.existsSync(CONTEUDO)) {
  console.log('nada a gerar: scripts/conteudo/ nao existe');
  process.exit(0);
}

const arquivos = fs.readdirSync(CONTEUDO).filter((f) => f.endsWith('.html'));
let n = 0;

for (const arq of arquivos) {
  const miolo = fs.readFileSync(path.join(CONTEUDO, arq), 'utf8');
  const html =
    '<!doctype html><html lang="pt-BR"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>CafeWorking</title>' +
    '<link rel="stylesheet" href="assets/css/style.css">' +
    '<script defer src="assets/js/main.js"></script>' +
    '</head><body>' +
    CABECALHO +
    '<main>\n' + miolo.trim() + '\n</main>' +
    RODAPE;

  fs.writeFileSync(path.join(RAIZ, arq), html, 'utf8');
  console.log(`ok  ${arq}`);
  n++;
}

console.log(`\n${n} pagina(s) gerada(s). Rode agora: node scripts/seo.js`);
