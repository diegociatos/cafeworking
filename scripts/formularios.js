#!/usr/bin/env node
/**
 * formularios.js - normaliza os formularios de captacao (class="lead-form").
 *
 * O site tinha dois padroes convivendo: contato.html e agendar-visita.html com
 * pagina de obrigado e protecao contra robo, e as quatro landing pages sem
 * nenhum dos dois. Este script deixa todos iguais:
 *
 *   1. action="obrigado.html"        -> quem envia cai na pagina de obrigado do
 *                                       site (e nao na tela generica da Netlify),
 *                                       que e onde da para medir conversao.
 *   2. netlify-honeypot="bot-field"  -> campo isca escondido; a Netlify descarta
 *      + <input name="bot-field">       o envio se ele vier preenchido.
 *   3. type/inputmode/autocomplete   -> no celular o campo de WhatsApp abre o
 *                                       teclado numerico e o navegador oferece
 *                                       preenchimento automatico de nome,
 *                                       telefone, e-mail e empresa.
 *
 * Nao mexe em action ja definido (o admin-leads.html aponta para si mesmo de
 * proposito) nem em formulario que nao tenha a classe lead-form.
 *
 *   node scripts/formularios.js
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const DESTINO_PADRAO = 'obrigado.html';

/* Como preencher cada campo, pelo atributo name. A ordem importa: o primeiro
 * padrao que casar com o name e o que vale. */
const CAMPOS = [
  { re: /^(whatsapp|telefone|celular|fone)$/i, attrs: { type: 'tel', inputmode: 'tel', autocomplete: 'tel' } },
  { re: /^e-?mail$/i, attrs: { type: 'email', autocomplete: 'email' } },
  { re: /^(nome|nome-completo)$/i, attrs: { autocomplete: 'name' } },
  { re: /^(empresa|razao-social)$/i, attrs: { autocomplete: 'organization' } },
];

const ISCA = '<p class="hidden"><label>Não preencha: <input name="bot-field"></label></p>';

const temAtributo = (tag, nome) => new RegExp('[\\s]' + nome + '[\\s]*=', 'i').test(tag);

const relatorio = { action: 0, honeypot: 0, campos: 0, paginas: 0 };

/* ---------- campos ---------- */

function ajustarCampo(tag) {
  const nome = (tag.match(/\sname\s*=\s*"([^"]+)"/i) || [])[1];
  if (!nome) return tag;
  const regra = CAMPOS.find(c => c.re.test(nome));
  if (!regra) return tag;

  let saida = tag;
  for (const [attr, valor] of Object.entries(regra.attrs)) {
    // type so entra se nao houver outro definido: trocar o type de um campo
    // existente poderia mudar validacao que alguem escolheu de proposito.
    if (temAtributo(saida, attr)) continue;
    saida = saida.replace(/^<input/i, `<input ${attr}="${valor}"`);
    relatorio.campos++;
  }
  return saida;
}

/* ---------- formulario ---------- */

function ajustarFormulario(bloco) {
  const abertura = bloco.match(/^<form[^>]*>/i)[0];
  let novaAbertura = abertura;

  if (!temAtributo(abertura, 'action')) {
    novaAbertura = novaAbertura.replace(/^<form/i, `<form action="${DESTINO_PADRAO}"`);
    relatorio.action++;
  }
  if (!temAtributo(abertura, 'netlify-honeypot')) {
    novaAbertura = novaAbertura.replace(/^<form/i, '<form netlify-honeypot="bot-field"');
  }

  let corpo = bloco.slice(abertura.length);
  if (!/name="bot-field"/i.test(corpo)) {
    // logo depois do input escondido form-name, para ficar junto dos metadados
    if (/<input type="hidden" name="form-name"[^>]*>/i.test(corpo)) {
      corpo = corpo.replace(/(<input type="hidden" name="form-name"[^>]*>)/i, `$1\n${ISCA}`);
    } else {
      corpo = `\n${ISCA}` + corpo;
    }
    relatorio.honeypot++;
  }

  corpo = corpo.replace(/<input\b[^>]*>/gi, ajustarCampo);
  return novaAbertura + corpo;
}

/* ---------- execucao ---------- */

const paginas = fs.readdirSync(RAIZ).filter(f => f.endsWith('.html'));

for (const pagina of paginas) {
  const caminho = path.join(RAIZ, pagina);
  const antes = fs.readFileSync(caminho, 'utf8');

  const depois = antes.replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, bloco => {
    const abertura = bloco.match(/^<form[^>]*>/i)[0];
    if (!/class="[^"]*\blead-form\b/i.test(abertura)) return bloco;
    return ajustarFormulario(bloco);
  });

  if (depois !== antes) {
    fs.writeFileSync(caminho, depois, 'utf8');
    relatorio.paginas++;
  }
}

console.log(
  `formularios.js: ${relatorio.paginas} paginas alteradas; ` +
  `${relatorio.action} action adicionados; ${relatorio.honeypot} campos-isca; ` +
  `${relatorio.campos} atributos de campo`
);
