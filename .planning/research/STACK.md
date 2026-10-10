# Stack Research — Zap MCP

**Domínio:** arquivo privado de uma conta pessoal do WhatsApp em uma VPS.
**Pesquisado:** 2026-10-10.
**Confiança:** MEDIUM — tier retornado pelo seam `classify-confidence` para Context7 e websearch, inclusive com `--verified`. Fontes primárias foram cruzadas com releases e registros; integração real ainda não executada.

## Recomendação

Usar **um serviço Node.js/TypeScript ESM com Baileys direto, Express, SQLite FTS5, arquivos locais e MCP Streamable HTTP**. Servir uma interface pequena em HTML/CSS/TypeScript no mesmo processo. Uma conexão WhatsApp; o site e o MCP consultam o arquivo persistido mesmo quando essa conexão cai. Não há necessidade de Chromium, PostgreSQL, Redis, armazenamento de objetos ou serviço de IA.

**Atualização de escopo recebida durante a pesquisa:** o MCP obrigatório do v1 é o **Codex desktop do usuário**. Compatibilidade com Claude fica futura/opcional. Portanto, começar com bearer token privado e revogável no Codex; não construir OAuth ou um provedor de identidade no v1 sem uma incompatibilidade demonstrada no cliente real.

## Recommended Stack

### Core Technologies

| Tecnologia | Versão verificada em 2026-10-10 | Função | Por que usar |
|---|---|---|---|
| Node.js | **24.21.0 LTS** | Serviço residente, HTTP, arquivos e streams | Linha LTS; satisfaz os requisitos dos pacotes selecionados. [Distribuição oficial](https://nodejs.org/dist/index.json), [calendário](https://github.com/nodejs/Release). |
| TypeScript | **7.0.2** | Tipagem e compilação para JavaScript | Tipos ajudam na evolução do protocolo e das mensagens; manter ESM e compilação simples. [Registro oficial](https://registry.npmjs.org/typescript). |
| Baileys, pacote `@whiskeysockets/baileys` | **7.0.0-rc14**, `latest`; **6.7.24**, `legacy` | Dispositivo vinculado por QR, eventos de histórico e mídia | Evita navegador e ponte externa. **7 ainda é release candidate**, mesmo sendo `latest`; fixar a versão e validar com a conta antes de produção. [Releases](https://github.com/WhiskeySockets/Baileys/releases), [registro](https://registry.npmjs.org/@whiskeysockets/baileys). |
| Express | **5.3.0** | Site, API privada, downloads e `/mcp` | Mesmo servidor para todas as superfícies; integração oficial do SDK. [Registro](https://registry.npmjs.org/express). |
| `better-sqlite3` + SQLite FTS5 | **13.0.3**; SQLite **3.53.4** na linha 13.0.2+ | Mensagens, contatos, busca, fila de mídia e sessão | Sem processo de banco adicional; transações e backup. Node >=22. [Release do driver](https://github.com/WiseLibs/better-sqlite3/releases/tag/v13.0.2), [registro](https://registry.npmjs.org/better-sqlite3), [FTS5](https://www.sqlite.org/fts5.html). |
| SDK MCP v2 | `@modelcontextprotocol/server` **2.3.1**, `node` **2.1.1**, `express` **2.0.2** | Tools/resources e transporte HTTP | **v2 já é estável**; os pacotes são separados. Não iniciar um projeto novo sobre exemplos antigos do SDK v1. [Repositório oficial](https://github.com/modelcontextprotocol/typescript-sdk), [documentação v2](https://ts.sdk.modelcontextprotocol.io/v2/). |
| Sistema de arquivos local | `node:fs` / `node:stream` do Node 24 | Anexos binários e arquivos temporários | Armazenamento persistente da VPS, com streaming e caminhos internos; downloads passam pela autenticação. |
| HTML/CSS e TypeScript de navegador | APIs nativas; compilador acima | Busca, leitor, abas de conversas e anexos | A interface solicitada não exige um segundo framework ou servidor. Abas são estado da interface; consultas paginadas evitam carregar o acervo inteiro. |

### Supporting Libraries

| Biblioteca | Versão verificada | Função | Quando usar |
|---|---|---|---|
| Zod | **4.6.5** | Validar filtros, paginação e entradas MCP | Nos limites HTTP/MCP; mesma definição de entrada para o serviço de consulta. [Registro](https://registry.npmjs.org/zod). |
| `qrcode` | **1.5.4** | Renderizar QR de pareamento | Apenas na tela autenticada do proprietário; QR não vai para logs. [Registro](https://registry.npmjs.org/qrcode), [pareamento oficial](https://baileys.wiki/authentication/qr-code). |
| `archiver` | **8.0.0** | ZIP com mensagens, manifesto e arquivos | Exportação por stream, com nomes sanitizados; anexos ausentes constam no manifesto. [Projeto](https://github.com/archiverjs/node-archiver), [registro](https://registry.npmjs.org/archiver). |

Preferir `node:crypto` para hash, geração de tokens e hash de senha; `node:test` para testes do servidor. Não adicionar ORM, cache distribuído ou uma biblioteca de filas para uma conta. Uma tabela de downloads pendentes com tentativas e limite de concorrência basta como decisão inicial.

### Infrastructure / Development Tools

| Ferramenta | Versão / decisão | Uso |
|---|---|---|
| Proxy HTTPS existente | Identificar na preparação da VPS | Reutilizar o proxy já disponível; preservar autenticação e limites dos downloads. |
| Caddy, se não houver proxy | **2.11.7** verificado; instalação ainda não feita | TLS automático e proxy para Node em loopback. [Release oficial](https://github.com/caddyserver/caddy/releases/tag/v2.11.7), [HTTPS](https://caddyserver.com/docs/automatic-https). |
| systemd | Versão da distribuição, ainda desconhecida | Um serviço residente com usuário dedicado, restart e diretório persistente. Docker somente se já for a convenção da VPS. |
| npm + lockfile | npm fornecido pelo runtime escolhido | Fixar dependências, revisar atualizações e reproduzir instalação com `npm ci`. |
| `node:test` + teste nos clientes reais | Node 24 / Codex instalado | Testar reconexão, idempotência, sessão, busca e autenticação; testar MCP e arquivos no Codex desktop efetivo. |

## Condições de implementação que afetam a escolha

### Sessão Baileys em produção

`useMultiFileAuthState` serve como referência e spike, **não como armazenamento de produção**. Implementar `AuthenticationState` no SQLite: credenciais em `creds.update`, todas as categorias de `keys.get/set`, exclusão de chaves nulas, transações e `BufferJSON.replacer/reviver`. `keys.set` deve persistir antes de resolver. Manter **um único processo proprietário/escritor da sessão**, inclusive durante reconexões e deploys. Guardar o estado fora do Git e das consultas do MCP, com permissões restritas e backup protegido. Não depender de salvar somente o arquivo de credenciais. [Documentação atual](https://baileys.wiki/authentication/session-management).

A linha 7 exige as chaves `lid-mapping`, `device-list` e `tctoken`. Preservar PN, LID, `remoteJidAlt` e `participantAlt` quando presentes; telefone não é a identidade primária universal. Resolver equivalências somente a partir de mapeamentos observados. O evento `lid-mapping.update` não é garantido em todos os casos; não basear o arquivo exclusivamente nele. [Migração v7](https://baileys.wiki/migration/v7).

A linha 6 é rotulada `legacy`, não uma escolha automaticamente mais segura para um projeto novo. Release notes recomendam migrar para 7 e registram correções de segurança nas linhas mantidas. Recomendo **rc14 fixado para o piloto**, seguido por teste de QR, reinício sem novo QR, DM/grupo com PN/LID e recebimento continuado. Se falhar de forma persistente, comparar whatsmeow com o mesmo conjunto real de mensagens antes de produzir a interface inteira. Não instalar uma branch móvel do GitHub. [Releases oficiais](https://github.com/WhiskeySockets/Baileys/releases).

A wiki também contém um [guia v8](https://baileys.wiki/migration/v8), mas ele declara **desenvolvimento ativo**, sem detalhes finais de migração. O registro npm consultado não contém versão 8 publicada e mantém os tags `latest=7.0.0-rc14` e `legacy=6.7.24`; a existência do guia não autoriza escolher v8 ou assumir nova autenticação disponível.

### Histórico, mídia e pesquisa

Solicitar `syncFullHistory` com perfil desktop, persistir `messaging-history.set` e eventos incrementais, e fornecer `getMessage` a partir do banco. `fetchMessageHistory` permite pedir dados anteriores ao celular; isso não demonstra cobertura ilimitada. O perfil `Browsers.macOS('Desktop')` é metadado de conexão, não execução de navegador. Medir volume e memória no primeiro pareamento. [Histórico](https://baileys.wiki/advanced/history-sync).

Para os anexos, usar `downloadMediaMessage(..., 'stream', ...)` e gravar o conteúdo descriptografado, não apenas a URL. Finalizar arquivo temporário antes de marcar `available`. Preservar tamanho, MIME, hash e estado de falha. Uma solicitação de reupload pode recuperar mídia ainda presente em outro dispositivo; não garante recuperação. [README da versão fixada](https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/README.md).

FTS5 com `unicode61 remove_diacritics 2` atende busca textual em português; datas e contato são filtros SQL indexados. FTS não é busca semântica nem correspondência arbitrária de substring. Usar SQL parametrizado, transações curtas, WAL e `busy_timeout`. Verificar `ENABLE_FTS5` na instalação da VPS. Exportações e cópias do banco precisam de um snapshot consistente; não copiar apenas o `.db` de um banco WAL ativo. [FTS5](https://www.sqlite.org/fts5.html), [WAL](https://www.sqlite.org/wal.html).

### Autenticação e compatibilidade MCP

**V1: Codex desktop.** HTTPS em `/mcp`, token aleatório dedicado, revogável e somente leitura, enviado no header `Authorization: Bearer`. Guardar somente hash/verificador no servidor; segredo em configuração privada ou variável de ambiente do cliente. Nenhum token em URL, Git ou conteúdo das tools. O site usa sessão própria com cookie `HttpOnly`, `Secure` e `SameSite`; a IA não recebe a senha do site.

O Codex documenta `bearer_token_env_var`, `http_headers` e `env_http_headers` em servidores Streamable HTTP. Preferir a variável privada onde o processo desktop realmente a recebe; caso a UI gerencie o header, usar seu armazenamento privado. **A documentação de configuração não comprova que o desktop instalado já recebeu o segredo:** a fase precisa demonstrar `initialize`, listagem de tools, busca, leitura de contexto e recuperação de um arquivo, além da negação com token ausente ou revogado. [Documentação oficial do Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

**Claude futuro:** em Claude Code é possível configurar headers no cliente; em claude.ai/app os request headers estão em beta limitada. Não prometer bearer universal nessa superfície. Se não houver esse campo, implementar OAuth authorization code com PKCE S256, descoberta de recurso/AS, clientes CIMD ou DCR, audience e refresh/revogação. Não reduzir o requisito expondo o arquivo sem autenticação. O conector remoto do Claude acessa a VPS da nuvem da Anthropic. [Disponibilidade dos headers](https://claude.com/docs/connectors/custom/add-unlisted#authenticate-with-request-headers), [OAuth e callbacks](https://claude.com/docs/connectors/building/authentication).

O SDK v2 verifica bearer no resource server. Os antigos helpers `mcpAuthRouter` de authorization server foram movidos para `server-legacy`; não copiar seu tutorial v1 como se fosse v2. Para token fixo do Codex, usar um gate explícito antes de **todos** os métodos do endpoint. Se optar pelo verifier do SDK, preencher corretamente expiração e resource exigidos pela versão atual. Uma evolução OAuth merece pesquisa própria; não é dependência do v1. [Autorização SDK v2](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/authorization.md).

## Installation

Comandos de referência para a fase de implementação; **não executados nesta pesquisa**. Revalidar releases/advisories antes de instalar e salvar o lockfile.

```bash
npm install --save-exact @whiskeysockets/baileys@7.0.0-rc14 express@5.3.0 better-sqlite3@13.0.3 @modelcontextprotocol/server@2.3.1 @modelcontextprotocol/node@2.1.1 @modelcontextprotocol/express@2.0.2 zod@4.6.5 qrcode@1.5.4 archiver@8.0.0
npm install -D --save-exact typescript@7.0.2 @types/node@24 @types/express@5 @types/better-sqlite3@9 @types/qrcode@1 @types/archiver@8
```

Usar `"type": "module"`; compilar servidor com resolução NodeNext e interface com módulos de navegador. Os majors dos tipos são resolvidos e fixados pelo comando, não são promessas de patch. Não instalar peers opcionais de geração de mídia — Sharp/Jimp/FFmpeg/link previews — para apenas guardar os arquivos recebidos.

## Alternatives Considered

| Escolha | Alternativa verificada | Quando a alternativa faria sentido |
|---|---|---|
| Baileys direto | **whatsmeow/Go**, módulo `v0.0.0-20261007111105-c386243a72ba` em consulta ao proxy Go | Se o piloto Baileys não mantiver sessão/PN-LID/mídia, ou se escolhermos escrever todo o serviço em Go. Tem sqlstore para SQLite e eventos de histórico. Uma ponte Go+Node exige mais um contrato/processo; não melhora automaticamente a cobertura. [Projeto](https://github.com/tulir/whatsmeow), [sqlstore](https://github.com/tulir/whatsmeow/blob/main/store/sqlstore/container.go), [versão observada](https://proxy.golang.org/go.mau.fi/whatsmeow/@latest). |
| Serviço próprio | **Evolution API 2.3.7** | Se o projeto evoluir para múltiplas contas, webhooks de vários sistemas e operações de mensagens. Hoje acrescenta API generalista, PostgreSQL/MySQL e Redis recomendado; continua usando Baileys na modalidade vinculada. [Repositório](https://github.com/evolution-foundation/evolution-api), [release](https://github.com/evolution-foundation/evolution-api/releases/tag/2.3.7). |
| Dispositivo vinculado pessoal | **Meta Cloud API / Coexistence** | Se o objetivo mudar para uma conta WhatsApp Business com onboarding suportado. A documentação oficial permite histórico 1:1 dos últimos 180 dias; exclui grupos, limita asset IDs de mídias históricas aos últimos 14 dias e exige sincronização em 24h. Requer Solution Partner/Tech Provider. Não atende como substituição geral do arquivo pessoal solicitado. [Meta: onboarding Business App](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users). |
| SDK MCP v2 | `@modelcontextprotocol/sdk` **1.32.1**, v1.x | Apenas se uma incompatibilidade real obrigar temporariamente; v1 recebe correções por pelo menos seis meses após a versão 2. Não misturar os imports. [Política atual](https://github.com/modelcontextprotocol/typescript-sdk). |

## What NOT to Use

| Evitar no v1 | Motivo | Substituição |
|---|---|---|
| whatsapp-web.js/Puppeteer/Chromium | Introduz navegador e contraria a conexão solicitada | Baileys direto |
| PostgreSQL, Redis, ORM e broker | Não há múltiplos escritores/contas nem carga que justifique processos adicionais | SQLite e fila persistente de downloads |
| Embeddings, vector DB, OCR, transcrição e IA hospedada | Fora do escopo; busca requerida é textual e os clientes fazem análise | FTS5 e recuperação de contexto |
| S3/MinIO para o acervo | Outro serviço sem necessidade medida | Volume local persistente e backup |
| Sessão de WhatsApp só em memória / auth multifile em produção | Reinícios ou atualização de chaves podem quebrar continuidade | AuthenticationState transacional no SQLite |
| OAuth/IdP obrigatório antecipado | Cliente obrigatório atual é Codex com headers documentados | Token revogável, com teste real |

## Version Compatibility

| Combinação | Situação verificada | Verificação ainda necessária |
|---|---|---|
| Node 24 + Baileys rc14 | Baileys declara Node >=20 e ESM | Binários transitivos, pareamento e reconexão na CPU/OS da VPS |
| Node 24 + better-sqlite3 13 | Driver declara Node >=22 | Prebuild da plataforma, FTS5 e restore de backup |
| MCP server 2.3.1 + node 2.1.1 + express 2.0.2 | Adapters declaram peer `server ^2.3.0`; Express aceita v5 | Cliente Codex instalado negociando a versão do protocolo |
| Zod 4.6.5 + MCP v2 | Schemas v2 usam Standard Schema; documentação usa Zod v4 | Compilação dos schemas concretos |
| TypeScript 7.0.2 + pacote ESM | Versão publicada confirmada; tipos dos pacotes disponíveis | Build integrado ainda não realizado |

## Incertezas exatas e impacto no roadmap

1. **Conta real:** cobertura inicial, pedidos adicionais de histórico e recuperação dos quatro tipos de arquivo ainda não testados. Fazer piloto antes da interface completa; nenhuma promessa de histórico integral.
2. **Baileys rc14:** é prerelease e depende de protocolo não oficial; a sessão pode cair e a conta pode sofrer restrições. Consulta ao arquivo já salvo deve continuar funcionando. Não existe garantia de risco zero por ser somente leitura.
3. **VPS:** sistema, CPU, disco livre, domínio e proxy desconhecidos. Validar prebuilds, capacidade e backup antes de escolher formato de implantação.
4. **Codex:** versão/configuração efetiva do desktop e acesso aos binários por MCP não verificados. Não tratar retorno de URL ou recurso listado como prova de que o cliente recebeu o arquivo; testar bytes/hash de um anexo real.
5. **Claude:** beta de headers e OAuth não validados na conta; não bloqueiam v1 depois da atualização de escopo.
6. **APIs versus exemplos:** a wiki do Baileys agora usa URLs sem `/docs/socket/`; README antigo contém exemplos defasados. Tipos e código da versão fixada decidem os detalhes de eventos durante implementação.

## Sources

Fontes primárias consultadas via Context7, navegação oficial e metadados dos registros, com datas de publicação verificadas. As URLs de npm neste documento são registros originais, não forks nem tutoriais. As versões de pacotes listadas foram publicadas antes de 2026-10-10. Os digests foram salvos pelo seam `research-store`.

- [Baileys docs atuais](https://baileys.wiki/) e [releases](https://github.com/WhiskeySockets/Baileys/releases) — pareamento, sessão, PN/LID, histórico e estado RC/legacy.
- Context7 `/whiskeysockets/baileys.wiki-site` e `/modelcontextprotocol/typescript-sdk` — interfaces e exemplos; cruzados com documentação atual.
- [SQLite FTS5](https://www.sqlite.org/fts5.html), [WAL](https://www.sqlite.org/wal.html), [better-sqlite3](https://github.com/WiseLibs/better-sqlite3/releases) — busca e persistência.
- [SDK MCP](https://github.com/modelcontextprotocol/typescript-sdk), [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [Claude auth](https://claude.com/docs/connectors/building/authentication) — transporte, versões e diferenças entre clientes.
- [Meta Coexistence](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users) — página obtida diretamente por HTTP após falha do extrator web; limitações comerciais e de histórico verificadas no conteúdo oficial.

---
*Pesquisa de stack para Zap MCP; nenhuma dependência instalada, conta vinculada ou código de aplicação criado.*
