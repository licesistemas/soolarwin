# SolarCRM Pro — servidor de e-mail e exclusão de usuários

Este pacote adiciona funções seguras no Firebase para:

- enviar e-mail SMTP das etapas do projeto (`sendEmail`);
- testar o servidor SMTP (`testEmailServer`);
- excluir usuário da plataforma e do Firebase Authentication (`deletePlatformUser`);
- manter compatibilidade com aceite de proposta e fila de automações.

## 1. Preparar o projeto

Copie esta pasta para a raiz do seu projeto Firebase. Se quiser, renomeie `.firebaserc.example` para `.firebaserc` e confira o ID do projeto.

```bash
firebase use energiasolar-67b14
cd functions
npm install
cd ..
```

## 2. Configurar secrets SMTP

Execute um comando por vez e informe o valor quando o Firebase pedir:

```bash
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_SECURE
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set SMTP_FROM
```

Exemplos comuns:

- SMTP_PORT: `465` e SMTP_SECURE: `true`
- SMTP_PORT: `587` e SMTP_SECURE: `false`
- SMTP_FROM: `Nome da Empresa <contato@suaempresa.com.br>`

Nunca coloque senha SMTP dentro do `index.html`.

## 3. Publicar funções

```bash
firebase deploy --only functions
```

## 4. Testar no CRM

1. Publique o HTML atualizado.
2. Entre no CRM com um administrador aprovado.
3. Abra **Configurações → Servidor de e-mail**.
4. Informe um e-mail de teste e clique em **Enviar teste SMTP**.
5. Abra **E-mails das etapas** e crie regras por etapa do projeto.

## 5. Excluir usuário

No CRM, acesse **Configurações → Usuários e permissões** e clique em **Excluir usuário** na linha desejada.

A função bloqueia a exclusão do próprio usuário conectado e exige perfil de administrador ativo na empresa.
