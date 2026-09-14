/**
 * Configuração da loja do site (contratação pelo app do CafeWorking).
 * Tudo aqui é público: a chave anon só lê o catálogo e chama as funções
 * públicas; quem decide preço e cobra é o servidor.
 *
 * turnstileSiteKey: chave de TESTE do Cloudflare (sempre passa). Trocar pela
 * chave real no go-live, junto com o secret TURNSTILE_SECRET_KEY no Supabase.
 */
(function (raiz) {
  var cfg = {
    supabaseUrl: 'https://lmgbysfrbtgqzbtouzft.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZ2J5c2ZyYnRncXpidG91emZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDM4MDIsImV4cCI6MjA5NjA3OTgwMn0.Zk6t4ROA45jNhP2Zo8YK3Mb9PDUhBP3mjS9YAbMegMM',
    turnstileSiteKey: '1x00000000000000000000AA',
    appUrl: 'https://app.cafeworking.com.br',
    whatsapp: '5531997129789',
  };
  if (typeof module === 'object' && module.exports) module.exports = cfg;
  else raiz.CW_LOJA = cfg;
})(typeof self !== 'undefined' ? self : this);
