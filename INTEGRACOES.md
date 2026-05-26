# Integrações — CafeWorking

## 1. Leads para Power Automate

O projeto já possui a função:

`/.netlify/functions/lead-webhook`

Ela recebe os formulários do site e encaminha para o Power Automate quando a variável abaixo estiver configurada no Netlify:

`POWER_AUTOMATE_LEAD_WEBHOOK`

### Como configurar

1. No Netlify, abra o site.
2. Vá em **Site configuration > Environment variables**.
3. Crie a variável `POWER_AUTOMATE_LEAD_WEBHOOK`.
4. Cole o link do fluxo do Power Automate.
5. Faça novo deploy.

## 2. Reservas

A função:

`/.netlify/functions/reserva-webhook`

usa a variável `POWER_AUTOMATE_RESERVA_WEBHOOK`.

Se ela não existir, usa `POWER_AUTOMATE_LEAD_WEBHOOK` como fallback.

## 3. Formulários Netlify

Os formulários continuam preparados para Netlify Forms e também salvam uma cópia local para testes no painel Admin.

## 4. Próxima etapa técnica

Para transformar em sistema real, escolher uma base:

- Supabase: autenticação, banco e upload;
- Firebase: autenticação e banco realtime;
- Backend próprio: Node/Fastify/PostgreSQL.

Recomendação para o CafeWorking: **Supabase + Netlify Functions** na primeira fase.
