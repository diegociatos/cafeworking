# Fotos individuais das salas privativas

Conferência do catálogo público em 18/09/2026: Savassi e Sion têm URLs de fotos distintas e acessíveis (HTTP 200); Lourdes e Serra retornam lista de fotos vazia. A página gravada no repositório e na prévia ainda tinha quatro cópias da mesma imagem ilustrativa.

Correções:

- Atualizada a página de salas privativas com as fotos públicas já vinculadas a Savassi e Sion.
- Salas sem foto própria mostram “Fotos em breve” e convite à visita. Não atribui fotos de outro ambiente por tamanho ou posição.
- O build usado pelo Cloudflare agora consulta o catálogo público e atualiza as vitrines em `dist/`, preservando os arquivos fonte. Catálogo indisponível conserva o snapshot publicado.
- CSS/JS do artefato recebem versão por conteúdo para evitar que o navegador use o renderizador antigo após uma publicação.
- Compra, visita, galeria e bloqueio de sala ocupada são preservados. Sem alteração no app, banco, Storage ou produção.

Lourdes e Serra ainda precisam de suas fotos próprias. O app já oferece Salas → Editar → Fotos da sala. A correspondência entre os arquivos históricos do site e esses nomes precisa ser confirmada antes de qualquer atribuição; não foi presumida.

Validação: 42 testes do site e build aprovados; navegador confirma fotos carregadas de Savassi/Sion e ausência de imagem/galeria nos cards sem foto. PR baseado na branch da auditoria do site (#1), para revisão antes de publicar.

Atualização 21/09/2026: foto original da Sala Serra enviada pelo proprietário, incluída em assets/img/sala-serra.png. Vinculada exclusivamente ao ID s1782410118483 quando o catálogo não tem foto; fotos futuras cadastradas no app têm prioridade. Apenas Lourdes continua sem foto identificada.

Atualização 21/09/2026: proprietário confirmou a foto da Sala Savassi, incluída sem alterações em assets/img/sala-savassi.png. O ID s1782420700809 usa essa imagem na capa e galeria, substituindo a associação anterior do catálogo apenas no site.
