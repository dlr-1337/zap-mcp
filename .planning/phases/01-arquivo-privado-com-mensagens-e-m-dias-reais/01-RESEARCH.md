# Phase 1: Arquivo privado com mensagens e mídias reais - Research

**Researched:** 2026-10-10  
**Domain:** arquivo privado WhatsApp por dispositivo vinculado, sessão transacional, eventos, originais binários e leitura HTTP autenticada  
**Confidence:** MEDIUM — tier retornado por classify-confidence para Context7 e websearch com --verified. Fontes primárias e tag foram conferidas; build integrado, conta e VPS não foram testados.

<user_constraints>
## User Constraints (from CONTEXT.md)

Texto copiado literalmente do contexto aprovado da fase; estas são decisões de produto, não evidência de integração executada.

### Locked Decisions

### Decisões anteriores mantidas
- Uma conta, um proprietário e um coletor; somente leitura no WhatsApp e nenhuma confirmação de leitura oferecida por qualquer interface.
- Acervo local é a fonte de consulta; queda do WhatsApp impede novas capturas, sem impedir acesso ao material persistido.
- Um serviço Node.js/TypeScript ESM, Express, SQLite e arquivos privados é a direção pesquisada. Baileys fixado precisa de revalidação de release, correções e APIs antes da instalação; recomendação anterior não comprova compatibilidade.
- Todas as categorias de chaves e credenciais precisam de persistência transacional; `useMultiFileAuthState` não será armazenamento de produção.
- Conteúdo recebido é dado não confiável. Não expor sessão, chaves de mídia, envelopes brutos, caminhos internos ou segredos em interfaces, Git, logs ou evidências públicas.

### Entrada privada do proprietário
- **D-01:** Senha local de um proprietário, sem cadastro público ou IdP adicional.
- **D-02:** Sessão de navegador privada e revogável no servidor, sem credencial em URL ou armazenamento acessível ao conteúdo das conversas.
- **D-03:** Invalidar a sessão do site; manter o coletor e o acervo. Sair do site não desvincula o WhatsApp.
- **D-04:** Redefinição operacional local com acesso autorizado ao host; sem recuperação por e-mail nem painel de usuários no v1.

### QR e reconexão
- **D-05:** Somente na tela autenticada, com validade atual e instrução de ler em Dispositivos conectados no celular; nunca em logs.
- **D-06:** Distinguir aguardando pareamento, conectando, conectado, reconectando, desconectado e sessão inválida, sem associar conectado a histórico completo.
- **D-07:** Reconectar automaticamente com espera e tentativas limitadas; pedir novo QR apenas quando a sessão de fato deixar de ser válida.
- **D-08:** Conservar mensagens e anexos e explicar a necessidade de novo pareamento; nunca limpar acervo para reconectar.

### Cobertura, alterações e conteúdo temporário
- **D-09:** Receber todo histórico disponibilizado pelo vínculo, sem recorte local arbitrário nem promessa de janela integral; pedidos extras só se suportados e necessários ao piloto.
- **D-10:** Conservar localmente por prazo indeterminado o material efetivamente capturado e revisões/revogações observadas, distinguindo estado atual e registro anterior; sem expurgo automático no v1.
- **D-11:** Não contornar restrições: temporárias recebidas normalmente podem ser arquivadas com indicação; visualização única fica em metadados e indisponibilidade, sem abrir ou baixar por bypass.
- **D-12:** Mostrar última ingestão, intervalo de instantes observados, lotes e falhas; usar não encontrado no acervo e separar lote concluído de cobertura da conta.

### Anexos, fila e falta de espaço
- **D-13:** Bytes originais disponíveis dos quatro tipos, desde a ingestão, mantendo legenda/nome recebidos e sem transcodificação preventiva.
- **D-14:** Distinguir pendente, disponível verificado, falha recuperável e indisponível, com motivo seguro e tentativas; falha não esconde a mensagem.
- **D-15:** Recuperar fila persistente, reconciliar temporários e arquivos finais e repetir downloads recuperáveis com concorrência e tentativas limitadas; sem painel extra de gerenciamento.
- **D-16:** Pausar downloads e sinalizar falta de espaço; preservar binários e mensagens já gravados, admitir que falha de ingestão não foi arquivada e nunca apagar automaticamente para liberar espaço.

### Leitura básica e aceite do piloto
- **D-17:** Interface simples com estado de conexão, lista de conversas, uma conversa por vez, mensagens e acesso privado ao original disponível; leitura limitada e ordenada sem carregar todo o acervo.
- **D-18:** Autor/direção, data original em America/Sao_Paulo, referência, tipo, texto/legenda, citação recebida, alterações e estados de anexo; campos desconhecidos explícitos e homônimos distintos.
- **D-19:** Só após preparar e conferir cópia privada recuperável e exclusividade do coletor; manter consulta sem coletor para testes e restauração.
- **D-20:** Comparar conversa conhecida e exemplos reais acessíveis dos quatro tipos com o celular, incluir grupo/direção recebida-enviada, testar leitura offline e reinício; falta de acesso, QR ou amostra mantém aceite pendente.

### the agent's Discretion

- Escolher estrutura de módulos, schema/migrações, biblioteca mínima de sessão/QR, layout e números iniciais de fila/tentativas/reserva de disco com base na pesquisa da versão real e recursos medidos; registrar limites efetivos sem criar telas extras.
- Login e transporte devem falhar fechados. Acesso direto por ID/URL também exige autenticação; downloads usam identificadores internos seguros e saída de conteúdo protegida. O planejador especifica os testes correspondentes.
- Reutilizar proxy/supervisão existentes após identificar o ambiente. Desenvolver e testar localmente enquanto VPS/domínio não estiverem identificados; não substituir evidência real por simulação.
- Sessão válida deve sobreviver a reinícios; divergência entre banco/filesystem exige reconciliação, e a instância de restauração nunca inicia outro coletor automaticamente.

### Deferred Ideas (OUT OF SCOPE)

Nenhuma capacidade nova adicionada. Mantidas as separações do roadmap:
- Fase 2: busca/período/contexto/abas, preview completo e ZIP de exportação.
- Fase 3: MCP e entrega binária efetiva no Codex instalado.
- Fase 4: supervisão/HTTPS final, backup recorrente fora da VPS e restauração/aceite completo.
- V2: Claude e importador apenas se uma lacuna real essencial justificar.
- Sem envio, exclusão remota, OCR, transcrição, embeddings, IA hospedada, múltiplas contas ou IdP preventivo.
</user_constraints>

## Project Constraints (from AGENTS.md)

Diretivas extraídas do AGENTS.md lido nesta sessão. [CITED: AGENTS.md]

- Comunicar em pt-BR, trabalhar autonomamente no objetivo e exigir intervenção apenas quando indispensável, como QR no celular.
- Preservar dados, trabalhos e segredos; usar mudanças recuperáveis e verificar resultados.
- Administração necessária usa sudo -n; antes de pedir senha, testar sudo -n -k id -u; preservar a política de segurança.
- Uma conta, um proprietário, um coletor e conexão sem navegador; Claude é futuro.
- Node.js 24 LTS/TypeScript ESM, Express, SQLite e mídia privada; revalidar Baileys antes de instalar. Não usar auth multifile em produção.
- Persistir credenciais e todas as categorias de chaves transacionalmente, com único escritor.
- Reutilizar proxy/supervisão existentes; sem Chromium, Redis, PostgreSQL, vector DB, OCR, transcrição, IA hospedada ou IdP adicional.
- Arquivar apenas o efetivamente recebido; preservar IDs, autoria, instante original, citações, PN/LID, alterações e estados. Não inventar campos nem completude.
- Exibição/filtros explícitos em America/Sao_Paulo, preservando o instante original.
- Autenticar QR e todas as superfícies desde a primeira exposição. Tratar conversas/anexos como dados não confiáveis.
- Não expor segredos, sessão, media keys, envelopes brutos ou caminhos arbitrários em interfaces, Git, logs ou exportações.
- Sem envio, edição, exclusão ou confirmação de leitura no WhatsApp; impedir efetivamente as operações.
- Coletor detém sozinho a sessão/socket; leitores usam o arquivo local mesmo desconectado.
- Downloads começam na ingestão, usam stream/temporário/integridade/fila recuperável e reconciliação banco–filesystem; falha não apaga mensagens.
- Conferir cópia privada recuperável antes do piloto; backup final inclui banco/mídia/sessão, cópia protegida externa e restauração isolada sem segundo coletor.
- Seguir STATE/ROADMAP e decisões do usuário; discussão, pesquisa, verificação/Nyquist/TDD proporcionais e controles visuais habilitados.
- Executores paralelos usam worktrees; integração no ramo atual; planejamento versionado, cache ignorado; sem tags automáticas; Intel/Graphify desligados.
- Planejamento, fixtures, QR e URL não concluem requisitos; verificar replay, reconexão, mídia, autenticação e restauração conforme o risco.

## Summary

Use um único serviço com o coletor encapsulado, dois arquivos SQLite privados (auth e acervo), mídia em disco e site nativo pequeno. Essa divisão atende a fronteira já decidida: consultas nunca precisam da sessão e continuam funcionando offline; separar auth reduz o risco de exportar segredos por acidente. É uma recomendação dentro da discrição concedida, não uma arquitetura já executada. [CITED: 01-CONTEXT.md D-01–D-20; .planning/research/ARCHITECTURE.md]

A recomendação Baileys foi revalidada: npm mantém `@whiskeysockets/baileys@7.0.0-rc14`; npm gitHead e a tag oficial resolvem para `7e7b0757e3f9f3c7789fb1cfd2f241d5002a199a`. Publicação npm em 2026-07-29, release GitHub em 2026-07-29T01:14:09Z. O JSON GitHub marca `prerelease: false`, mas o nome SemVer continua rc14: não chamar de 7 estável. O pacote da tag se chama `baileys`; o tarball npm scoped se chama `@whiskeysockets/baileys`. Use o scoped confirmado no README e no registry; não instalar master. [VERIFIED: npm registry; legitimidade OK e README oficial da tag] [CITED: https://github.com/WhiskeySockets/Baileys/releases/tag/v7.0.0-rc14]

Os maiores riscos para o plano são perda de chaves, descarte de lote FULL pelo default, restrições de visualização única abertas pelo normalizador, replay anulando revisão, erro de stream tratado como sucesso e conjunto de backup inconsistente. O parecer documental não valida a conta: o piloto deve comparar conversa conhecida e quatro originais reais no celular, testar reinício e leitura offline, e registrar lacunas sem concluir requisitos ausentes. [CITED: fontes da tag detalhadas abaixo; 01-CONTEXT.md D-19/D-20]

**Primary recommendation:** complete primeiro auth durável + ingestão e fila + leitura autenticada mínima + recuperação testada; só então libere o QR após backup conferido. Não ampliar busca, preview, abas, ZIP ou MCP nesta fase. [CITED: 01-CONTEXT.md Phase Boundary e Deferred Ideas]

## Architectural Responsibility Map

Mapa prescritivo derivado do contexto, com tiers conceituais. [CITED: 01-CONTEXT.md]

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| QR e ciclo da conexão | API / Backend (coletor) | Browser | Coletor mantém QR atual; navegador autenticado apenas o exibe |
| Credenciais/Signal keys/exclusividade | API / Backend (coletor) | Database / Storage | Nenhuma interface recebe auth ou socket |
| Histórico, aliases e alterações | API / Backend (ingestão) | Database / Storage | Projeção idempotente de eventos realmente recebidos |
| Originais e fila recuperável | API / Backend (worker) | Database / Storage | Download de protocolo; bytes e estados duráveis |
| Login e autorização | API / Backend | Database / Storage | Senha e sessão revogável verificadas no servidor |
| Conversas e anexos offline | API / Backend (consulta) | Browser / Storage | Consulta somente o acervo e arquivos locais |
| Backup anterior ao piloto | Operação local controlada | Database / Storage | Snapshot coordenado e restauração sem coletor |

<phase_requirements>
## Phase Requirements

Descrições copiadas do REQUIREMENTS.md; suporte indica tarefas propostas, não aceite. [CITED: .planning/REQUIREMENTS.md]

| ID | Description | Research Support |
|---|---|---|
| PRIV-01 | O proprietário pode entrar e sair do site com uma sessão privada; uma pessoa não autenticada não obtém dados do acervo. | Sessão express-session em SQLite; regenerate/destroy; login e logout testados. |
| PRIV-02 | QR de pareamento, conversas, buscas, anexos, exportações e MCP exigem a credencial apropriada em todos os caminhos de acesso, incluindo requisições diretas por ID ou URL. | Gate comum antes de QR/status/conversas/mídia, inclusive GET/HEAD/Range diretos; MCP/export ainda não expostos. |
| PRIV-03 | Credenciais e chaves de WhatsApp, segredos de login e token MCP ficam fora do Git, logs, exportações e respostas das interfaces; mensagens e arquivos recebidos não são executados como código ou instruções privilegiadas. | Projeção allowlist, armazenamento privado, logs sanitizados, conteúdo escapado e sem execução. |
| SYNC-01 | O proprietário pode vincular sua conta pessoal por QR em uma tela privada, sem executar navegador ou WhatsApp Web, e ver o estado da conexão. | makeWASocket com QR privado e estados; teste de pareamento no celular. |
| SYNC-02 | O proprietário pode consultar as mensagens de histórico que o dispositivo vinculado efetivamente receber, sem omitir itens de um lote recebido. | shouldSyncHistoryMessage explícito, todos os itens de messaging-history.set, metadados de lote. |
| SYNC-03 | Novas mensagens recebidas e enviadas pelo celular são arquivadas nas conversas individuais e de grupo quando entregues pela integração, sem envio pelo Zap MCP. | notify e append completos, autoria fromMe/grupo; consulta não recebe socket. |
| SYNC-04 | Reinício e reconexão preservam as credenciais e todas as categorias de chaves da sessão; uma sessão ainda válida retoma com um único coletor ativo, sem exigir novo QR por perda de estado local. | SignalDataTypeMap completo, keys.set atômico, credenciais persistidas e trava exclusiva. |
| SYNC-05 | Reprocessar ou receber eventos repetidos ou fora de ordem não duplica mensagens, mescla contatos homônimos nem desfaz uma atualização mais recente; identidades PN/LID são conciliadas apenas com evidência recebida. | IDs/aliases com evidência, chave de origem, replay e projeção monotônica de revisões. |
| SYNC-06 | Edições e revogações recebidas aparecem com indicação e momento de observação, preservando o conteúdo anteriormente capturado como registro histórico identificado; tipo desconhecido ou conteúdo temporário não recuperado aparece explicitamente. | Journal privado de eventos, tombstones/edições, restrições antes de normalização. |
| SYNC-07 | O proprietário vê última sincronização, intervalo observado e falhas conhecidas; o site e o MCP descrevem ausência como “não encontrado no acervo” e não apresentam conclusão de lote como histórico integral da conta. | Intervalo observado, última ingestão confirmada, falhas e conclusão de lote qualificada. |
| EVID-01 | Cada mensagem arquivada preserva referência estável, chave de origem, conversa, autor/direção, instante original, tipo, texto/legenda, citação recebida e estados dos anexos; campos desconhecidos não são inventados. | Contrato seguro de mensagem, tempo original e citação sem inventar o original citado. |
| MEDIA-01 | A ingestão inicia a preservação de áudios, imagens, vídeos e documentos acessíveis junto com as mensagens, salvando bytes originais disponíveis em armazenamento privado, em vez de apenas URLs ou miniaturas. | Fila criada na transação de ingestão; stream dos quatro tipos. |
| MEDIA-02 | Cada anexo distingue pendente, disponível, falha recuperável e indisponível; só um binário finalizado e verificado por tamanho/hash é declarado disponível e permanece acessível sem WhatsApp conectado. | Finalização, tamanho/hash, disponibilidade offline e reconciliação. |
| MEDIA-03 | Downloads interrompidos podem retomar de uma fila persistente com tentativas e concorrência limitadas; falha de mídia ou falta de espaço é informada e preserva as mensagens e os arquivos já armazenados. | Lease recuperável, tentativas limitadas, restart integral do download e ENOSPC. |
| WEB-01 | O proprietário pode listar e reabrir conversas com mensagens e anexos já arquivados em uma interface privada básica, inclusive com o coletor WhatsApp desconectado. | Consultas paginadas apenas no arquivo local e downloads autenticados. |
</phase_requirements>

## Standard Stack

### Core

Versões consultadas nesta sessão com npm view, fontes oficiais e package-legitimacy. Datas são publicação do patch recomendado. Nenhuma instalação foi executada. [VERIFIED: npm registry para pacotes OK; CITED: registros oficiais para SUS]

| Library | Version / publicação | Purpose | Why Standard / proveniência |
|---|---|---|---|
| Node.js | 24.21.0 LTS / 2026-09-07 | Processo, crypto, streams, testes | Alvo da linha 24 oficial; local atual é 26.8.2. [CITED: https://nodejs.org/dist/index.json] |
| `@whiskeysockets/baileys` | 7.0.0-rc14 / 2026-07-29 | Dispositivo vinculado | README da tag declara o pacote; gate OK e gitHead confirmado. [VERIFIED: npm registry] |
| `express` [WARNING: flagged as suspicious — verify before using.] | 5.3.0 / 2026-10-09 | HTTP privado | SUS por too-new; release oficial inclui correções de qs, proxy-addr e body-parser; não fazer downgrade só pela idade. [CITED: https://github.com/expressjs/express/releases/tag/v5.3.0] |
| `better-sqlite3` | 13.0.3 / 2026-08-05 | SQL síncrono/transações | API oficial usa transação síncrona; engines >=22. [VERIFIED: npm registry] [CITED: https://github.com/WiseLibs/better-sqlite3] |
| `typescript` | 7.0.2 / 2026-07-08 | Build ESM | Pacote confirmado pela página oficial e gate OK. [VERIFIED: npm registry] [CITED: https://www.typescriptlang.org/download/] |
| `express-session` | 1.19.0 / 2026-01-22 | Cookie e sessão no servidor | Biblioteca oficial, com Store get/set/destroy/touch para SQLite. [VERIFIED: npm registry] [CITED: https://github.com/expressjs/session] |
| `qrcode` | 1.5.4 / 2024-08-05 | QR privado | Projeto oficial fornece toDataURL; nada de QR em console. [VERIFIED: npm registry] [CITED: https://github.com/soldair/node-qrcode] |

### Supporting

| Library | Version | Purpose | When to Use / proveniência |
|---|---|---|---|
| `node:crypto`, `node:stream/promises`, `node:fs/promises`, `node:test` | Node 24 | Senha/hash/stream/disco/testes | Sem pacote extra. [CITED: https://nodejs.org/docs/latest-v24.x/api/] |
| `@types/node` [WARNING: flagged as suspicious — verify before using.] | 24.19.2 / 2026-10-09 | Tipos do alvo Node24 | Mesmo patch recente, SUS por too-new; nunca usar tipos26 como alvo24 inadvertidamente. [CITED: registry.npmjs.org/@types/node; DefinitelyTyped types/node] |
| `@types/express` | 5.0.6 / 2025-12-01 | Tipos HTTP | Gate OK; fonte DefinitelyTyped consultada. [VERIFIED: npm registry] |
| `@types/express-session` | 1.19.0 / 2026-04-16 | Tipos sessão | Gate OK; fonte DefinitelyTyped consultada. [VERIFIED: npm registry] |
| `@types/better-sqlite3` | 9.6.0 / 2026-08-01 | Tipos driver | Gate OK; validar build com driver13, número de major dos tipos não é prova de incompatibilidade. [VERIFIED: npm registry] |
| `@types/qrcode` | 1.5.6 / 2025-10-24 | Tipos QR | Gate OK; fonte DefinitelyTyped consultada. [VERIFIED: npm registry] |

**Installation:** comandos para execução após revisão de legitimidade, não executados pela pesquisa:

~~~bash
npm install --save-exact @whiskeysockets/baileys@7.0.0-rc14 express@5.3.0 better-sqlite3@13.0.3 express-session@1.19.0 qrcode@1.5.4
npm install -D --save-exact typescript@7.0.2 @types/node@24.19.2 @types/express@5.0.6 @types/express-session@1.19.0 @types/better-sqlite3@9.6.0 @types/qrcode@1.5.6
~~~

Fixar lockfile e inspecionar scripts/transitivos antes de executar. A tag Baileys contém dependência `whatsapp-rust-bridge: "0.5.4"`, `pino: "^9.6"` e peer `sharp: "*"` não marcado opcional, enquanto jimp/audio-decode/link-preview-js são opcionais. Não presumir instalação sem sharp só porque o projeto não gera thumbnails. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/package.json]

Omitir peers é possível pelo npm e mantém sua resolução no lockfile. Para a menor instalação, o executor pode ensaiar `npm ci --omit=peer` e manter essa escolha somente se import/socket/download dos quatro tipos e build passarem: na tag, sharp/jimp são imports dinâmicos na geração de thumbnails. Isso é uma estratégia de verificação, não uma compatibilidade já demonstrada. Não remover opcionais de plataforma indiscriminadamente. [CITED: https://docs.npmjs.com/cli/v11/commands/npm-install/#omit] [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/messages-media.ts#L29-L48]

**Compatibility gate:** engines presentes aceitam Node24: Baileys >=20, Express >=18, better-sqlite3 >=22, sessão >=0.8; isso não comprova prebuild/ABI, WASM, parsers ou conta. Fazer smoke no Node24 alvo antes de criar auth real. [VERIFIED: npm registry para declarações dos pacotes OK] [CITED: registry.npmjs.org/express]

### Alternatives Considered

Não reabrir stack ou retenção bloqueados no contexto. Sem SPA, ORM, broker ou auth helper de terceiros. Node nativo cobre crypto e testes; UI nativa cobre o leitor solicitado. FTS5 só precisa de disponibilidade conferida agora; busca fica na fase2. [CITED: 01-CONTEXT.md]

## Package Legitimacy Audit

Seam executado com nomes sem versões, registry correto npm e consulta scripts.postinstall. Datas/weeklyDownloads são o snapshot desta sessão, não métricas de uso do produto. [CITED: resultado query package-legitimacy desta pesquisa; npm registry]

| Package | Registry | Patch age / publicação | Downloads semanais | Source Repo | Verdict | Disposition |
|---|---|---|---|---|---|---|
| @whiskeysockets/baileys | npm | 2026-07-29 | 490752 | WhiskeySockets/Baileys | OK | Aprovado; fixar rc14 |
| express | npm | 2026-10-09 | 141586866 | expressjs/express | SUS too-new | Manter alerta; revisão de origem/fixes e instalação dentro da autorização vigente |
| better-sqlite3 | npm | 2026-08-05 | 11291572 | WiseLibs/better-sqlite3 | OK | Aprovado |
| typescript | npm | 2026-07-08 | 304528871 | microsoft/TypeScript | OK | Aprovado |
| express-session | npm | 2026-01-22 | 4267562 | expressjs/session | OK | Aprovado |
| qrcode | npm | 2024-08-05 | 29738284 | soldair/node-qrcode | OK | Aprovado |
| @types/node | npm | 2026-10-09 | 456564027 | DefinitelyTyped/DefinitelyTyped | SUS too-new | Manter alerta; revisão de origem/fixes e instalação dentro da autorização vigente |
| @types/express | npm | 2025-12-01 | 67054146 | DefinitelyTyped/DefinitelyTyped | OK | Aprovado |
| @types/express-session | npm | 2026-04-16 | 2122558 | DefinitelyTyped/DefinitelyTyped | OK | Aprovado |
| @types/better-sqlite3 | npm | 2026-08-01 | 4949966 | DefinitelyTyped/DefinitelyTyped | OK | Aprovado |
| @types/qrcode | npm | 2025-10-24 | 15972009 | DefinitelyTyped/DefinitelyTyped | OK | Aprovado |
| whatsapp-rust-bridge (transitivo) | npm | 2026-05-14 | 816264 | jlucaso1/whatsapp-rust-bridge | OK | Revisar versão0.5.4 efetiva e import |
| sharp (peer) | npm | latest 2026-09-27 | 114544909 | lovell/sharp | SUS too-new | Se instalado, revisar patch/source/scripts; omitir peer somente com smoke completo |
| pino (transitivo) | npm | latest 2026-10-02 | 53330031 | pinojs/pino | SUS too-new para latest10 | Rechecar versão9 efetiva do lock; não adicionar latest10 |

**Postinstall:** consultas dos pacotes diretos retornaram sem scripts.postinstall; Baileys possui preinstall que lê major do Node e rejeita <20. Isso não exonera install/preinstall/prepare ou os transitivos; ler lock e scripts efetivos na Wave0. [CITED: npm view scripts; https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/engine-requirements.js]

**SLOP removido:** o teste com uma string nome+versão foi classificado does-not-exist pelo seam, apesar do npm view resolver a versão. Não usar entradas nome+versão nesse seam; auditar o nome e verificar o patch separadamente. Nenhum pacote inexistente é recomendado.  
**SUS:** Express, @types/node; sharp se mantido no disco; pino apenas se o patch efetivamente resolvido também for sinalizado. O protocolo genérico de legitimidade pede checkpoint:human-verify para SUS; neste projeto, a autorização explícita do usuário permite decisões rotineiras de instalação sem reconfirmação. Registrar o alerta e a revisão de source/release/fixes no plano, sem criar checkpoint apenas de aprovação. QR e comparação da conta continuam checkpoints de participação real. Alertas de idade não são evidência de malware. [CITED: resultados do seam e registro; AGENTS.md AUTORIZAÇÃO GERAL/INICIATIVA]

## Architecture Patterns

### System Architecture Diagram

Arquitetura proposta para as decisões aprovadas. [CITED: 01-CONTEXT.md]

~~~mermaid
flowchart TD
    Phone[Celular do proprietário / WhatsApp] --> Socket[Coletor exclusivo]
    Socket <--> Auth[(SQLite auth privado)]
    Socket --> Gate{Tipo e restrições}
    Gate -->|visualização única ou desconhecido| Metadata[Metadados e limitação explícita]
    Gate -->|conteúdo permitido| Ingest[Evento privado + projeção idempotente]
    Metadata --> Archive[(SQLite acervo + revisões + cobertura + fila)]
    Ingest --> Archive
    Archive --> Worker[Worker limitado]
    Worker <--> WA[Recuperação de mídia de protocolo]
    Worker --> Temp[Stream temporário + hash e tamanho]
    Temp --> Check{Verificado e finalizado?}
    Check -->|sim| Files[Originais privados]
    Check -->|não| Retry[Falha segura / retry limitado]
    Files --> Archive
    Retry --> Archive
    User[Navegador do proprietário] --> Login{Sessão HTTP válida?}
    Login -->|sim| Query[Consulta local / projeção segura]
    Login -->|não| Deny[Login / acesso negado]
    Query --> Archive
    Query --> Files
    Query --> User
~~~

### Recommended Project Structure / Component Responsibilities

Nomes abaixo são **propostos**, não paths existentes nem contratos já implementados. Use módulos diretos sem camada genérica de plugins. [CITED: 01-CONTEXT.md Discrição]

| Módulo proposto | Responsabilidade e fronteira |
|---|---|
| src/main.ts | Validar config/permissões; abrir bancos; reconcile; servir consultas; coletor apenas quando habilitado |
| src/whatsapp/auth.ts | Creds e key store, zero exposição ao HTTP |
| src/whatsapp/collector.ts | Um socket, eventos, QR atual, reconnect/trava; nenhum export de socket |
| src/archive/schema.sql, ingest.ts | Schema e ingestão idempotente, revisões/aliases/cobertura/jobs |
| src/archive/query.ts | Queries parametrizadas e DTO allowlist para interfaces |
| src/media/worker.ts | Fila/stream/finalização/reconciliação; consultas não acionam download remoto |
| src/http/auth.ts, app.ts | Sessão, login/logout, gates, rotas privadas |
| public/ | Apenas ativos estáticos próprios, sem dados, banco ou mídia |
| test/*.test.ts | Fixtures sintéticas de contratos e falhas |
| scripts/backup.ts | Cópia coordenada e restore offline; sem segredos na saída |

### Pattern 1: AuthenticationState genérico e commit real

A fonte da tag define **dez** categorias. Não manter allowlist de sete tipos copiada de v6 ou v7 antigo. Copiar os valores literalmente para fixtures de persistência; implementar armazenamento por categoria+id e remoção explícita quando valor for null. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Types/Auth.ts#L74-L100]

~~~text
DATA_b73f21a8_START
'pre-key': KeyPair
session: Uint8Array
'sender-key': Uint8Array
'sender-key-memory': { [jid: string]: boolean }
'app-state-sync-key': proto.Message.IAppStateSyncKeyData
'app-state-sync-version': LTHashState
'lid-mapping': string
'device-list': string[]
tctoken: { token: Buffer; timestamp?: string; senderTimestamp?: number }
'identity-key': Uint8Array
DATA_b73f21a8_END
~~~

Usar BufferJSON.replacer/reviver e reconstruir app-state-sync-key com proto.Message.AppStateSyncKeyData.fromObject, como o helper oficial; testar buffers e o roundtrip de todas as categorias. Corrupção/leitura falha não deve virar initAuthCreds silencioso. Credenciais podem ser inicializadas somente num perfil privado explicitamente vazio e novo. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/use-multi-file-auth-state.ts#L97-L133]

O socket aplica addTransactionCapability internamente: entregar SignalKeyStore cujos set são commits SQLite síncronos atômicos e propagam erros; não manter transação SQL aberta em await, não duplicar o wrapper upstream, não adicionar cache de auth na primeira versão. A biblioteca chama state.set por commit e também por categoria fora de uma transação: atomicidade fornecida ao conjunto realmente recebido em cada chamada precisa ser testada. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Socket/socket.ts#L386] [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/auth-utils.ts#L197-L278]

Creds.update é parcial; mesclar com creds em memória e persistir o snapshot antes de sair do callback síncrono. Falha de auth deve suspender o coletor e sinalizar problema seguro, jamais continuar fingindo durabilidade. A trava de processo deve existir antes de abrir o socket e só sair após fechar/drain; além da supervisão, rejeitar uma segunda instância no mesmo diretório. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Socket/socket.ts#L1051-L1070] [CITED: 01-CONTEXT.md D-19]

### Pattern 2: eventos e projeção com proveniência

Consumir todos os itens de messaging-history.set e messages.upsert (notify/append), contatos/grupos/mapeamentos e messages.update/delete. Ingerir lote em chunks curtos se o volume exigir, mas manter contagem recebida/confirmada e pendência/falha para não ocultar itens. Callback de EventEmitter não aguarda uma promise: usar gravações síncronas curtas ou queue explicitamente drenada com catch e status. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Types/Events.ts#L20-L85] [CITED: https://github.com/whiskeysockets/baileys.wiki-site/blob/main/docs/socket/receiving-updates.md]

**Schema mínimo proposto:** identidades+aliases, conversas+aliases, mensagens com referência interna estável e chave de origem, eventos/revisões privados, attachments/jobs, lotes/cobertura e sessão web. Auth em banco separado. A transação de ingestão confirma mensagem, revisão/projeção e trabalho de mídia juntos. Não é necessário event bus/event sourcing generalista; um journal restrito aos eventos usados na projeção basta. [CITED: 01-CONTEXT.md; .planning/research/ARCHITECTURE.md]

Chave lógica proposta: conversa resolvida + id de protocolo + direção + autor resolvido; conservar também cada chave original recebida para localizar updates e merges tardios. Não gerar nova referência quando PN/LID são reconciliados. Uma tabela de redirects ou referências de origem mantém links antigos válidos ao reconciliar duplicata. Contatos homônimos não se unem; null permanece desconhecido, não string inventada. Mapas recebidos na história e remoteJidAlt/participantAlt são evidência, não cálculo de telefone. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Types/Message.ts#L20-L30] [CITED: https://baileys.wiki/migration/v7]

Citação é o que veio em contextInfo: stanzaId, participant, remoteJid e quotedMessage quando presentes. Uma citação com texto não demonstra que o original completo está no acervo; mostrar “citação recebida / original não encontrado” e preservar a origem. Aplicar as restrições de visualização única também ao conteúdo citado, sem enfileirar downloads a partir de quotedMessage. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/WAProto/index.d.ts#L3129-L3148] [CITED: 01-CONTEXT.md D-11/D-18]

Original sent_at fica imutável; observed_at pertence à revisão/evento. A edição da tag em messages.update traz um timestamp de edição em segundos derivado de timestampMs, portanto não substituí-lo na data original. Revogação tem message:null e REVOKE; não aceitar replay do original para ressuscitar a projeção. Updates antes do original ficam pendentes pela chave. Na ausência de relógio/versionamento confiável, conservar revisões conflitantes e sinalizar ordem incerta; observação posterior sozinha não prova evento mais novo. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/process-message.ts#L443-L453] [CITED: mesma fonte #L513-L532]

Tipos desconhecidos têm registro explícito com tipo/campos conhecidos; corpo bruto permanece privado quando permitido pela política. Visualização única: guardar somente metadados e motivo, sem plaintext/legenda citada/payload recuperável escondidos no journal. Temporárias normais capturadas são retidas como decisão D-10/D-11, com marca de expiração recebida; expiração remota não autoriza expurgo local. [CITED: 01-CONTEXT.md D-10/D-11]

### Pattern 3: cobertura e reconnect limitado

**Config essencial:** syncFullHistory true, browser Desktop e shouldSyncHistoryMessage () => true. A tag tem syncFullHistory=true, mas o predicate default exclui HistorySyncType.FULL; depender apenas do primeiro flag perde uma classe de lote. getMessage deve ler proto.Message privado já arquivado, sem buscar conteúdo pelo site. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Defaults/index.ts#L75-L90] [CITED: https://github.com/whiskeysockets/baileys.wiki-site/blob/main/docs/socket/configuration.md]

isLatest é calculado como !creds.processedHistoryMessages?.length. messaging-history.status pode ser complete/paused e distingue explicit=true de conclusão inferida por timeout. Registrar ambos sem apagar cobertura/falhas; mostrar lote concluído, intervalo observado e contagem arquivada. Não fixar uma janela de meses/dias, porcentagem de cobertura ou garantia de replay. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/process-message.ts#L372-L414] [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Types/Events.ts#L38-L48]

Códigos oficiais lidos na tag: `connectionClosed = 428, connectionLost = 408, connectionReplaced = 440, timedOut = 408, loggedOut = 401, badSession = 500, restartRequired = 515, multideviceMismatch = 411, forbidden = 403, unavailableService = 503`. Não tratar qualquer erro como logout. Para 401 exigir novo vínculo; 440 parar e investigar concorrência; 515 reconstruir socket após persistência e cleanup; 408/428/503 aplicar backoff limitado; 403/411/500 parar com diagnóstico sem apagar auth/acervo automaticamente. Essa classificação operacional é recomendada, não garantia universal da conta. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Types/index.ts#L28-L40]

Escolha inicial dentro da discrição: seis tentativas de conexão com espera exponencial/jitter limitada a 60s, reset apenas após conexão estável; falha persistente mantém site offline funcional. Estado de QR é efêmero e apagado ao substituir socket, abrir conexão, invalidar sessão ou logout. Não chamar sock.logout para sair do site ou pausar coleta; fechar socket com mecanismo de fim e manter creds. [CITED: 01-CONTEXT.md D-03/D-05/D-07/D-08; fonte do socket da tag]

markOnlineOnConnect false reduz presença anunciada, sem prometer invisibilidade. A própria integração envia acknowledgements/receipts de entrega/sincronização; não são leitura. Nenhuma rota chama sendMessage/chatModify/readMessages, receipt read/read-self/played ou typing. Isso se testa com spies nos métodos e UI offline; não monkey-patchar a biblioteca para bloquear acks necessários ao protocolo. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Socket/messages-recv.ts#L1739-L1767] [CITED: 01-CONTEXT.md]

### Pattern 4: originais, finalização e reconciliação

Gate de restrição vem **antes** de normalizeMessageContent/extractMessageContent/downloadMediaMessage: esses helpers abrem viewOnceMessage/viewOnceMessageV2/viewOnceMessageV2Extension. Conferir key.isViewOnce, wrappers em conteúdo permitido aninhado e flags viewOnce do media node; não chamar normalizador até a classificação. Não percorrer conteúdo arbitrário ou dumps até “achar” binário restrito. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/messages.ts#L788-L820] [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Types/Message.ts#L20-L30; WAProto/index.d.ts]

Só imageMessage/audioMessage/videoMessage/documentMessage acessíveis entram na fila desta fase. Guardar envelope privado mínimo necessário ao download, separado do DTO. Conferir que é original, não thumbnailDirectPath isolado: o helper tem fallback para thumbnail-link, que não deve satisfazer MEDIA-01. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/messages.ts#L1083-L1119]

Usar downloadMediaMessage(message, 'stream', options, ctx); RequestInit em options suporta AbortSignal. reuploadRequest: sock.updateMediaMessage pode renovar mídia em HTTP404/410; o helper faz essa tentativa quando contexto existe. Um 404 isolado não comprova expiração definitiva; registrar falha recuperável e limite de tentativas. Quando offline, não gastar tentativas só por falta de conexão. Não chamar envio de texto, não renovar mídia restrita. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/messages.ts#L1035-L1119]

Estados internos propostos: pending/downloading/available/retry_wait/unavailable/blocked, projetados nos quatro rótulos D-14. Reserva de job transacional, lease e limite de concorrência; start com 2 downloads, 5 tentativas por versão de origem, timeout de 120s ajustado pelo volume medido. Pausar ao cruzar reserva de disco medida; nenhum expurgo automático. Limites são escolhas iniciais do agente, não promessas de desempenho. [CITED: 01-CONTEXT.md D-14–D-16 e Discrição]

Persistência: abrir temporário exclusivo por ID interno no mesmo filesystem, stream com backpressure/limite/cancelamento, contar bytes e SHA256, conferir fileLength/fileSha256 originais se presentes, flush/fsync, fechar, rename e fsync do diretório; só então commit available/hash/tamanho. Não carregar vídeo em Buffer e não usar nome/JID recebido como caminho. Hash local sem hash de origem prova consistência local, não integridade contra uma origem adulterada; campo desconhecido continua desconhecido. [CITED: https://nodejs.org/docs/latest-v24.x/api/fs.html; https://nodejs.org/docs/latest-v24.x/api/stream.json] [CITED: 01-CONTEXT.md D-13/D-14]

A implementação de download da tag descriptografa AES, mas o caminho lido não compara fileSha256 de origem. A aplicação precisa comparar o plaintext completo quando hash é fornecido. Erro de stream pode surgir depois de downloadMediaMessage retornar: await pipeline inteiro, tratar abort/error e nunca anunciar final antes dele. [CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/messages-media.ts#L531-L653]

Retomar job interrompido significa **reiniciar download completo** no v1; não implementar range de ciphertext/append parcial. Após crash: lease vencida volta à fila; temporário incompleto fica registrado para recuperação controlada; final sem commit é revalidado/adotado; available sem bytes íntegros torna-se falha visível. Não sobrescrever final válido, não apagar órfãos desconhecidos antes da reconciliação. Banco e filesystem não têm uma transação comum. [CITED: 01-CONTEXT.md D-15; .planning/research/ARCHITECTURE.md]

### Pattern 5: HTTP privado mínimo

Sessão express-session com Store SQLite pequeno, resave false, saveUninitialized false, cookie HttpOnly/Secure/SameSite, TTL no servidor e regenerate após login. Logout destroy, remove cookie e deixa coletor/acervo. Reset operacional revoga sessões web, sem reset remoto de WhatsApp. MemoryStore não é store de produção. Confiar apenas no proxy efetivamente identificado; não usar trust proxy true indiscriminadamente. [CITED: https://github.com/expressjs/session]

Usar crypto.scrypt assíncrono com salt aleatório e parâmetros armazenados; uma escolha documentada OWASP é N=2^17,r=8,p=1 quando Argon2id não é adotado. Ajustar maxmem explicitamente para essa configuração (o default Node não basta); testar custo no host e limitar concorrência/tentativas de login. Comparar buffers de mesmo comprimento via timingSafeEqual. Não reutilizar senha/token em URL, localStorage ou logs. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html] [CITED: https://nodejs.org/docs/latest-v24.x/api/crypto.json]

Rotas propostas: POST login/logout (com origem/CSRF), GET status/QR privados, GET conversations, GET conversation/:id/messages com limite/cursor e GET attachments/:id para download original. Estáticos próprios podem ser públicos; nenhum dado em public. Aplicar autenticação antes de IDs e também HEAD/Range; respostas de dados/QR no-store, CSP sem scripts inline, nosniff e Referrer-Policy. Conteúdo via textContent; anexos ativos/HTML/SVG sempre download com octet-stream e attachment, sem execução na mesma origem. [CITED: https://expressjs.com/en/advanced/best-practice-security/] [CITED: 01-CONTEXT.md D-01/D-02/D-17/D-18]

Sem TLS final identificado, bind loopback e manter uso local, ou configurar transporte protegido para qualquer acesso externo. Login/dados falham fechados; não abrir listener público com “segurança depois”. Preparar HTTPS operacional definitivo pertence à fase4, proteção da exposição atual pertence à PRIV-02 agora. [CITED: 01-CONTEXT.md Discrição; .planning/ROADMAP.md]

### Pattern 6: cópia privada antes do QR

Antes de qualquer captura real: criar diretório privado fora do checkout, conferir permissões e capacidade, preparar comando de cópia coordenada e provar restore com fixtures em diretório isolado com coletor desabilitado. Registrar resultado seguro sem mensagens, JIDs, caminhos do host ou keys. QR real fica bloqueado enquanto o pré-requisito não for conferido. [CITED: 01-CONTEXT.md D-19; .planning/ROADMAP.md Condições do piloto]

Para mínimo recuperável, pausar socket/jobs, drenar commits, fechar ambos os bancos e copiar auth+acervo+mídia+manifesto; retomar depois. Não copiar só .db de WAL ativo. Restaurar e conferir integrity_check, FK, contagens, hashes e consulta offline; restaurar o arquivo não prova validade remota da sessão. A rotina deve permitir cópia privada atualizada ao acumular dados reais, sem esperar a fase4. Cópia recorrente externa cifrada e restore operacional completo continuam fase4. [CITED: https://www.sqlite.org/wal.html] [CITED: https://www.sqlite.org/backup.html] [CITED: 01-CONTEXT.md]

### Anti-Patterns to Avoid

- Copiar example.ts upstream que envia mensagens, marca leitura ou imprime QR: usar somente as APIs necessárias e testadas. [CITED: README/Example da tag; 01-CONTEXT.md]
- Listener async solto, reset auth por qualquer erro, várias instâncias ou cache que anuncia keys antes do commit. [CITED: fontes auth/eventos acima]
- Merge por nome/telefone presumido, hash de mídia como ID de mensagem, timestamp de edição sobrescrevendo sent_at. [CITED: fontes identidade/revisão acima]
- Normalizar primeiro e tentar recuperar restrição depois; guardar view-once secreto no journal. [CITED: fonte normalizador; D-11]
- Expor SQLite/paths/envelopes por ID adivinhável, deixar HEAD/Range sem gate, usar credencial na query. [CITED: contexto e Express security]
- Marcar lote100% ou QR como requisito concluído. [CITED: ROADMAP e D-20]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why / fonte |
|---|---|---|---|
| Protocolo/Signal e decriptação | Implementação WhatsApp própria | Baileys fixado | Projeto já encapsula o protocolo; preservar correções e versão. [CITED: README/advisory] |
| Cookies/sessão HTTP | Cookie parser e signer caseiro | express-session + Store SQLite | Rotação/destroy/opções já documentados. [CITED: expressjs/session] |
| Password crypto | SHA256 simples ou cifra própria | node:crypto.scrypt/randomBytes/timingSafeEqual | APIs nativas e parâmetros OWASP. [CITED: Node crypto; OWASP Password Storage] |
| QR | Encoder/desenho próprio | qrcode.toDataURL | API oficial mínima. [CITED: soldair/node-qrcode] |
| Pipeline | Encadear pipe sem ciclo de erros | node:stream/promises.pipeline | Aguarda erro/conclusão/cancelamento. [CITED: Node stream] |
| Transação SQL | Async transaction com locks próprios | better-sqlite3.transaction síncrona | Callback async não mantém transação. [CITED: WiseLibs api.md] |

Não adicionar uma fila distribuída, ORM ou engine de regras. Persistência do auth, schema de evidência e reconciliação são responsabilidades específicas que precisam existir, com testes. [CITED: contexto da fase]

## Common Pitfalls

| Pitfall | O que falha / sinal | Prevenção verificável |
|---|---|---|
| Histórico FULL descartado | Lotes ausentes apesar de syncFullHistory | Predicate explicitamente true + fixture FULL e todos os itens. [CITED: Defaults da tag] |
| Buffer inicial preso | Conectado mas nenhum evento de histórico/new é entregue | Watchdog de progresso, status de falha e diagnóstico privado; issue2810 é relato, não defeito comprovado na conta. [CITED: tipos/history; issue2810 como sinal não autoritativo] |
| QR/reconnect não funciona na conta | Fechamentos428 repetidos antes do QR | Retry limitado; não instalar master nem trocar para legacy sem diagnóstico/piloto. Issue2671 é relato a testar. [CITED: tipos DisconnectReason; issue2671 como sinal] |
| Perda de category identity-key | Reinício com falhas Signal ou novo QR | Roundtrip de todas as dez categorias e deletions null. [CITED: Auth.ts da tag] |
| Mídia “salva” parcial | available com tamanho/hash divergente | pipeline + hash de origem + finalização/reconcile. [CITED: source/download e D-14] |
| Replay ressuscita revogada | Original antigo retorna como atual | Journal/tombstone + update-before-original e replay. [CITED: process-message da tag e D-10] |
| SQLite freeze/commit precoce | Auth/HTTP parados durante await/download | Transações síncronas curtas; nunca rede dentro delas. [CITED: better-sqlite3 api.md] |
| Log de erro expõe conteúdo | Boom.data/Express error cause mostra envelope | Handler allowlist sem err bruto; logger upstream silent. [CITED: Baileys security; Express5.3 release] |
| URL de mídia arbitrária | Fetch para destino privado indevido | Nenhuma URL fornecida pelo HTTP; validar destino HTTPS de protocolo/redirects e bloquear rede interna no worker. [CITED: downloadContentFromMessage da tag; ASVS5 V4] |

Relatos em issues são pesquisa de falsificação, não conclusões de compatibilidade: verificar comportamento do pin no piloto. Nenhum número de janela ou promessa de recuperação foi inferido desses relatos. [ASSUMED: incidência desses relatos na conta/host do usuário é desconhecida]

## Code Examples

Exemplos são adaptações mínimas de APIs conferidas na tag, **não código já compilado**. Nomes locais/schema são propostas. Literais de protocolo usados aqui estão citados nos tipos/Defaults/normalizador anteriores; não existe enum interno do Zap MCP nesta pesquisa.

### Socket sem permissões de consulta remota

~~~typescript
// APIs: Baileys v7.0.0-rc14, Types/Socket.ts e Defaults/index.ts.
// state, privateLogger e readStoredMessage são módulos locais a implementar/testar.
const sock = makeWASocket({
  auth: state,
  logger: privateLogger,
  browser: Browsers.macOS('Desktop'),
  syncFullHistory: true,
  shouldSyncHistoryMessage: () => true,
  markOnlineOnConnect: false,
  getMessage: readStoredMessage,
})
// Rotas só recebem queryArchive; jamais sock.
~~~

[CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Types/Socket.ts] [CITED: wiki configuration]

### KeyStore: commit síncrono de todas as categorias

~~~typescript
// Schema/procedures propostos; APIs base: Auth.ts, BufferJSON, better-sqlite3.transaction.
const persistKeys = authDb.transaction((data: SignalDataSet) => {
  for (const [category, entries] of Object.entries(data)) {
    for (const [id, value] of Object.entries(entries ?? {})) {
      if (value === null) deleteKey.run(category, id)
      else upsertKey.run(category, id, JSON.stringify(value, BufferJSON.replacer))
    }
  }
})
// keys.set chama persistKeys(data) e só retorna após commit; falhas são propagadas.
// keys.get usa BufferJSON.reviver; para app-state-sync-key:
// proto.Message.AppStateSyncKeyData.fromObject(value)
~~~

[CITED: https://github.com/WhiskeySockets/Baileys/blob/v7.0.0-rc14/src/Utils/use-multi-file-auth-state.ts] [CITED: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#transactionfunction---function]

### Streaming sem declarar sucesso cedo

~~~typescript
// Só após gate de restrições e de original; nomes internos são gerados pela aplicação.
const signal = AbortSignal.timeout(timeoutMs)
const input = await downloadMediaMessage(
  privateStoredMessage,
  'stream',
  { options: { signal } },
  { logger: privateLogger, reuploadRequest: sock.updateMediaMessage },
)
await pipeline(input, countAndHash, createWriteStream(internalTemp, {
  flags: 'wx', mode: 0o600, flush: true,
}), { signal })
// Depois: conferir tamanho/hash de origem se presentes, rename, fsync diretório,
// commit de disponibilidade; catch preserva mensagem e grava falha sanitizada.
~~~

[CITED: Baileys messages.ts#L1047-L1119; Node24 fs/stream oficiais]
O executor deve testar também erro antes do primeiro chunk e erro tardio no input; não copiar este recorte como worker completo.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact / fonte |
|---|---|---|---|
| Identidade só PN / store limitado | PN/LID + todas as categorias da tag | v7 | identity-key e mapping precisam sobreviver ao restart. [CITED: v7 wiki; Auth.ts] |
| Exemplo master/branch móvel | Pin npm+lockfile + source/tag conferida | Prática upstream de segurança atual | Fix conhecido e APIs checkáveis. [CITED: Baileys/security] |
| Histórico “completo” por isLatest | Cobertura observada + complete explicit/inferido | APIs da rc14 | Separar progresso de garantia. [CITED: Events.ts/process-message] |
| URL/thumbnail como arquivo | Bytes verificados e estados duráveis | Decisão desta fase | Disponibilidade offline verificável. [CITED: D-13/D-14] |

**Security fix confirmado:** GHSA-qvv5-jq5g-4cgg/CVE-2026-48063 trata spoofing de messages.upsert/history e corrupção de app state; advisory lista correções 7.0.0-rc12 e6.7.22. O código rc14 lido conserva o guard de tipos self-only por fromMe. Isso comprova a presença dessa mitigação, não autenticação infalível de toda mensagem nem risco zero de conta. [CITED: https://github.com/WhiskeySockets/Baileys/security/advisories/GHSA-qvv5-jq5g-4cgg] [CITED: process-message.ts#L333-L370]

## Assumptions Log

Decisões prescritivas dentro da discrição do contexto foram identificadas como propostas; não são fatos de ambiente. [CITED: 01-CONTEXT.md Discrição]

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | Incidência de relatos upstream de buffer/QR na conta ou host é desconhecida; não observada aqui [ASSUMED] | Common Pitfalls | Pilotagem pode exigir diagnóstico ou outro pin corrigido |
| A2 | Capacidade/latência/cobertura da conta real não foram medidas [ASSUMED] | Open Questions | Números de concorrência/reserva precisam ajuste antes de acumular volume |
| A3 | O conjunto instalado no Node24, incluindo prebuild/WASM e peers, funcionará somente após smoke [ASSUMED] | Environment Availability | Não usar declaração engines como prova de build/integração |

Nenhuma retenção, regra de compliance, SLA, capacidade ou janela de histórico foi inventada. Decisões já aprovadas no contexto não precisam de nova pergunta; suposições de ambiente tornam-se evidência em Wave0/piloto ou permanecem pendentes. Pacotes SUS conservam alerta/revisão documentada; a autorização geral já cobre instalação e decisões de versão.

## Open Questions (RESOLVED — disposição de planejamento; provas operacionais pendentes)

1. **RESOLVED — Qual cobertura e quais originais a conta entrega?** Disposição: o plano `01-07-PLAN.md` exige comparação da conversa conhecida e dos quatro tipos, sem enviar pelo serviço. Não observado nesta pesquisa [ASSUMED A2]; sem amostra, aceite continua pendente. A resolução é o procedimento obrigatório, não a cobertura real.
2. **RESOLVED — Qual host/capacidade/transporte/destino de cópia está disponível?** Disposição: desenvolvimento/testes locais protegidos no plano 01-01; identificação operacional, cópia e gate antes de exposição/QR no plano `01-06-PLAN.md`. VPS/domínio/acesso continuam não comprovados; operação final é fase 4. [CITED: 01-CONTEXT.md Integration Points]
3. **RESOLVED — Build Node24 e instalação transitiva:** Disposição: smoke de import/ABI/SQLite/FTS5/QR e revisão do lock em `01-01-PLAN.md`, tarefa 01-01-01, antes de perfil real. Engines não provam integração e os checks ainda não foram executados [ASSUMED A3].
4. **RESOLVED — Pacotes novos:** Disposição: `01-01-PLAN.md`, tarefa 01-01-01, revalida release/registry/source/scripts e versões efetivas do lock antes de instalar. Autorização vigente dispensa reconfirmação operacional; não criar aprovação-only nem rebaixar automaticamente versão corrigida. Verificação operacional ainda pendente. [CITED: audit acima; AGENTS.md]
5. **RESOLVED — Ordem de updates sem metadado suficiente:** Disposição: `01-02-PLAN.md`, tarefa 01-02-01, conserva eventos, registra conflito/incerteza e testa replay sem regressão. A fonte não fornece relógio universal em todos os eventos; observação não será apresentada como ordem comprovada. Implementação/teste ainda pendentes. [CITED: Types/Events.ts; process-message.ts]

## Environment Availability

Probes somente no computador da pesquisa, não na VPS; nenhum endereço/credencial/arquivo privado inspecionado. [CITED: exec de node/npm/git/sqlite3 nesta sessão]

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node | Build/run | Local sim, alvo24 ainda não comprovado | local26.8.2; alvo24.21.0 | Instalar/usar runtime24 isolado de projeto e testar |
| npm | Instalação/lock | Sim local | 11.19.1 | npm do runtime24 |
| Git | Fonte/tag | Sim local | 2.55.0 | — |
| SQLite CLI | Diagnóstico backup | Sim local | 3.53.4 | Driver para integrity_check |
| Driver better-sqlite3 | Banco do serviço | Não instalado nesta pesquisa | patch13.0.3 existe | Smoke de prebuild/FTS5 em Wave0 |
| VPS/domínio/proxy | Exposição/piloto final | Não comprovados | — | Loopback protegido local; implantação posterior |
| Celular proprietário/QR | Pareamento/piloto | Participação necessária | — | Sem fallback sintético para aceite |
| Destino de cópia privada | Pré-piloto | Não comprovado | — | Diretório privado isolado recuperável antes de QR; fora-VPS na fase4 |

**Missing dependencies with no fallback para aceite:** celular/QR e amostras reais; transporte seguro e cópia conferida antes de expor/pilotar.  
**Missing dependencies with fallback para desenvolvimento:** VPS, domínio e prebuild; testes locais + runtime24/driver verificados. Isso não substitui a validação operacional.

## Validation Architecture

Nyquist está habilitado no config lido; nenhum framework/teste de produto existia no inventário inicial. Nomes abaixo são propostas da Wave0, não paths verificados existentes. [CITED: .planning/config.json workflow.nyquist_validation; inventário rg --files da sessão]

### Test Framework

| Property | Value |
|---|---|
| Framework | node:test do Node24.21.0 [CITED: https://nodejs.org/docs/latest-v24.x/api/test.html] |
| Config file | Nenhum inicial; propor tsconfig NodeNext e build de src/test |
| Quick run command | npm run build && node --test dist/test/auth.test.js dist/test/archive.test.js |
| Full suite command | npm test — script proposto: npm run build && node --test dist/test/*.test.js |
| Coverage | Contratos de segurança/persistência/falhas, sem espelhar implementação trivial |

### Phase Requirements → Test Map

Comandos pressupõem build da Wave0, fixtures sintéticas e processos fake/temporários, com cada arquivo mirando <30s; tempo precisa ser medido, não foi executado. [CITED: plano de verificação derivado de REQUIREMENTS/CONTEXT]

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| PRIV-01 | Login/regenerate/logout/revogação sem parar coletor | integration | node --test dist/test/auth.test.js | Não — Wave0 |
| PRIV-02 | QR/status/IDs/media GET/HEAD/Range negados sem sessão | integration | node --test dist/test/http.test.js | Não — Wave0 |
| PRIV-03 | DTO/log/erros sem keys; conteúdo hostil texto/download | security integration | node --test dist/test/security.test.js | Não — Wave0 |
| SYNC-01 | QR atual/estados/códigos; socket sem browser runtime | contract + real pilot | node --test dist/test/collector.test.js | Não — Wave0 + celular |
| SYNC-02 | FULL e todos os itens/batch/ordem; sem filtro silencioso | integration | node --test dist/test/archive.test.js | Não — Wave0 |
| SYNC-03 | notify/append/fromMe/grupo; zero operações de escrita | contract + pilot | node --test dist/test/readonly.test.js | Não — Wave0 + real |
| SYNC-04 | 10 categorias/proto/null/restart/segunda instância | integration/process | node --test dist/test/auth-state.test.js | Não — Wave0 + restart real |
| SYNC-05 | Replay/out-of-order/PN-LID tardio/homônimos | integration | node --test dist/test/archive.test.js | Não — Wave0 |
| SYNC-06 | Edit/revoke antes do original/replay/viewonce/unknown | unit + integration | node --test dist/test/revisions.test.js | Não — Wave0 |
| SYNC-07 | Intervalo/commit/lote inferido/falhas/ausência qualificada | integration | node --test dist/test/coverage.test.js | Não — Wave0 |
| EVID-01 | Keys/direção/autor/Long/buffers/citação desconhecida | unit + integration | node --test dist/test/archive.test.js | Não — Wave0 |
| MEDIA-01 | Quatro tipos, original vs thumbnail, job na ingestão | integration + pilot | node --test dist/test/media.test.js | Não — Wave0 + quatro reais |
| MEDIA-02 | Hash/tamanho/arquivo parcial/corrupto/final órfão/offline | fault integration | node --test dist/test/media.test.js | Não — Wave0 |
| MEDIA-03 | Retry limitado/lease/crash/stream tardio/ENOSPC | fault process | node --test dist/test/recovery.test.js | Não — Wave0 |
| WEB-01 | Lista/leitura/download sem socket; bounds/order | HTTP integration + UI | node --test dist/test/http.test.js | Não — Wave0 + UI |

**Teste significativo de crash:** encerrar subprocesso em pontos após job commit, após temporário, após rename e antes do commit de disponibilidade; reiniciar/reconcile e conferir invariantes. ENOSPC deve ser fault injection controlada, sem encher disco pessoal. Falha SQL deve não confirmar ingestão/auth, acervo anterior continua. [CITED: D-15/D-16; mecanismos Node/SQLite acima]

**Piloto manual obrigatório:** após cópia/restauração privada, usuário lê QR; comparar conversa conhecida (todos os itens do lote recebido, grupo e direções), quatro tipos reais acessíveis, citação/revisão quando entregues, leitura offline e restart sem QR indevido. Registrar seguro pass/fail, contagens/intervalo/limites; detalhes reais somente no ambiente privado. Não mandar mensagem de teste pelo Zap MCP nem fabricar amostra. QR, HTTP200 e fixture verde não validam SYNC/MEDIA reais. [CITED: D-19/D-20; ROADMAP]

### Sampling Rate

- Por tarefa: build + arquivo de teste afetado; quick conjunto auth/archive quando houver mudança comum.
- Por wave: npm test e verificação de vazamento do diff/artefatos.
- Gate da fase: suíte verde, revisão de segurança e piloto documentado; itens reais pendentes continuam pendentes.

### Wave 0 Gaps

- [ ] package/lock/Node24 alvo + smoke import Baileys, SQLite create/transaction/FTS5, QR e ESM; audit transitivos/scripts e alertas SUS documentados.
- [ ] tsconfig NodeNext e build que inclui testes; node:test sem Jest/Vitest/tsx adicionais.
- [ ] Fixtures sintéticas com 10 key categories, PN/LID/citações/Long, unknown/viewOnce/temporária, edit/revoke e lotes FULL/notify/append.
- [ ] Servidor fake de mídia com erro antes/tardio/cancel/hash/tamanho; subprocessos de crash e fault injection de SQL/ENOSPC.
- [ ] HTTP tests via fetch local com cookie jar mínimo e runtime fake do coletor; nenhum contato com WhatsApp nesses testes.
- [ ] Verificação de UI nativa: texto escapado, layout/leitor/estados/teclado e QR privado, sem adicionar framework de frontend.
- [ ] Script/procedimento backup+restore offline e gate que impede coletor restaurado automático; prova anterior ao QR.

## Security Domain

Config habilita security_enforcement e nível1. ASVS atual consultado é **5.0.0**: a numeração do template antigo (V2 Authentication etc.) não se aplica; usar V6/V7/V8 no documento e nos planos. Não alegar certificação ASVS ou conformidade integral por essa tabela. [CITED: .planning/config.json] [CITED: https://github.com/OWASP/ASVS/tree/v5.0.0/5.0/en]

### Applicable ASVS Categories

Controles específicos recomendados para o stack e os limites desta fase. [CITED: ASVS5.0.0 capítulos e contexto]

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V1 Encoding/Sanitization | Sim | textContent/saída segura, nunca HTML de conversa |
| V2 Validation/Business Logic | Sim | ID/cursor/limite validados; estados/erro não falsificam disponibilidade |
| V3 Web Frontend Security | Sim | CSP, no-store, nosniff, sem execução de arquivos ativos |
| V4 API/Web Service | Sim | Gate uniforme; sem URLs/path/SQL genéricos; SSRF/limites |
| V5 File Handling | Sim | ID interno, temporários privados, integridade e download protegido |
| V6 Authentication | Sim | Senha scrypt e limitação de tentativa; reset operacional |
| V7 Session Management | Sim | HttpOnly/Secure/SameSite, TTL, regenerate/destroy no servidor |
| V8 Authorization | Sim | Um proprietário, negar ID/HEAD/Range sem sessão |
| V11 Cryptography | Sim | Crypto nativa e protocolo da dependência; sem cifra caseira |
| V12 Secure Communication | Sim | TLS antes de qualquer exposição externa |
| V13/V14/V16 | Sim | Config privada, proteção de dados, logs/erros sanitizados |
| V9/V10/V17 | Não nesta fase | Sem JWT independente/OAuth/WebRTC; MCP entra na fase3 |

### Known Threat Patterns for Node/Express/Baileys/SQLite

| Pattern | STRIDE | Standard Mitigation / fonte |
|---|---|---|
| Spoofing de histórico/app-state | Spoofing/Tampering | Pin contendo fix GHSA, guardar proveniência e limites. [CITED: advisory + guard da tag] |
| Conteúdo de conversa XSS/instrução | Tampering/Elevation | Renderizar como texto; sem executar links/anexos; DTO safe. [CITED: ASVS V1/V3; PRIV-03] |
| Acesso direto ao anexo/QR | Information disclosure | Sessão em cada rota, no-store e paths privados. [CITED: ASVS V7/V8; PRIV-02] |
| ENOSPC/payload/stream infinito/login abuso | Denial of service | Bounds/backpressure/reserva/fila/timeout/tentativas e alerta. [CITED: ASVS V2/V4; D-15/D-16] |
| Logs de erro/backup públicos | Information disclosure | Erro allowlist, logger silent, private copy e diff audit. [CITED: Baileys security; PRIV-03/D-19] |
| Replay/update ambiguamente ordenado | Tampering/Repudiation | Journal/revisões/observação separados; nenhum original inventado. [CITED: D-10/EVID-01] |
| Dois coletores/restauração ligada | Tampering/DoS | Trava de processo e default coletor off no restore. [CITED: D-19] |

## Sources

### Primary — MEDIUM pelo seam; pacotes OK conferidos no registry

- Context7 /whiskeysockets/baileys.wiki-site — auth, v7, histórico, configuração, updates.
- Context7 /expressjs/session — Store, cookies e sessão.
- Context7 /websites/nodejs_latest-v24_x_api — crypto, pipeline e fs.
- Tag Baileys v7.0.0-rc14 commit7e7b0757e3f9f3c7789fb1cfd2f241d5002a199a — Types/Auth.ts, Events.ts, Message.ts, Socket.ts, index.ts, Defaults, auth-utils, use-multi-file-auth-state, process-message, messages/messages-media, socket/messages-recv/chats, WAProto e README.
- https://registry.npmjs.org/ — npm view versões, engines, scripts, gitHead/dist e timestamps; seam package-legitimacy com nomes canônicos.
- https://github.com/WhiskeySockets/Baileys/releases/tag/v7.0.0-rc14 e security/advisories/GHSA-qvv5-jq5g-4cgg — lançamento e correção.
- https://github.com/expressjs/express/releases/tag/v5.3.0; expressjs security; expressjs/session — segurança e sessões.
- https://github.com/WiseLibs/better-sqlite3 e docs/api.md; sqlite.org/wal.html, backup.html — transações/consistência.
- nodejs.org/dist/index.json, APIs Node24 fs/crypto/stream/test — runtime atual e APIs.
- soldair/node-qrcode; typescriptlang.org/download; DefinitelyTyped/types/{node,express,express-session,better-sqlite3,qrcode} — identidade de pacotes.
- OWASP ASVS5.0.0 chapters e Password Storage Cheat Sheet — categorias atuais e senha.
- npm-install v11 docs — omissão de peer com resolução ainda no lock.
- AGENTS/PROJECT/REQUIREMENTS/ROADMAP/STATE/config e 01-CONTEXT, research/{SUMMARY,STACK,ARCHITECTURE,PITFALLS,FEATURES} lidos — autoridade de escopo; não evidência de execução.

### Secondary / Tertiary

- Issues2810 e2671 no repositório Baileys — relatos usados para montar testes/refutação; incidência na conta não observada, não usados como fato de compatibilidade.
- Nenhuma conclusão de suporte derivada de ausência de engines/classificadores/changelog. Nenhum relato comunitário virou lock de versão.

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — official docs + registry/gate/tag, instalação integrada pendente.
- Architecture: MEDIUM — decisões do contexto e APIs disponíveis; esquema/recuperação precisam testes.
- Pitfalls: MEDIUM documental; LOW para incidência de relatos na conta/host, explicitamente não observada.

**Research date:** 2026-10-10  
**Valid until:** revalidar releases/advisories/lock antes de instalar ou pilotar; orientar revisão em até7 dias para Baileys/pacotes recentes. Decisão operacional, não garantia de validade.

**Não realizado:** instalação, build, pareamento, coleta de mensagens, downloads reais, acesso à VPS ou mudança de configuração global. Nenhum requisito marcado completo.

