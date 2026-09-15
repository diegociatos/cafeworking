/**
 * Configuração da loja do site (contratação pelo app do CafeWorking).
 * Tudo aqui é público: a chave anon só lê o catálogo e chama as funções
 * públicas; quem decide preço e cobra é o servidor.
 *
 * turnstileSiteKey: widget "CafeWorking - contratacao pelo site" (Cloudflare,
 * conta diegociatos@gmail.com), liberado para cafeworking.com.br e
 * www.cafeworking.com.br. A chave secreta fica só no Supabase
 * (TURNSTILE_SECRET_KEY). Para testar em localhost, use a chave de teste
 * 1x00000000000000000000AA.
 */
(function (raiz) {
  var cfg = {
    supabaseUrl: 'https://lmgbysfrbtgqzbtouzft.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZ2J5c2ZyYnRncXpidG91emZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDM4MDIsImV4cCI6MjA5NjA3OTgwMn0.Zk6t4ROA45jNhP2Zo8YK3Mb9PDUhBP3mjS9YAbMegMM',
    turnstileSiteKey: /^(localhost|127\.0\.0\.1)$/.test((raiz.location && raiz.location.hostname) || '')
      ? '1x00000000000000000000AA'
      : '0x4AAAAAAE0Ouo1U5AMh92-D',
    appUrl: 'https://app.cafeworking.com.br',
    // unidade que abre primeiro nas vitrines quando o visitante ainda não escolheu
    unidadePrincipal: 'un_cafeworkingluxembu_e78be3',
    whatsapp: '5531997129789',
  };
  if (typeof module === 'object' && module.exports) module.exports = cfg;
  else raiz.CW_LOJA = cfg;
})(typeof self !== 'undefined' ? self : this);
