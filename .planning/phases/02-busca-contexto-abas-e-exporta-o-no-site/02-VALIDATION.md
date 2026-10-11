---
phase: "02"
slug: "busca-contexto-abas-e-exporta-o-no-site"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-11"
---
# Phase 2 — Validation Strategy

Contrato alinhado aos cinco planos,15 tarefas e cinco ondas sequenciais. Nenhum teste novo foi executado ou requisito está concluído por este documento. Todo verify falha por exit não zero, zero testes, alvo obrigatório skipped ou assertion failing; RED exige falha semântica do alvo e classificador TDD.

## Test Infrastructure
- Framework: node:test/TypeScript existentes, Node24.21.0 via mise.
- Build: `mise exec node@24.21.0 -- npm run build`.
- Quick: `mise exec node@24.21.0 -- node --test dist/test/archive.test.js dist/test/http.test.js dist/test/security.test.js dist/test/readonly.test.js`.
- Full: `mise exec node@24.21.0 -- npm test`.
- Pesquisa mediu 4 testes HTTP/security/readonly em 2,67s; duração da suíte ampliada ainda não medida. Falha: exit não zero, zero testes executados ou qualquer teste failing.

## Sampling Rate
- Após tarefa: build e testes dos módulos alterados.
- Após onda: suíte completa; antes de verificação final, suíte completa verde.
- Browser/real/offline: na entrega de cada fluxo utilizável; não repetir sem mudança/falha relevante.

## Per-Task Verification Map
| Task ID | Wave | Tipo | Verificação automatizada no checkout atual | Estado |
|---|---:|---|---|---|
| 02-01-01 | 1 | tracer | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/search.test.js dist/test/ui.test.js` | pending execution |
| 02-01-02 | 1 | tdd | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/period.test.js dist/test/search.test.js` | pending execution |
| 02-01-03 | 1 | auto | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/ui.test.js dist/test/security.test.js dist/test/search.test.js` | pending execution |
| 02-02-01 | 2 | tracer | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/context.test.js dist/test/ui.test.js dist/test/search.test.js` | pending execution |
| 02-02-02 | 2 | tdd | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/context.test.js dist/test/ui.test.js dist/test/auth.test.js` | pending execution |
| 02-02-03 | 2 | auto | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/ui.test.js dist/test/security.test.js dist/test/context.test.js` | pending execution |
| 02-03-01 | 3 | tracer | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/preview.test.js dist/test/ui.test.js` | pending execution |
| 02-03-02 | 3 | tdd | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/preview.test.js dist/test/security.test.js dist/test/readonly.test.js` | pending execution |
| 02-03-03 | 3 | auto | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/ui.test.js dist/test/preview.test.js` | pending execution |
| 02-04-01 | 4 | tracer | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/export.test.js dist/test/ui.test.js` | pending execution |
| 02-04-02 | 4 | tdd | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/export.test.js dist/test/security.test.js dist/test/period.test.js` | pending execution |
| 02-04-03 | 4 | auto | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/ui.test.js dist/test/readonly.test.js dist/test/export.test.js` | pending execution |
| 02-05-01 | 5 | tracer | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/acceptance.test.js && mise exec node@24.21.0 -- node scripts/phase2-acceptance.mjs --mode real-offline` | pending execution |
| 02-05-02 | 5 | auto | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/acceptance.test.js dist/test/ui.test.js && mise exec node@24.21.0 -- node scripts/phase2-acceptance.mjs --mode real-browser` | pending execution |
| 02-05-03 | 5 | auto | `mise exec node@24.21.0 -- npm test` | pending execution |

## Wave 0 Requirements
- Criar testes novos das capacidades junto às tarefas elegíveis de TDD; antes de lógica não trivial, RED observado.
- Infraestrutura já existe; não instalar novo framework só para estes testes.
- Planner pode ajustar nomes/IDs de arquivos acima para o menor conjunto correto, sem omitir riscos.

## Manual-Only Verifications
| Comportamento | Requisito | Por que exige fluxo real | Instruções |
|---|---|---|---|
| Conversa real e contexto | WEB-02/03 | fixture não valida amostra real | localizar conversa conhecida e termo/arquivo, conferir origem e janela; João inexistente fica ausente explícito |
| Duas abas e previews | WEB-04/05 | DOM/codecs/posição no browser | alternar, preservar leitura, teclado e mobile; imagem/áudio/vídeo reais, download de documento |
| ZIP offline completo | EXP-01/02/03 | binários reais e recorte além da página | exportar período com mais mensagens que a página; unzip -t, contagens, referências, tamanhos/hashes e faltantes; sem publicar dados |
| Coletor desligado | WEB-02/03/05, EXP-01/02 | independência real de socket | consultar cópia privada restaurada sem iniciar outro coletor; busca/preview/download/ZIP continuam úteis |

## Validation Sign-Off
- [ ] Tarefas finais têm verify automático/fails_when e IDs alinhados.
- [ ] Nenhuma sequência de três tarefas sem verificação.
- [ ] Novos arquivos/testes implementados; sem placeholders MISSING restantes.
- [ ] Sem watch e latência medida.
- [ ] Aceite browser/real/offline sanitizado.
- [ ] nyquist_compliant true somente após evidência.
**Approval:** pending execution evidence.

## Edge Coverage —42 itens spec-less

Fonte: probe determinístico fornecido pelo orquestrador sobre os oito requisitos;42 aplicáveis,42 resolvidos por critérios explícitos,0 descartados/ausentes. resolved significa especificação de teste, não resultado executado. Todos dependem dos testes indicados; nenhum backstop genérico substitui o alvo.

| Requisito | Categoria | Status | Verification | Critério de resolução | Teste / tarefa |
|---|---|---|---|---|---|
| EVID-02 | boundary | resolved | explicit | InícioUTC incluído, início−1ms excluído; fimUTC−1ms incluído, fim excluído;23h/25h históricos; datas iguais aceitas, invertidas400. | test/period.test.ts;02-01-02 |
| EVID-02 | empty | resolved | explicit | De/Até ausentes/vazios abrem lado; originalnull fica desconhecido e só corresponde sem período; um limite filtra o outro lado. | test/period.test.ts;02-01-02 |
| EVID-02 | encoding | resolved | explicit | Calendário ASCII YYYY-MM-DD,0001..9999; Unicode digits/notação expandida/repeated params400; instanteISO/offset preservado e rótulo America/Sao_Paulo explícito. | test/period.test.ts;02-01-02 |
| EVID-02 | precision | resolved | explicit | Instantes em epoch ms inteiros seguros; null não ézero; Date.max/outside não vira ingestão; nenhum arredondamento de segundo/offset altera o match. | test/period.test.ts;02-01-02 |
| WEB-02 | boundary | resolved | explicit | limit1/50/100 aceitos;0/101/não inteiro400; q até2000 code points/25tokens, acima400; snapshot50000itens/64MiB completo ou413 sem truncar. | test/search.test.ts;02-01-01 |
| WEB-02 | adjacency | resolved | explicit | Homônimos separados porID; AND só entre campos da mesma revisão; termos em versões diferentes não combinam; merge só com PN/LID recebido. | test/search.test.ts;02-01-01/03 |
| WEB-02 | empty | resolved | explicit | Campos vazios consultam todo acervo; candidato digitado sem selecionar impede busca silenciosa; seleção404 seausente; nenhuma correspondência lista vazia explícita. | test/search.test.ts,test/ui.test.ts;02-01-01/03 |
| WEB-02 | encoding | resolved | explicit | Acentos e NFC/NFD correspondem viaFTS unicode61; texto/filenameexport preservado; OR/aspas são literais; limites contam code points, nãobytes; termo sópontuação400. | test/search.test.ts;02-01-01 |
| WEB-02 | ordering | resolved | explicit | Mensagem maisrecente primeiro, unknown último, referênciaBINARY DESC no empate; dedup porref conserva matchingRevisions e freezeordinal. | test/search.test.ts;02-01-01 |
| WEB-02 | precision | resolved | explicit | Nenhum ID/timestampcoagido tonumber; limit inteiroseguro e ordinalvalidado; sem totalestimado e sem timestamp deingestão. | test/search.test.ts;02-01-01/02 |
| WEB-03 | adjacency | resolved | explicit | Janelasbefore/after compartilham mesma âncora, interseções dedup porref, sem repetir âncora na continuação; redirect preserva equivalência evidenciada. | test/context.test.ts;02-02-01 |
| WEB-03 | empty | resolved | explicit | Conversa0/1mensagem, bordaprimeira/última e referênciaausente: listasvazias/cursor null/404seguro sem fabricar vizinhas. | test/context.test.ts;02-02-01 |
| WEB-03 | encoding | resolved | explicit | ReferênciaUUID opaca validada porestrutura, sem normalização pornome/Unicode; cursorbase64url/HMAC inválido ou>1024bytes400; encodedtraversal/Unicodehostil negados. | test/context.test.ts,test/security.test.ts;02-02-01/03 |
| WEB-03 | ordering | resolved | explicit | Ordinalcapturado de timestamp/ref BINARY; >100empates e retroativo durantepáginas não pulam/repetem; unknown último; histórico congelado. | test/search.test.ts,test/context.test.ts;02-01-01,02-02-01 |
| WEB-03 | idempotency | resolved | explicit | Mesmo cursor/direção/snapshot repete exatamente DTO/page; replay não duplica ref/index; refreshexplícito cria nova seleção. | test/context.test.ts,test/search.test.ts;02-02-01/02 |
| WEB-03 | concurrency | resolved | explicit | Ingestão/edição/redirect em paralelo não altera seleção; sessão/cursorcopiado negado; expiração410; restart não reutiliza recorte de sessãoantiga. | test/context.test.ts;02-02-01/02 |
| WEB-04 | adjacency | resolved | explicit | Abrir mesma conversa canônica reusa aba; homônimos diferentes permanecemA/B; redirect evidenciado conciliaID sem merge pornome. | test/ui.test.ts;02-02-01/02 |
| WEB-04 | empty | resolved | explicit | 0abas orientaabrir;1 funciona;2+ têm estado próprio semteto2; fecharúltima foca lista, outra foca próxima/anterior. | test/ui.test.ts;02-02-03 |
| WEB-04 | ordering | resolved | explicit | Abas emordem deabertura; setas/Home/End seguemDOM, somenteativo visível; seleção distinta defoco e close decide próxima/anterior. | test/ui.test.ts;02-02-03 |
| WEB-04 | idempotency | resolved | explicit | Reabrir mesma conversa ativaexistente; refreshB não recriaA; cliques repetidos enquanto loading não duplicam request/aba. | test/ui.test.ts;02-02-01/02 |
| WEB-04 | concurrency | resolved | explicit | RetençãoA/B, close, refresh, logout/TTL/page restore invalidam tickets corretamente; scroll/âncora eplayers não migram, storagesemconteúdo. | test/ui.test.ts;02-02-02/03 |
| WEB-05 | adjacency | resolved | explicit | Anexos deoriginal/edição comnomeigual permanecemIDs/revisionIds distintos;preview emA não alteraB nem substitui original. | test/preview.test.ts,test/ui.test.ts;02-03-01/03 |
| WEB-05 | empty | resolved | explicit | Sem anexo mantém mensagem; arquivo0bytes disponível baixa0bytes epreview415;missing404 e pendente/falha/indisponível têm motivo seguro. | test/preview.test.ts;02-03-02 |
| WEB-05 | ordering | resolved | explicit | Ordem de anexos capturada/IDs estável; abrir/fechar preview não reordena mensagens/anexos; visibilidadeseparada dodownload. | test/ui.test.ts;02-03-03 |
| WEB-05 | idempotency | resolved | explicit | HEAD não transfere corpo, GET/Range repetidos dofdverificado retornam mesmos bytes/hash;previewerror não muda availability; sem novo downloadremoto. | test/preview.test.ts;02-03-02 |
| WEB-05 | concurrency | resolved | explicit | Abort/close/switch/logout liberamfd/players, respostaHEAD tardia não iniciaGET; binarymissing duranteopen retorna404 sem perdermensagem. | test/preview.test.ts,test/ui.test.ts;02-03-02/03 |
| EXP-01 | boundary | resolved | explicit | Todosregistros além50/100; início/fim exatos e23/25h mesmosdeparsePeriod; limite50000/64MiB/2GiB excedido falhaclara sem truncamento. | test/export.test.ts,test/period.test.ts;02-04-01/02 |
| EXP-01 | adjacency | resolved | explicit | Períodos consecutivos exclusivos não duplicam instante nafronteira; IDs/filenamesiguais pororigem não colidem; somenteconversa selecionada. | test/export.test.ts;02-04-02 |
| EXP-01 | empty | resolved | explicit | Recorte0mensagens422 eUIajustadatas;1exporta;datasvazias selecionamtoda conversa e unknown; convo404não criajob. | test/export.test.ts,test/ui.test.ts;02-04-01/03 |
| EXP-01 | ordering | resolved | explicit | Todo recorte cronológico pororiginal/refASC, unknownfim, ingestãonão éordem; seleção iniciada ignora retroativo/edição/merge posterior. | test/export.test.ts;02-04-01/02 |
| EXP-01 | precision | resolved | explicit | Mesmo EffectivePeriod epochms da busca, sem serializaçãolexical imprecisa; contagens deSQL/ZIP completas, size como inteiros verificáveis. | test/export.test.ts;02-04-02 |
| EXP-01 | idempotency | resolved | explicit | Um POST geraum job/recorte; clique emvoo desabilitado; POST simultâneo409; retry apósfailed cria jobnovo sem mudar/evidenciar sucesso doantigo. | test/export.test.ts,test/ui.test.ts;02-04-01/03 |
| EXP-01 | concurrency | resolved | explicit | Uma claimglobal; freeze antes202; leitura durantepreparo;SIGKILL/restart falha derivado pendente, nenhuma segunda coleta/ingestão noZIP congelado. | test/export.test.ts;02-04-02 |
| EXP-02 | adjacency | resolved | explicit | Mesmo nome/digest em2anexos usa2IDs/entriesúnicas; missingligado àmensa/revisão; versãohistórica não seconfunde comatual. | test/export.test.ts;02-04-02 |
| EXP-02 | empty | resolved | explicit | Sem attachments produztexto/manifest válidos,0arquivos/0faltantes; originalvazio disponível tem0bytes/hash; semmensagens não éZIPsucesso. | test/export.test.ts;02-04-02 |
| EXP-02 | encoding | resolved | explicit | Texto/manifest UTF-8 conserva Unicode/RTL/NFCNFD dooriginal; entries sóUUIDASCII; nome recebido vira metadata, nunca path; CRLF/traversal não esconde/abrebytes. | test/export.test.ts,test/security.test.ts;02-04-02 |
| EXP-02 | ordering | resolved | explicit | Texto earray de messages cronológico congelado; attachments/revisions têm vínculo estável; conferência independe daordem dasentradasZIP. | test/export.test.ts;02-04-02 |
| EXP-02 | concurrency | resolved | explicit | Availabilitycapturada não inclui arquivo recuperado depois; opencompara hashsizecongelados; missingpre-open listado; falhastream pósopen jobfailed, semZIPready. | test/export.test.ts;02-04-01/02 |
| EXP-03 | empty | resolved | explicit | Sem job404, expired410, preparing/failed409download; nenhumaURL habilitada para0pacote/parcial; ausência deespaço507 segura. | test/export.test.ts,test/ui.test.ts;02-04-02/03 |
| EXP-03 | encoding | resolved | explicit | Pathcliente/filename Unicode/absoluto/traversal/CRLF rejeitados oumetadado apenas; entriesUUID semslash externo; erros/logs semsentinelasegreta. | test/export.test.ts,test/security.test.ts;02-04-02 |
| EXP-03 | idempotency | resolved | explicit | Restart/limpeza repetidos removem sóderivados conhecidos e idempotentes; nunca apagamoriginal/db/auth; retryjobnão sobrescreve pacote pronto. | test/export.test.ts;02-04-02 |
| EXP-03 | concurrency | resolved | explicit | Interromper pipeline/fdatasync/link/ready/verify, CRCerrado, entradafaltante/duplicada eENOSPC nunca deixa ready; authrevogada antesdownload nega bytes. | test/export.test.ts,test/security.test.ts;02-04-02 |
## UI Coverage —49 critérios

Critérios completos ficam em02-UI-SPEC.md; os IDs abaixo cobrem todos49, sem transformar aprovação7/7 do documento em QA executada.

| IDs | Superfície | Tarefa responsável | Prova planejada |
|---|---|---|---|
| UC-01,UC-02,UC-03,UC-04,UC-05,UC-06,UC-07,UC-08 | candidatos |02-01-03| test/ui.test.ts: vazio/loading/erro/seleção distinta/Unicode/reflow |
| UC-09,UC-10,UC-11,UC-12,UC-13,UC-14 | formulário/alcance |02-01-02/03| período/UTC e DOM320/768/1280/200% |
| UC-15,UC-16,UC-17,UC-18,UC-19,UC-20,UC-21,UC-22 | resultados |02-01-01/03| versões/zero/um/muitos/continuação/erro/expire |
| UC-23,UC-24,UC-25,UC-26,UC-27,UC-28,UC-29,UC-30 | contexto |02-02-01/03| âncora/vizinhas/estado anterior/Unicode/scroll |
| UC-31,UC-32,UC-33,UC-34 | abas |02-02-02/03| teclado/close/duas posições/races/logout |
| UC-35,UC-36,UC-37,UC-38,UC-39 | preview/anexo |02-03-01/03| clique explícito,codec/fallback/bytes/controls/close |
| UC-40,UC-41,UC-42,UC-43,UC-44,UC-45 | export seleção |02-04-01/03| vazio/período próprio/filtros reais/labels congelados/reflow |
| UC-46,UC-47,UC-48,UC-49 | export job |02-04-02/03| loading/poll failure/faltantes/ready verificado/expire |
| Todos49 | aceite site real e estados sintéticos |02-05-02| checklist discrimina fixture de conta; nenhum conteúdo privado em Git |

## Multi-Source Coverage Audit

Todos44 itens abaixo COVERED; exclusões explícitas: MCP/Codex fase3, VPS/HTTPS/backup externo fase4, Claude/importadorv2 e Deferred Ideas. D-01..D-20 também constam nos must_haves.truths dos planos responsáveis. Nenhuma funcionalidade foi trocada por rótulo estático ouomitida por custo.

| Fonte | ID | Item | Plano/tarefa | Status |
|---|---|---|---|---|
| GOAL | Phase2 | Encontrar mensagens/anexos, verificar contexto, comparar abas e exportar todo recorte | 02-01..05 | COVERED |
| REQ | EVID-02 | Instante original, America/Sao_Paulo e UTC/offset | 02-01/02/04/05 | COVERED |
| REQ | WEB-02 | Contato+termo+período, texto/legenda/filename e homônimos | 02-01/05 | COVERED |
| REQ | WEB-03 | Página congelada e contexto por referência | 02-01/02/05 | COVERED |
| REQ | WEB-04 | Abas com duas leituras independentes | 02-02/05 | COVERED |
| REQ | WEB-05 | Preview seguro e qualquer original disponível | 02-03/05 | COVERED |
| REQ | EXP-01 | Toda conversa/período além da página | 02-04/05 | COVERED |
| REQ | EXP-02 | Texto/manifesto/arquivos, versões e faltantes | 02-04/05 | COVERED |
| REQ | EXP-03 | Falha/crash/espaço e paths seguros | 02-04/05 | COVERED |
| RESEARCH | R-01 | PinsNode/Express/SQLite/nativeUI e pacote auditado | 02-01-02 | COVERED |
| RESEARCH | R-02 | FTS5 por revisão permitida, literalAND, rebuild/ingestão/replay/merge | 02-01-01 | COVERED |
| RESEARCH | R-03 | revisionId/fingerprint noDTO e vínculo de anexo | 02-01-01,02-04-02 | COVERED |
| RESEARCH | R-04 | Snapshot deDTO/ordinal/filtro em transação síncrona, HMAC/sessão/TTL/purge | 02-01-01,02-02-02 | COVERED |
| RESEARCH | R-05 | Contexto bidirecional com referência/redirect e matchingEvidence | 02-02-01 | COVERED |
| RESEARCH | R-06 | Map deabas/scroll/generation, tecladoAPG e cleanup | 02-02-01..03 | COVERED |
| RESEARCH | R-07 | Preview MIME+assinatura/fd/HEAD/Range/nosniff e fallback | 02-03-01..03 | COVERED |
| RESEARCH | R-08 | Seleção integral/job exclusivo/DTOsnapshot/availabilitycapturada | 02-04-01/02 | COVERED |
| RESEARCH | R-09 | yazl/yauzl stream/ZIP64/CRC32/SHA e entrada/conjunto/tamanho | 02-04-01/02 | COVERED |
| RESEARCH | R-10 | ENOSPC/crash/streamabort/fsync/publicação e limpeza sóderivados | 02-04-02 | COVERED |
| RESEARCH | R-11 | Temporal/UTCms/23h/25h/unknown/limites abertos | 02-01-02,02-04-02 | COVERED |
| RESEARCH | R-12 | Backup anterior deacervo, migração derivada/rebuild e fixturebaseline6 | 02-01-01,02-05-01 | COVERED |
| RESEARCH | R-13 | node:test/RED+GREEN e browser/races/fault/readonly/security | 02-01..05 | COVERED |
| RESEARCH | R-14 | Aceite realprivado/offline semsegundocoletor/MCP/VPS/QR | 02-05-01..03 | COVERED |
| RESEARCH | R-15 | ASVS5.0.0 L1, authdireta/CSRF, no-store, erros sanitizados | Todos5 threat_models e testes | COVERED |
| CONTEXT | D-01 | AND+alcance | 02-01/05 | COVERED |
| CONTEXT | D-02 | IDcanônico/homônimos | 02-01/05 | COVERED |
| CONTEXT | D-03 | evidência porrevisão | 02-01/05 | COVERED |
| CONTEXT | D-04 | ordemliteral/resultado | 02-01/05 | COVERED |
| CONTEXT | D-05 | calendárioDST | 02-01/05 | COVERED |
| CONTEXT | D-06 | originalUTC | 02-01/05 | COVERED |
| CONTEXT | D-07 | freeze/continuação | 02-01/05 | COVERED |
| CONTEXT | D-08 | contextobidirecional | 02-02/05 | COVERED |
| CONTEXT | D-09 | abasindependentes | 02-02/05 | COVERED |
| CONTEXT | D-10 | memóriasemstorage | 02-02/05 | COVERED |
| CONTEXT | D-11 | teclado/mobile | 02-02/05 | COVERED |
| CONTEXT | D-12 | logout/race/refresh | 02-02/05 | COVERED |
| CONTEXT | D-13 | formatosefallow | 02-03/05 | COVERED |
| CONTEXT | D-14 | cliquesembinaryantecipado | 02-03/05 | COVERED |
| CONTEXT | D-15 | fd/auth/Range/HEAD | 02-03/05 | COVERED |
| CONTEXT | D-16 | estado/faltantesoffline | 02-03/05 | COVERED |
| CONTEXT | D-17 | recorteintegralcongelado | 02-04/05 | COVERED |
| CONTEXT | D-18 | TXT/manifest/arquivos/revisões | 02-04/05 | COVERED |
| CONTEXT | D-19 | namesUUID/safepaths | 02-04/05 | COVERED |
| CONTEXT | D-20 | jobexclusive/fault/readyverificado | 02-04/05 | COVERED |

## Proibições e controles canônicos
Sem SPEC, aplicar recall/precision aos requisitos: a evidência não deve se tornar certeza sobre histórico, conteúdo atual, conclusão de negócio, original inexistente ou pacote parcial. P-02-01..P-02-07 são retidas como testáveis com enforcementEvidence nos planos, disposition flagged-unverified até prova concreta. Não existem check descriptors anteriores; nenhum check_* foi inventado ou auto-dismiss feito. Testes/ações planejados não contam como execução, locate ou fail-first.

| ID | Requisito | Enforcement planejado | Disposição atual |
|---|---|---|---|
| P-02-01 | EVID-02 | period/search: null não usa ingestão | flagged-unverified |
| P-02-02 | WEB-02 | search: AND entre versões não corresponde; histórico rotulado | flagged-unverified |
| P-02-03 | WEB-04 | browser races/storage/logout; duas leituras não misturam | flagged-unverified |
| P-02-04 | WEB-05 | preview/codec mantém download; miniatura não satisfaz original | flagged-unverified |
| P-02-05 | EXP-02 | manifest/texto com cobertura parcial, revisões e todos missing | flagged-unverified |
| P-02-06 | EXP-03 | ZIP fault/crash/CRC/entries impedem ready | flagged-unverified |
| P-02-07 | EXP-01 | acceptance self-check recusa fixture/truncado como real | flagged-unverified |

Canon security (XSS, IDOR, CSRF, sessão, traversal, package supply-chain) refere aos threat_models T-02-01..T-02-22 e T-02-SC/ASVS5.0.0 L1 e ao controle gsd-secure-phase; não duplicado como valores genéricos. Bloqueio configurado: high. Sem novas permissões de WhatsApp.

## Discovery, gates e orçamento
- Discovery Level2 satisfeito pela02-RESEARCH existente, fontes primárias, auditOK e probes isolados sob Node24.21.0; planner não instala pacotes nem repete pesquisa.
- estimate-calibration: factor1, sample_count0, confidence low; estimativas raw/calibradas42k/36k/25k/45k/24k por plano,3tarefas cada. São projeções, não consumo medido.
- API coverage detector executado sobre cinco PLAN+Phase2 deROADMAP: detected:false, signals:[], exit1 (negativo válido, não skipped). A fase usa rotas próprias do arquivo, sem nova API/SDK/serviço externo; COVERAGE.md não necessário.
- assumption-delta scan2: detected:false, signals:[]; identidade primária continua conversationIDcanônico recebido. Abas são múltiplas leituras dessa entidade, sem segundo owner/conta.
- Schema scan nos artefatos/arquivos: nenhum Prisma/Drizzle/Payload/Supabase/TypeORM. Derivados SQLite aditivos/reconstruíveis e baseline PRAGMA user_version6 preservada; não há ORMpush.
- Graphify disabled, mapas .planning/codebase e skills locais ausentes; usar02-PATTERNS e fonte rastreada.
- Pré-condições deaceite: snapshot/caso realprivados daPhase1 e browser instalado. Executor procura/valida as provas existentes emprivado; falta deamostra/prova élimite concreto, seminventar conteúdo nem novo pareamento.
- Ondas1→2→3→4→5 por dependência e arquivos compartilhados; nenhuma paralelização falsa. STATE/ROADMAP ficam comorquestrador.

## Artefatos e símbolos produzidos
| Plano | Caminhos/símbolos de produto | Testes/artefatos de evidência |
|---|---|---|
|02-01| src/archive.ts searchMessages/FTS/query_snapshots; src/period.ts parsePeriod; /api/search; app formulário/candidatos/resultados | search.test.ts,period.test.ts,ui.test.ts; security expandido |
|02-02| src/archive.ts openContext/readContextPage; /api/context/:reference; tabsMap/session/local generation | context.test.ts; ui/security/auth cenários |
|02-03| src/media.ts classifyPreview; /api/attachments/:id/preview; controles nativos | preview.test.ts; ui/security/readonly |
|02-04| src/archive.ts freezeExportSelection; src/export.ts createExportManager/createExportJob/getExportJob/openExport/buildZip/verifyZip; /api/exports | export.test.ts; ui/security/readonly |
|02-05| scripts/phase2-acceptance.mjs --mode real-offline/real-browser | acceptance.test.ts;02-ACCEPTANCE.md; ledgerVALIDATION |


