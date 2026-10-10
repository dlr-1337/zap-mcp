# API Coverage — Baileys / Zap MCP Phase 1

Cobertura começa completa e opt-outs têm razão explícita. Matriz por famílias da superfície do socket/pin7.0.0-rc14 e capacidades correlatas, fontes em 01-RESEARCH.md. Não afirma execução. Helpers de baixo nível são internos; não viram API pública.

| capability | decision | reason |
|---|---|---|
| socket.auth.keys / creds.update | INTEGRATE | Auth transacional, dez categorias e profile exclusivo — 01-03. |
| socket.connection.update / QR / close-restart | INTEGRATE | QR privado vigente, seis estados e budget de reconnect — 01-03/07. |
| requestPairingCode (telefone/código) | OPT-OUT | D-05 escolheu QR; não criar segundo modo de pareamento. |
| logout / revoke linked device | OPT-OUT | D-03/D-08: logout web não desvincula conta nem apaga arquivo. |
| messaging-history.set / status / FULL / upsert notify-append | INTEGRATE | Todos itens recebidos, lotes/falhas/alcance — 01-02/03. |
| fetchMessageHistory / pedidos extras suportados | INTEGRATE | Somente quando necessários ao piloto e compatíveis com o pin; registrar alcance recebido — 01-07-02. |
| getMessage para protocolo/retry | INTEGRATE | Lê proto permitido do arquivo privado, nunca do browser — 01-02/03. |
| messages.update / delete / edit-revoke recebidos | INTEGRATE | Observações/revisões/tombstones sem mutação remota — 01-02. |
| contacts.upsert/update / chats.upsert/update / groups.update / group-participants.update / lid-mapping | INTEGRATE | Metadados/aliases recebidos com proveniência, não merge por nome — 01-02/03. |
| downloadMediaMessage / downloadContentFromMessage (originais) | INTEGRATE | Áudio/imagem/vídeo/documento por stream validado — 01-04. |
| updateMediaMessage / reuploadRequest | INTEGRATE | Renovação interna suportada de original permitido; não enviar mensagens — 01-04. |
| thumbnail / profilePictureUrl / geração de mídia / transcodificação | OPT-OUT | D-13/D-17: preservar original; previews completos são fase2, sem avatar remoto. |
| viewOnce unwrap/recovery | OPT-OUT | D-11 proíbe contornar restrição; somente metadados sem payload recuperável. |
| sendMessage / relayMessage / edit / delete / reactions / polls / forwarding / scheduled messages | OPT-OUT | Usuário proíbe envio/edição/exclusão e automação de escrita no WhatsApp. |
| readMessages / read/read-self/played receipts | OPT-OUT | Usuário proíbe confirmação de leitura; consulta não marca lida. |
| delivery/sync acknowledgements e retries internos do protocolo | INTEGRATE | A biblioteca pode enviar acks necessários; distintos de leitura — 01-03-02. |
| sendPresenceUpdate / typing / presenceSubscribe | OPT-OUT | Não anunciar leitura/typing nem construir monitoramento de presença; markOnlineOnConnect false. |
| chatModify / archive / mute / pin / star / delete-chat / labels writes | OPT-OUT | Somente leitura remota; retenção local não altera conversa do WhatsApp. |
| groupCreate / participant operations / subject/description/settings / invites / join/leave | OPT-OUT | Administração de grupos não é necessária ao arquivo e ampliaria escrita remota. |
| onWhatsApp / fetchBlocklist / updateBlockStatus / contact-management / profile/status/privacy writes | OPT-OUT | Sem descoberta/gestão remota de contatos, perfil ou privacidade; usar metadados recebidos. |
| newsletter / channels subscription/create/manage / broadcast/status publication | OPT-OUT | Publicação/gestão de canais/status não foi solicitada; tipos recebidos sem suporte ficam explícitos. |
| calls / rejectCall / offer / voice-video realtime | OPT-OUT | Chamadas ao vivo/administração não pertencem ao arquivo textual e anexos recebidos. |
| business/catalog/product/order/payment APIs | OPT-OUT | CRM, comércio e pagamentos fora do escopo pessoal do usuário. |
| raw query / generic IQ / USync / app-state sync | INTEGRATE | Uso interno encapsulado pela biblioteca para protocolo/identidade; nenhuma rota genérica ou comando remoto público — 01-03. |
| raw query / generic IQ expostos ao usuário | OPT-OUT | Poder remoto arbitrário quebraria somente leitura e fronteira do coletor. |
| socket utility tests / crypto/media internal helpers | INTEGRATE | Helpers do pin somente nas capacidades permitidas; não reimplementar Signal/protocolo. |
| MCP SDK / export / busca/abas/preview completo | OPT-OUT | Não são capacidades Baileys novas desta fase; pertencem às fases2/3 do ROADMAP. |

## Auditoria multi-fonte

| SOURCE | ID | Feature/Requirement | Plan/task | Status |
|---|---|---|---|---|
| GOAL | G-01 | Vincular sem browser e consultar arquivo privado durável offline | 01-01..07 | COVERED |
| GOAL | SC-01 | Entrada/logout/QR privados e conteúdo seguro | 01-01; 01-03; 01-05; 01-07 | COVERED |
| GOAL | SC-02 | Lotes/novas mensagens/proveniência/PN-LID real | 01-02; 01-03; 01-07 | COVERED |
| GOAL | SC-03 | Sessão válida/restart/único coletor/replay/offline | 01-03; 01-06; 01-07 | COVERED |
| GOAL | SC-04 | Originais/estados/integridade/reconcile/ENOSPC | 01-04; 01-05; 01-07 | COVERED |
| GOAL | SC-05 | Cobertura/revisões/temporárias/conta conhecida | 01-02; 01-05; 01-07 | COVERED |
| REQ | PRIV-01 | Texto normativo em REQUIREMENTS.md | 01-01, 01-05, 01-07 | COVERED |
| REQ | PRIV-02 | Texto normativo em REQUIREMENTS.md | 01-01, 01-03, 01-04, 01-05, 01-06, 01-07 | COVERED |
| REQ | PRIV-03 | Texto normativo em REQUIREMENTS.md | 01-01, 01-02, 01-03, 01-04, 01-05, 01-06, 01-07 | COVERED |
| REQ | SYNC-01 | Texto normativo em REQUIREMENTS.md | 01-03, 01-05, 01-07 | COVERED |
| REQ | SYNC-02 | Texto normativo em REQUIREMENTS.md | 01-02, 01-04, 01-07 | COVERED |
| REQ | SYNC-03 | Texto normativo em REQUIREMENTS.md | 01-02, 01-03, 01-04, 01-07 | COVERED |
| REQ | SYNC-04 | Texto normativo em REQUIREMENTS.md | 01-03, 01-06, 01-07 | COVERED |
| REQ | SYNC-05 | Texto normativo em REQUIREMENTS.md | 01-02, 01-03, 01-07 | COVERED |
| REQ | SYNC-06 | Texto normativo em REQUIREMENTS.md | 01-02, 01-05, 01-07 | COVERED |
| REQ | SYNC-07 | Texto normativo em REQUIREMENTS.md | 01-02, 01-05, 01-07 | COVERED |
| REQ | EVID-01 | Texto normativo em REQUIREMENTS.md | 01-02, 01-04, 01-05, 01-07 | COVERED |
| REQ | MEDIA-01 | Texto normativo em REQUIREMENTS.md | 01-04, 01-07 | COVERED |
| REQ | MEDIA-02 | Texto normativo em REQUIREMENTS.md | 01-04, 01-05, 01-06, 01-07 | COVERED |
| REQ | MEDIA-03 | Texto normativo em REQUIREMENTS.md | 01-04, 01-05, 01-06, 01-07 | COVERED |
| REQ | WEB-01 | Texto normativo em REQUIREMENTS.md | 01-01, 01-02, 01-03, 01-04, 01-05, 01-06, 01-07 | COVERED |
| CONTEXT | D-01 | Senha local | 01-01-01/02 | COVERED |
| CONTEXT | D-02 | Sessão revogável servidor | 01-01-01/02; 01-05-02 | COVERED |
| CONTEXT | D-03 | Logout separado | 01-01-02 | COVERED |
| CONTEXT | D-04 | Reset operacional | 01-01-02 | COVERED |
| CONTEXT | D-05 | QR privado vigente | 01-03-01; 01-05-01; 01-07-01 | COVERED |
| CONTEXT | D-06 | Seis estados | 01-03-01/02; 01-05-01 | COVERED |
| CONTEXT | D-07 | Retry limitado | 01-03-02; 01-07-03 | COVERED |
| CONTEXT | D-08 | Arquivo intacto ao parear | 01-03-02; 01-07-03 | COVERED |
| CONTEXT | D-09 | Todos lotes disponibilizados | 01-02-01; 01-07-02 | COVERED |
| CONTEXT | D-10 | Retenção/revisões indefinidas | 01-02-01 | COVERED |
| CONTEXT | D-11 | Temporária/viewOnce sem bypass | 01-02-01; 01-04-01 | COVERED |
| CONTEXT | D-12 | Cobertura observada | 01-02-02; 01-05-01; 01-07-02 | COVERED |
| CONTEXT | D-13 | Quatro originais desde ingestão | 01-04-01; 01-07-02/03 | COVERED |
| CONTEXT | D-14 | Quatro estados verificados | 01-04-01; 01-05-01 | COVERED |
| CONTEXT | D-15 | Fila/reconcile limitado | 01-04-02 | COVERED |
| CONTEXT | D-16 | ENOSPC sem expurgo | 01-04-02; 01-05-01 | COVERED |
| CONTEXT | D-17 | Leitor único limitado | 01-01-03; 01-05-01 | COVERED |
| CONTEXT | D-18 | Evidência/tempo/identidade | 01-02-01/02; 01-05-01 | COVERED |
| CONTEXT | D-19 | Cópia/restore/exclusividade | 01-03-01; 01-06-01/02; 01-07-01 | COVERED |
| CONTEXT | D-20 | Piloto real/comparação/offline | 01-07-01/02/03 | COVERED |
| RESEARCH | R-01 | Node24/pins/lock/import/ABI/FTS5/QR | 01-01-01 | COVERED |
| RESEARCH | R-02 | Auditoria SUS/transitivos/scripts/patch advisory | 01-01-01 | COVERED |
| RESEARCH | R-03 | Dois SQLite e sessão web Store/scrypt/CSRF/TTL | 01-01-01/02 | COVERED |
| RESEARCH | R-04 | Single writer/auth dez categorias/BufferJSON/proto/null | 01-03-01 | COVERED |
| RESEARCH | R-05 | Creds parcial/commit/SQL falho/corrupção fail-closed | 01-03-01 | COVERED |
| RESEARCH | R-06 | Todos itens FULL/notify/append; callback drenado | 01-02-01; 01-03-01 | COVERED |
| RESEARCH | R-07 | Chave origem/ref/PN-LID tardio/redirect/homônimos | 01-02-01 | COVERED |
| RESEARCH | R-08 | Tempo original/Long/citação recebida limitada | 01-02-01/02 | COVERED |
| RESEARCH | R-09 | Journal permitido/revoke/update antes original/conflito | 01-02-01 | COVERED |
| RESEARCH | R-10 | Restriction gate antes normalizador inclusive citações | 01-02-01; 01-04-01 | COVERED |
| RESEARCH | R-11 | Coverage explicit/inferred/sem promessa/watchdog | 01-02-02 | COVERED |
| RESEARCH | R-12 | Disconnect codes/QR efêmero/six retries/cleanup | 01-03-01/02 | COVERED |
| RESEARCH | R-13 | Read-only sem send/read/played/typing; acks distinguidos | 01-03-02 | COVERED |
| RESEARCH | R-14 | Stream quatro originais/thumbnail não original/reupload | 01-04-01 | COVERED |
| RESEARCH | R-15 | Destination HTTPS/redirect/DNS público SSRF | 01-04-01 | COVERED |
| RESEARCH | R-16 | Hashes/tamanho/fsync/rename/commit/backpressure | 01-04-01 | COVERED |
| RESEARCH | R-17 | Leases/retry5/conc2/timeout120s/offline não gasta | 01-04-01/02 | COVERED |
| RESEARCH | R-18 | Crash job/temp/rename/final e reconcile repetido | 01-04-02 | COVERED |
| RESEARCH | R-19 | ENOSPC/reserva e falha de próprio registro | 01-04-02 | COVERED |
| RESEARCH | R-20 | API private ID/cursor/HEAD/Range/attachment/no-store | 01-05-02 | COVERED |
| RESEARCH | R-21 | UI nativa/sem frontend deps/textContent/CSP/foco | 01-01-03; 01-05-01/02 | COVERED |
| RESEARCH | R-22 | Cópia coordenada/restore sem coletor/gate pré-QR | 01-06-01/02 | COVERED |
| RESEARCH | R-23 | A1/A2/A3 ambiente/cobertura incertos | 01-01-01; 01-07-01/02/03 | COVERED |
| RESEARCH | R-24 | Piloto/celular/quatro tipos/restart/offline | 01-07-01/02/03 | COVERED |

Todos os15 requisitos/20 decisões/24 grupos de pesquisa/Goal e5 critérios estão planejados. COVERED significa tarefa/critério definido, nunca requisito implementado. Excluídos pela própria fonte: fases2/3/4 completas e v2, conforme Deferred Ideas; antecipação de snapshot não move responsabilidade final OPS-02.

## Grafo de tarefas e ondas

| Plan | Wave | Needs | Creates | Checkpoint |
|---|---|---|---|---|
| 01-01 | 1 | docs rastreados; nenhum código | package.json, src/main.ts, src/auth.ts, test/tracer.test.ts, public/index.html | não |
| 01-02 | 2 | 01-01 + src/main.ts | src/archive.ts, test/archive.test.ts, test/revisions.test.ts, test/coverage.test.ts | não |
| 01-03 | 3 | 01-02 + src/main.ts | src/whatsapp.ts, test/auth-state.test.ts, test/collector.test.ts, test/readonly.test.ts | não |
| 01-04 | 4 | 01-03 + src/main.ts | src/media.ts, test/media.test.ts, test/recovery.test.ts | não |
| 01-05 | 5 | 01-04 + src/main.ts | public/index.html, public/app.js, public/style.css, test/http.test.ts, test/security.test.ts | não |
| 01-06 | 6 | 01-05 + src/main.ts | src/backup.ts, test/backup.test.ts, README.md | não |
| 01-07 | 7 | 01-06 + src/main.ts | README.md, src/main.ts | QR e comparação no celular |

src/main.ts é compartilhado e precisa evoluir em sequência. Nenhum plano na mesma wave compartilha arquivo; sete waves evitam falso paralelismo e merges artificiais. Todo arquivo de teste é criado pela tarefa que primeiro o usa; nenhuma dependência de test file futuro. Ativos novos são propostas até execução; fontes existentes estão em git ls-files. Estimativa factor1/confidence low/sample_count0 foi obtida por estimate-calibration; projeção não é medição.

## Edge Coverage — fallback sem SPEC

61 candidatos do probe de15 requisitos,61 resolvidos explicitamente em must_haves.truths, zero descartados/omitidos, zero unclassified. Cada EP aponta para o contrato integral na truth e a task de implementação/teste; se a evidência não existir, o verifier não passa o item. Incidência/cobertura/latência real A1/A2 permanece backstop no plano07; fixture não fecha essa suposição.

| Edge ID | Requirement.category | Plan/task | Verification | Backstop/flag |
|---|---|---|---|---|
| EP-01 | PRIV-01.idempotency | 01-01 (test/auth.test.ts) | explicit; truth integral no PLAN | não |
| EP-02 | PRIV-01.concurrency | 01-01 (test/auth.test.ts) | explicit; truth integral no PLAN | não |
| EP-03 | PRIV-02.empty | 01-05 (test/http.test.ts) | explicit; truth integral no PLAN | não |
| EP-04 | PRIV-02.encoding | 01-05 (test/http.test.ts) | explicit; truth integral no PLAN | não |
| EP-05 | PRIV-02.concurrency | 01-05 (test/http.test.ts) | explicit; truth integral no PLAN | não |
| EP-06 | PRIV-03.empty | 01-05 (test/security.test.ts) | explicit; truth integral no PLAN | não |
| EP-07 | PRIV-03.encoding | 01-05 (test/security.test.ts) | explicit; truth integral no PLAN | não |
| EP-08 | PRIV-03.concurrency | 01-05 (test/security.test.ts) | explicit; truth integral no PLAN | não |
| EP-09 | SYNC-01.idempotency | 01-03 (test/collector.test.ts) | explicit; truth integral no PLAN | não |
| EP-10 | SYNC-01.concurrency | 01-03 (test/collector.test.ts) | explicit; truth integral no PLAN | não |
| EP-11 | SYNC-02.adjacency | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-12 | SYNC-02.empty | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-13 | SYNC-02.ordering | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-14 | SYNC-02.idempotency | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-15 | SYNC-02.concurrency | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-16 | SYNC-03.adjacency | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-17 | SYNC-03.empty | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-18 | SYNC-03.ordering | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-19 | SYNC-03.idempotency | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-20 | SYNC-03.concurrency | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-21 | SYNC-04.idempotency | 01-03 (test/auth-state.test.ts) | explicit; truth integral no PLAN | não |
| EP-22 | SYNC-04.concurrency | 01-03 (test/auth-state.test.ts) | explicit; truth integral no PLAN | não |
| EP-23 | SYNC-05.adjacency | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-24 | SYNC-05.empty | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-25 | SYNC-05.encoding | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-26 | SYNC-05.ordering | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-27 | SYNC-05.idempotency | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-28 | SYNC-05.concurrency | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-29 | SYNC-06.empty | 01-02 (test/revisions.test.ts) | explicit; truth integral no PLAN | não |
| EP-30 | SYNC-06.encoding | 01-02 (test/revisions.test.ts) | explicit; truth integral no PLAN | não |
| EP-31 | SYNC-06.idempotency | 01-02 (test/revisions.test.ts) | explicit; truth integral no PLAN | não |
| EP-32 | SYNC-06.concurrency | 01-02 (test/revisions.test.ts) | explicit; truth integral no PLAN | não |
| EP-33 | SYNC-07.adjacency | 01-02 (test/coverage.test.ts) | explicit; truth integral no PLAN | não |
| EP-34 | SYNC-07.empty | 01-02 (test/coverage.test.ts) | explicit; truth integral no PLAN | não |
| EP-35 | SYNC-07.ordering | 01-02 (test/coverage.test.ts) | explicit; truth integral no PLAN | não |
| EP-36 | SYNC-07.idempotency | 01-02 (test/coverage.test.ts) | explicit; truth integral no PLAN | não |
| EP-37 | SYNC-07.concurrency | 01-02 (test/coverage.test.ts) | explicit; truth integral no PLAN | não |
| EP-38 | EVID-01.adjacency | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-39 | EVID-01.empty | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-40 | EVID-01.encoding | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-41 | EVID-01.ordering | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-42 | EVID-01.idempotency | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-43 | EVID-01.concurrency | 01-02 (test/archive.test.ts) | explicit; truth integral no PLAN | não |
| EP-44 | MEDIA-01.adjacency | 01-04 (test/media.test.ts) | explicit; truth integral no PLAN | não |
| EP-45 | MEDIA-01.empty | 01-04 (test/media.test.ts) | explicit; truth integral no PLAN | não |
| EP-46 | MEDIA-01.ordering | 01-04 (test/media.test.ts) | explicit; truth integral no PLAN | não |
| EP-47 | MEDIA-01.idempotency | 01-04 (test/media.test.ts) | explicit; truth integral no PLAN | não |
| EP-48 | MEDIA-01.concurrency | 01-04 (test/media.test.ts) | explicit; truth integral no PLAN | não |
| EP-49 | MEDIA-02.boundary | 01-04 (test/media.test.ts) | explicit; truth integral no PLAN | não |
| EP-50 | MEDIA-02.precision | 01-04 (test/media.test.ts) | explicit; truth integral no PLAN | não |
| EP-51 | MEDIA-02.idempotency | 01-04 (test/media.test.ts) | explicit; truth integral no PLAN | não |
| EP-52 | MEDIA-02.concurrency | 01-04 (test/media.test.ts) | explicit; truth integral no PLAN | não |
| EP-53 | MEDIA-03.boundary | 01-04 (test/recovery.test.ts) | explicit; truth integral no PLAN | não |
| EP-54 | MEDIA-03.precision | 01-04 (test/recovery.test.ts) | explicit; truth integral no PLAN | não |
| EP-55 | MEDIA-03.idempotency | 01-04 (test/recovery.test.ts) | explicit; truth integral no PLAN | não |
| EP-56 | MEDIA-03.concurrency | 01-04 (test/recovery.test.ts) | explicit; truth integral no PLAN | não |
| EP-57 | WEB-01.adjacency | 01-05 (test/http.test.ts) | explicit; truth integral no PLAN | não |
| EP-58 | WEB-01.empty | 01-05 (test/http.test.ts) | explicit; truth integral no PLAN | não |
| EP-59 | WEB-01.encoding | 01-05 (test/http.test.ts) | explicit; truth integral no PLAN | não |
| EP-60 | WEB-01.ordering | 01-05 (test/http.test.ts) | explicit; truth integral no PLAN | não |
| EP-61 | WEB-01.concurrency | 01-05 (test/http.test.ts) | explicit; truth integral no PLAN | não |

## UI Coverage —45 pares preservados

E1 login; E2 cabeçalho/navegação; E3 conexão/cobertura; E4 QR; E5 conversas; E6 leitor/evidência/histórico/citação; E7 anexos/controles. Os8 critérios deduplicados do plano01-05 preservam todos elementos/estados da seção UI Considerations. Evidência HTTP cobre DTO/estados; browser real cobre DOM/layout/foco. Contrato não é prova visual.

| Criterion (must_haves plan05) | Pairs originais | Task/evidence |
|---|---|---|
| UI-empty | E1.empty, E3.empty, E4.empty, E5.empty, E6.empty, E7.empty | 01-05-01; 01-05-02 quando autorização/conteúdo; browser sintético + http/security |
| UI-loading | E1.loading, E2.loading, E3.loading, E4.loading, E5.loading, E6.loading, E7.loading | 01-05-01; 01-05-02 quando autorização/conteúdo; browser sintético + http/security |
| UI-error | E1.error, E2.error, E3.error, E4.error, E5.error, E6.error, E7.error | 01-05-01; 01-05-02 quando autorização/conteúdo; browser sintético + http/security |
| UI-partial | E1.partial, E3.partial, E5.partial, E6.partial | 01-05-01; 01-05-02 quando autorização/conteúdo; browser sintético + http/security |
| UI-long-text | E1.long-text, E2.long-text, E3.long-text, E4.long-text, E5.long-text, E6.long-text, E7.long-text | 01-05-01; 01-05-02 quando autorização/conteúdo; browser sintético + http/security |
| UI-overflow | E2.overflow, E3.overflow, E4.overflow, E5.overflow, E6.overflow, E7.overflow | 01-05-01; 01-05-02 quando autorização/conteúdo; browser sintético + http/security |
| UI-populated | E3.populated, E4.populated, E5.populated, E6.populated, E7.populated | 01-05-01; 01-05-02 quando autorização/conteúdo; browser sintético + http/security |
| UI-zero-one-many | E3.zero-one-many, E5.zero-one-many, E6.zero-one-many | 01-05-01; 01-05-02 quando autorização/conteúdo; browser sintético + http/security |

Soma dos pares6+7+7+4+7+6+5+3=45; nenhuma superfície perdida. Outros contratos visuais/tokens/copy/datas/a11y/responsividade constam na action e human-check de01-05-01.

## Prohibition recall — fallback --auto

Para cada um dos15 requisitos foram examinadas dez derivações adversariais: C1 mutação remota/atividade em nome do dono, C2 inferência de inexistência/completude, C3 bypass de acesso restrito, C4 perda/supressão silenciosa, C5 inferência de identidade, C6 escopo SaaS/novos clientes, C7 execução privilegiada de dados, C8 partilha/segredos públicos, C9 atalhos de autenticação/caminhos e C10 custos/IA hospedada sem necessidade.150 candidatos agrupados por equivalência; precisão mantém3 valores de produto, sem auto-dismiss de edge/assunção.
C4/C5 são correctness/retention já com critérios explícitos de D-10/D-16/EP; C6/C10 são exclusões normativas já respeitadas. C7/C8/C9 foram encaminhados à segurança canônica OWASP ASVS5 (breadcrumb de canon-referral), não duplicados como proibições próprias.
C1/C2/C3 são mantidos por projectProhibitions de probe-core.cjs e projetados descriptor-less em must_haves.prohibitions do plano07, status unresolved/verification judgment. Disposição downstream deve ser flagged-unverified/human_needed até revisão explícita; nenhum check_kind/check_target/check_rule ou fixture inventados. A autorização --auto não converte ausência de prova em pass.

## Hooks e limites

Contribuições ativas into=planner foram lidas literalmente e aplicadas na ordem: API coverage→assumption-delta→schema-gate→security→TDD. assumption-delta scan1 retornou detected:false, não há promoção de entidade; schema-gate ORM não se aplica a SQLite direto, mas migrations/integrity reais constam no tracer/arquivo. Segurança usa ASVS5 nível1/high e threats únicos T-1-01..16; T-1-SC é reservado por plano.
Não há sistema de IA nesta fase. Não foi feita implementação, instalação, build de produto, acesso VPS, pareamento ou download real. Nenhum requisito concluído. Provas reais pendentes permanecem explícitas no plano07.

