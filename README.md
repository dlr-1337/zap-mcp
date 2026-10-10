# Zap MCP

Arquivo privado de WhatsApp na própria VPS, com consulta pelo site e acesso somente leitura pelo Codex via MCP. A conexão será feita como dispositivo vinculado, sem manter um navegador com WhatsApp Web aberto.

## Status

Projeto em planejamento. Este repositório contém a definição do produto, a pesquisa técnica, 32 requisitos e um roadmap de quatro fases. A aplicação ainda não está implementada; não há instruções de instalação de um produto funcional.

## Escopo da primeira versão

- **Guardar:** arquivar mensagens e os arquivos reais de áudio, imagem, vídeo e documento que a integração conseguir acessar.
- **Consultar:** pesquisar por contato, palavra ou período, abrir conversas em abas e exportar mensagens com os anexos disponíveis.
- **Usar no Codex:** localizar conversas, recuperar contexto e obter arquivos por MCP privado e somente leitura.

Uma conta e um proprietário. O site e o MCP consultam o arquivo persistido; não oferecem envio, edição, exclusão ou confirmação de leitura no WhatsApp. A integração pode recuperar apenas parte do histórico e das mídias, e esses limites devem aparecer nas consultas.

## Roadmap

1. Arquivo privado com mensagens e mídias reais.
2. Busca, contexto, abas e exportação no site.
3. Consulta e recuperação de arquivos no Codex.
4. Operação, backup e restauração na VPS.

Veja o [contexto do projeto](.planning/PROJECT.md), os [requisitos](.planning/REQUIREMENTS.md), o [roadmap completo](.planning/ROADMAP.md) e a [pesquisa técnica](.planning/research/SUMMARY.md).

## Privacidade

O repositório público contém o código e os documentos do projeto. Mensagens reais, anexos, bancos, sessões de WhatsApp, credenciais e exportações devem permanecer no ambiente privado e fora do Git. As regras de exclusão estão em [.gitignore](.gitignore); todo material novo precisa respeitar essa separação.

Direção técnica pesquisada: um serviço Node.js/TypeScript com Express, Baileys, SQLite FTS5, arquivos locais e MCP autenticado. As versões e a compatibilidade ainda precisam de validação durante a implementação.
