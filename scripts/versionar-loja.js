#!/usr/bin/env node
/**
 * Carimba a versão nos scripts da loja e no style.css (?v=...) nas páginas e nos fragmentos.
 *
 * O _headers deixa JS em cache por 1 hora. Sem a versão no endereço, quem já
 * visitou o site continua com o script antigo depois de uma publicação.
 * A versão é o hash do conteúdo dos scripts: só muda quando eles mudam.
 *
 *   node scripts/versionar-loja.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const SCRIPTS = ['loja-config', 'cards-plano', 'vitrine', 'contratar', 'pagamento', 'agenda-sala', 'reservar-sala', 'galeria-sala'];

const hash = crypto.createHash('sha256');
// quebras de linha normalizadas: Windows (CRLF) e a Netlify (LF) geram a mesma versão
for (const nome of SCRIPTS) hash.update(fs.readFileSync(path.join(RAIZ, 'assets/js', `${nome}.js`), 'utf8').replace(/\r\n/g, '\n'));
const versao = hash.digest('hex').slice(0, 10);

const padrao = new RegExp(`(src="assets/js/(?:${SCRIPTS.join('|')})\\.js)(?:\\?v=[0-9a-f]+)?"`, 'g');
// o CSS também fica 1 hora em cache: versão própria, muda só quando ele muda
const versaoCss = crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(RAIZ, 'assets/css/style.css'), 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 10);
const padraoCss = /(href="assets\/css\/style\.css)(?:\?v=[0-9a-f]+)?"/g;
const pastas = [RAIZ, path.join(RAIZ, 'scripts/conteudo')];
let alterados = 0;
for (const pasta of pastas) {
  for (const arq of fs.readdirSync(pasta).filter((f) => f.endsWith('.html'))) {
    const caminho = path.join(pasta, arq);
    const html = fs.readFileSync(caminho, 'utf8');
    const novo = html.replace(padrao, `$1?v=${versao}"`).replace(padraoCss, `$1?v=${versaoCss}"`);
    if (novo !== html) {
      fs.writeFileSync(caminho, novo, 'utf8');
      alterados++;
    }
  }
}
console.log(`versionar-loja: js v=${versao}, css v=${versaoCss} em ${alterados} arquivo(s)`);
