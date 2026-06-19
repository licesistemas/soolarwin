# SolarCRM Pro v2.9.7 — Portal do cliente por CPF

Esta versão remove a IA/OpenAI e remove o envio automático de mensagens por status do projeto.

## Arquivos principais

- `index.html`: sistema administrativo.
- `cliente.html`: página pública para o cliente consultar o projeto pelo CPF/CNPJ.
- `firestore.rules`: regras com leitura pública limitada ao documento exato do CPF/CNPJ.
- `storage.rules`: regras de arquivos do sistema.

## Como publicar

1. Suba todos os arquivos para o GitHub Pages ou Firebase Hosting.
2. Publique `firestore.rules` no Firebase Console.
3. Publique `storage.rules` no Firebase Console.
4. No CRM, abra uma obra, informe o CPF/CNPJ do cliente e clique em **Publicar status no portal**.
5. Envie ao cliente o link `cliente.html`.

## Segurança

O portal não lista projetos. Ele só faz `get` no documento cujo ID é o CPF/CNPJ digitado. Quem souber o CPF/CNPJ conseguirá consultar o status publicado, portanto publique apenas dados que podem ser vistos pelo cliente.
