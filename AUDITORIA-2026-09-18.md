# Auditoria e melhorias — site CafeWorking

Base: `ed41f3392c201b9e7305568e27dd94449628b7a2`. O diagnóstico integrado está no PR correspondente de `diegociatos/appcafeworking`, arquivo `docs/AUDITORIA-2026-09-18.md`.

## Alterações

- Home com fotografia real, linguagem acolhedora, localização e cafeteria aberta ao público. Reserva e planos como ações principais; conteúdo comercial e preços existentes preservados.
- Atalho de teclado para conteúdo e respeito à preferência de movimento reduzido.
- Cache offline não intercepta checkout, pagamentos, API ou URLs com tokens; versão do cache incrementada para descartar cache anterior.
- `npm run check` restaurado: verifica links/recursos locais em `dist`, rotas limpas e redirects exatos.
- `npm run build` empacota o conteúdo estático existente para validação local. O pipeline remoto completo continua o do `wrangler.toml`, que atualiza vitrine e cidades antes de empacotar.

## Evidências

Baseline: 40 testes passaram; check falhou porque o script estava ausente. Final: 41 testes passaram, build aprovado, 74 páginas verificadas sem referências locais ausentes. O build exclui 27 páginas internas da raiz. Verificação visual da home em desktop e celular de 390 px sem rolagem horizontal. Teste de regressão de cache incluído.

## Prioridades restantes

1. Validar integração real em homologação: disponibilidade → reserva/contratação → pagamento Asaas → acesso ao app → recepção. Não houve pagamento, envio de formulário, e-mail ou alteração do Supabase nesta revisão.
2. Confirmar infraestrutura ativa: há Cloudflare Pages Functions, Netlify Functions/config antiga, `netlify-cli: latest` e `netlify dev`. Não remover caminhos antigos sem confirmar ambientes dependentes. O script antigo `formularios.js` ainda produz atributos Netlify.
3. Monitorar catálogo: vitrine e cidades preservam HTML anterior em falha de rede. Revisar preços fixos da home contra catálogo publicado; nenhum preço foi modificado nesta entrega.
4. SEO: home tem title, description, canonical, Open Graph e localização; site tem robots/sitemap e páginas por cidade. Conferir indexação, consistência dos dados locais e conteúdo gerado no ambiente publicado. O check é local e não testa Google, links externos ou fragmentos.
5. Performance/acessibilidade: consolidar CSS extenso e sobrescrito, medir Core Web Vitals e realizar navegação por teclado/leitor de tela em todo checkout. A revisão visual não equivale a auditoria WCAG completa.
6. As funções legadas de webhook podem responder `ok: true` sem webhook configurado. Os formulários atuais em `lead-form.js` usam Supabase; conferir consumidores antigos antes de desativá-los.

Segredos ficam no servidor/ambiente: webhooks Power Automate e hook de deploy Cloudflare. Chave pública Supabase/Turnstile pode ficar no cliente; service role, Asaas e credenciais de e-mail jamais. Nenhum valor é registrado aqui.

Mudanças somente em branch de revisão, sem merge ou deploy.
