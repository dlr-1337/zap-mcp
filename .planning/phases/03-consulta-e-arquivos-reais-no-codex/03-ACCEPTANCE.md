# Phase 3 — Aceite local no Codex

Rodada final **real**, encerrada com exit0 em **2026-10-12T17:13:27.794Z**. O roteiro executa o Codex instalado, registra requests/respostas HTTPS e eventos `mcp_tool_call` atuais e compara campos com SQLite somente leitura, HTTP autenticado do site e bytes do disco. Fixtures e JSON antigo não autorizam um novo aceite. Os cinco requisitos MCP continuam Pending até revisão/verificação independentes.

## Ambiente e casos reais

| Evidência | Resultado observado |
|---|---|
| Cliente/runtime/SDK | Codex CLI 0.162.1, Node 24.21.0, server 2.3.1/node 2.1.1 |
| Protocolo efetivamente negociado | initialize2025-06-18, client codex-mcp-client |
| Canal MCP/originais | HTTPS nativo localhost, cadeia e hostname verificados; Codex sem confiar na CA foi recusado antes de initialize |
| Fonte | Clone restaurado de conta vinculada,8792 mensagens; coletor desligado, pairing indisponível |
| find_conversations |1 chamada real; candidato canônico conferido com SQL e site |
| search_messages |3 páginas consecutivas,4+5+4=13 mensagens de um recorte de128; termo/conversa/dias inclusivos AND e ICU/UTC/offset conferidos |
| get_context |6 chamadas: âncora da busca, antes/depois e3 âncoras adicionais;20 referências distintas conferidas com SQL/site |
| Proveniência real adicional |1 citação recebida,1 âncora com revisão edit e1 âncora sem instante original; janelas contêm2 revisões edit |
| Campos | IDs, autoria/direção, origens/PN-LID, citações, revisões/fingerprints/datas, anexos/estados e unknowns iguais aos oráculos |
| Envelope de consulta | Maior HTTP/SSE observado 32587 bytes; orçamento servidor 32768 bytes, **sem inferir teto do Codex** |
| Configuração | TOML global preservado byte a byte; overrides somente nos subprocessos, sem registro de endpoint encerrado |
| Encerramento | Bearer atual recusado após revogação, token temporário removido e listeners encerrados; credenciais/config/sessões web do clone restauradas |

O caso de citação preservou identificadores recebidos e texto desconhecido; a edição escolhida não possuía instante original conhecido. O roteiro preservou esses nulls, sem inventar texto citado, versão original ou data. Os casos são amostras do recebido:13 resultados não representam a busca inteira,20 referências não representam a conta inteira. Inserção/edição entre páginas, histórico textual, calendário DST, restrições e concorrência têm controles sintéticos separados.

## Originais realmente recuperados

| Caso sanitizado | Bytes no destino | SHA-256 do disco e do destino | Entrega |
|---|---:|---|---|
| Original pequeno |4200|`<SHA-256 conferido privadamente>`|Ferramenta retornou inline; original salvo por GET explícito autenticado |
| Original maior |271485|`<SHA-256 conferido privadamente>`|download_required; GET explícito autenticado |

São arquivos novos no diretório privado da rodada, com tamanho/SHA e corpo HTTP iguais ao original lido independentemente. O helper foi executado pelo Codex, usa bearer pelo ambiente, origem HTTPS fixa e não segue redirecionamento. Metadata/URL/arquivo parcial não contam como entrega.256 KiB é a política inline do servidor para imagem suportada; não medimos um limite geral do cliente nem renderização visual ou gravação automática de inline.

## Recibos e repetição

```sh
mise exec node@24.21.0 -- npm run build
mise exec node@24.21.0 -- node --test dist/test/mcp-acceptance.test.js
mise exec node@24.21.0 -- node scripts/phase3-acceptance.mjs --mode self-test
# Caminho externo,privado e deliberadamente preparado; nenhum segredo em argumentos.
export ZAP_MCP_REAL_CASE_FILE=/caminho/privado/case.json
mise exec node@24.21.0 -- node scripts/phase3-acceptance.mjs --mode real-codex
```

O caso externo contém `synthetic:false`, `dataDir`, `smallId`, `largeId`, `keyFile`, `certFile`, `caFile` e `destination`. Todos os caminhos devem ficar fora do checkout; sessão/dados/chave/token/recibos são privados. O clone tem `restored.json` offlineOnly e manifest vinculado à identidade pública do perfil. O executável é o Codex nativo instalado via mise; nenhuma fixture ou cliente SDK substitui essa execução.

Cada rodada cria diretório novo 0700, arquivos 0600, `selected.json`, transcripts por chamada, `evidence.json` com requests/resultados e `receipt.json` sanitizado. `latest-integrated.json` fica junto ao caso externo e aponta a rodada atual; a anterior GREEN às 17:02:05Z foi preservada. A auditoria exige contexto de execução em memória, processo/calls/protocolo atuais e arquivos novos conferidos; desserializar a evidência inteira não recria esse contexto. Ausência de acesso real é exit não zero, nunca skip.

## Ajustes e limites observados

- Muitos lotes tornavam impossível até um candidato: a menor resposta real requeria232809 bytes. RED com600 lotes reproduziu a recusa. `queryCoverage` conserva contagens/intervalo/lastIngestion/historyStatuses e agrega estados dos lotes em `batchSummary`, com aviso explícito dos detalhes no `/api/status` autenticado. A soma foi conferida por SQL e pelo site; nenhum DTO de mensagem ou orçamento foi alterado.
- Roteiros encadeados excederam o orçamento existente de240s por processo. Alguns requests HTTP haviam concluído, mas não houve encerramento completo do Codex, portanto não receberam recibo. O roteiro final conduz chamadas curtas em processos reais; cursores continuam vinculados ao mesmo bearer/snapshot.
- Login do site em TLS nativo com Origin HTTPS retornou 403. O oráculo usa HTTP somente em loopback no mesmo serviço offline; MCP e originais permanecem em HTTPS verificado. Revisar Origin/canal/proxy do site na fase 4, sem inferir comportamento de produção.
- Fonte/coletor/sessão WhatsApp originais não foram alterados, pareados ou usados como segundo coletor. Isso não revalida a conexão atual da fonte, implantação VPS, supervisão, backup externo recorrente ou restore operacional final.

## Controles de privacidade e cobertura

O recibo público usa whitelist de versões, protocolo, booleans, contagens, limites e SHA. Casos/IDs/nomes/textos/arquivos/transcripts/config/chaves ficam externos ao Git. Os controles conhecidos inválidos abrangem replay, fake/SDK, fonte sintética, protocolo/TLS/calls/oráculos ausentes, destino antigo/ausente/parcial/corrupto e sentinelas privadas. Registro detalhado das oito tarefas, cinco requisitos, vinte decisões e ameaças em [03-VALIDATION.md](03-VALIDATION.md).

As três proibições descriptor-less de03-04 e os probes MCP-01/02/03/05 continuam **flagged-unverified** para revisão. Testes de produto são evidência, não descriptors inventados ou veredito final.

Histórico preservado em [03-01-SUMMARY.md](03-01-SUMMARY.md): tracer inicial, auditoria de pins/transitivas, controles de consumo e regressão154/154. O ajuste de fixture `c772a24` manteve as assertions e processou timers expirados com uma volta de setImmediate após seed síncrono; nenhum retry/timeout de teste foi introduzido. A rodada integrada acima é evidência posterior sobre a implementação completa.

## Regularização final e cleanup do tracer

A GoalMVP foi normalizada pela operação proprietária gsd-phase --edit3--force, preservando número/status/requisitos/critérios/dependências e o mesmo escopo de milestone; owneruser-story.validatetrue. As3proibições de03-04 agora são test/resolved com enforcementEvidence dos testes nomeados executados independentemente1/1; histórico flagged anterior preservado emhistory/03-VERIFICATION.iter1.md. Isso não inventa classificação dos probes unclassified, nem aprovação humana.

O tracer posterior deixara credencial no clone offline; correção RED99988d5→GREENe6040da e controles6/6,cliente real1/1/TLS/originais e cleanupauthnull/HTTP401/0chaves/0arquivos constam de03-TRACER-CLEANUP.md/.json. Suiteindependenteatual190/190,exit0normal,zero fail/cancel/skip/todo. O recibo integrado12calls permanece preservado. Essas evidências substituem afirmações anteriores de cleanup aplicadas incorretamente ao estado do último tracer; a pendência real foi corrigida sem apagar seu histórico. VPS/HTTPSsite/operaçãofase4 continuam pendentes.
