---
gsd_state_version: "1.0"
current_phase: 4
current_phase_name: Operação e restauração na VPS
current_plan: 5
status: executing
stopped_at: 04-05-02 executing: migration/HTTPS originals/offsite/restart verified; real update in progress
last_updated: "2026-10-13T15:26:39.438Z"
last_activity: 2026-10-13
last_activity_desc: Real migration, all 895 HTTPS originals, external backup recovery and service restart verified; release update executing
state_head: 083366e667c543558ebb32750ff879bcd975fab7
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 23
  completed_plans: 21
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-12)

**Core value:** Recuperar uma conversa e seus anexos com contexto verificável, pelo site ou pelas IAs, a partir de um arquivo privado sob controle do usuário.
**Current focus:** Phase 4 — Operação e restauração na VPS

**Publicação da Phase1:** [PR #1](https://github.com/dlr-1337/zap-mcp/pull/1), branch codex/phase-1-private-archive; fase local verificada, sem implantação na VPS.

## Current Position

Phase: 4 (Operação e restauração na VPS) — VERIFICAÇÃO OPERACIONAL EM ANDAMENTO
Current Plan: 5
Total Plans in Phase: 6
Status: Executing
Last activity: 2026-10-13 — Migração real, 895 originais via HTTPS, recuperação externa e reinício do serviço conferidos; atualização real em execução

Progress: [████████░░] 75% — 3/4 fases; 21/23 planos concluídos. 04-05 tem uma de duas tarefas concluída; a tarefa real continua em execução. Migração, promoção, nova senha somente no destino, 895 originais autenticados via HTTPS e primeira cópia externa recuperada passaram. O reinício do serviço exigiu uma retentativa automática, concluída com dados preservados; não houve reboot completo da VPS. A atualização real está em execução após novo backup externo verificado. A preparação local isolada de04-06 avançou, mas cliente permanente, clone por HTTPS e aceite OPS continuam pendentes de04-05 e dos probes reais.

## Performance Metrics

**Velocity:**
- Total plans completed: 21
- Average duration: Não consolidada; plano07 teve piloto continuado
- Total execution time:71min registrados nos planos01–06, além do piloto continuado01–07

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 7 | - | - |
| 2 | 6 | - | - |
| 03 | 4 | - | - |
| 4 | 4 | 65min | 16min15s |

**Recent Trend:**
- Last 5 plans:01-03,01-04,01-05,01-06,01-07
- Trend: Piloto real concluído, sem nova medição global

**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 12min | 3 tasks | 10 files |
| Phase 01 P02 | 10min | 2 tasks | 6 files |
| Phase 01 P03 | 8min | 2 tasks | 5 files |
| Phase 01 P04 | 14min | 2 tasks | 7 files |
| Phase 01 P05 | 12min | 2 tasks | 7 files |
| Phase 01 P06 | 15min | 2 tasks | 8 files |
| Phase 02 P01 | 14min | 3 tasks | 10 files |
| Phase 02 P02 | 16min | 3 tasks | 10 files |
| Phase 02 P03 | 12min | 3 tasks | 9 files |
| Phase 02 P04 | 17min | 3 tasks | 9 files |
| Phase 02 P05 | 18min | 3 tasks | 4 files |
| Phase 02 P06 | 26min30s | 3 tasks | 3 files |
| Phase 03 P01 | 27min | 2 tasks | 10 files |
| Phase 03 P02 | 36min | 2 tasks | 8 files |
| Phase 03 P03 | 10min | 2 tasks | 5 files |
| Phase 03 P04 | 72min | 2 tasks | 11 files |
| Phase 04 P01 | 6min | 2 tasks | 3 files |
| Phase 04 P02 | 10min | 2 tasks | 6 files |
| Phase 04 P03 | 30min | 3 tasks | 8 files |
| Phase 04 P04 | 19min | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisões completas em PROJECT.md, seção Key Decisions.

- Quatro capacidades em modo mvp/coarse, modelo herdado e avanço automático; fases/requisitos pendentes. Nyquist, TDD, pesquisa antes das perguntas e worktrees habilitados; sem tags automáticas.
- Dispositivo vinculado por QR sem navegador; uma conta, um proprietário, um coletor e nenhuma escrita/confirmação de leitura no WhatsApp.
- Captura de bytes começa junto da ingestão na Phase 1; acervo, proveniência e faltantes permanecem consultáveis offline.
- Privacidade desde a primeira exposição e snapshot recuperável antes do piloto; backup contínuo fora da VPS e restore têm responsabilidade final na Phase 4.
- Cliente obrigatório: Codex do usuário, bearer revogável e arquivo conferido por bytes/hash; Baileys fixado prerelease e SDK MCP v2 pesquisados exigem revalidação/compatibilidade real.
- [Phase 01]: Node24.21.0 isolado via mise exec; Node global26 inalterado, todos comandos de produto exigem runtime24.
- [Phase 01]: Plano01-01 comprovado por nove testes HTTP/SQLite e QA browser sintético; requisitos v1 permanecem pendentes até integrações e conta real.
- [Phase 01]: Plano01-02 usa recibos sanitizados e transações síncronas; revisões sem relógio são conflito explícito e status de lote nunca comprova cobertura integral.
- [Phase 01]: Plano01-03 usa ownership Linux boot/PID/starttime, auth transacional dez categorias e isolamento de credenciais por geração;34 testes sintéticos passam e coleta real permanece bloqueada até snapshot/restore01-06.
- [Phase 01]: Plano01-04 preserva originais por stream com hash e publicação exclusiva; fila2/5/120s, reserva max(256MiB,5%), recoverySIGKILL/ENOSPC conferidos por49 testes sintéticos; conta real continua pendente.
- [Phase 01]: Plano01-05 mantém UI nativa50/100 e QR efêmero; respostas tardias e páginas restauradas exigem sessão atual.52 testes e QA browser320/768/1280 sintéticos; conta real continua pendente.
- [Phase 01]: Plano01-06 usa snapshot offline exclusivo por API SQLite, restore HTTP autenticado e recibo HMAC do perfil/diretório fonte; clone restaurado bloqueia coletor. Preflight somente leitura e60 testes padrão passam; conta/VPS pendentes.
- [Phase 01]: Piloto pré-QR demonstrou428 com macOS Desktop; WEB_BROWSER Chrome emite QR real no mesmo perfil/pin, preservando syncFullHistory. Requisitos continuam Pending.
- [Phase 01]: Piloto real ligado: DNS IPv4 Node24 e participant do envelope rc14 corrigidos com RED/GREEN; lote recebido sem falhas,4originais com hash/HTTP/restore/restart conferidos. Comparação Web autorizada substitui a condição manual; plano07 com3/3 tarefas, fase1 local concluída após controles e verificador.
- [Phase 02]: Busca usa FTS por revisão e snapshots sanitizados de sessão; período Temporal respeita DST, mantendo requisitos globais pendentes do aceite real.
- [Phase 02]: Contexto reutiliza snapshots existentes; abas conservam DOM e posições próprios com geração por sessão/aba e purge TTL/logout/reset;105 testes sintéticos passaram, aceite real segue02-05.
- [Phase 02]: Preview usa fd verificado, assinatura/MIME e controls nativos sob ação; 113 testes sintéticos passaram, codecs reais permanecem02-05.
- [Phase 02]: Exportação congela DTOs e expected media por sessão; ZIP pronto só após releitura CRC/SHA/conjunto, fsync e publicação exclusiva;127 testes sintéticos passaram, aceite real segue02-05.
- [Phase 02]: Aceite real offline/browser conferiu 1.028 mensagens,190originais e112faltantes por SQL/bytes independentes; fonte local atualizada preservando 8.771mensagens/853originais e credenciais, sem confirmar conexão original atual.
- [Phase 02]: Phase2 local:40/40criteria,8/8requirements,7/7prohibitions;143tests and real1028-message ZIP accepted; next Phase3 MCP.
- [Phase 02]: G-02-6: abas sticky e foco da âncora pelo início, sem novo estado de leitura; UAT autônoma física delta0. — Alcançar controles não pode substituir a posição salva; fonte200 e mensagens altas exigem início alcançável; provas reais sanitizadas.
- [Phase 03]: Codex0.162.1 negociou2025-06-18 e salvou dois originais reais por GET privado TLS com tamanhos/SHA iguais; CA somente no subprocesso e config preservada.
- [Phase 03]: MCP independente do site: digest e geracao atomicos, gates de consumo write/end e rotacao local sem segundo coletor;154/154 testes passam em TMPDIR privado/home.
- [Phase 03]: MCP consultas usam Archive/snapshots e candidatos Map privado;32KiB é orçamento do servidor,32671bytes medidos,no máximo cliente;164/164tests,tracer1/1.
- [Phase 03]: Contexto MCP reusa Archive, origem searchCursor autenticada e ancora obrigatoria no budget;172/172 testes e tracerCodex1/1.
- [Phase 03]: Cobertura MCP agrega explicitamente lotes em batchSummary preservando contagens/intervalos/estados; envelope32KiB e DTOs inalterados, conferidos porSQL/site.
- [Phase 03]: Aceite Codex0.162.1/protocolo2025-06-18 completou12calls atuais e dois originais4200/271485bytes SHAiguais; gate emWeakSet impede JSONreplay.
- [Phase 03]: Oraculo siteHTTP apenasloopback no clone; MCP/originaisHTTPSverificado. Login siteTLS OriginHTTPS403 pendente emfase4/WINDOWS13.
- [Phase 03]: Fase 3 local concluída: verificador passed21/21, MCP-01 a MCP-05 satisfeitos, 190/190 testes; 12 chamadas no Codex0.162.1 e dois originais com tamanho/SHA iguais.
- [Phase 03]: Endpoint MCP de aceite transitório: HTTPS verificado, CA e configuração somente no subprocesso; zero chaves MCP/tokens residuais e acervo, sessão, autenticação web e TOML preservados.
- [Phase 03]: Próxima ação é discutir a fase 4; VPS permanente, HTTPS/login web Origin403, backup externo e restauração operacional seguem pendentes. Ponteiros antigos para tarefas das fases 1/2 são históricos, já concluídos.
- [Phase 03]: UAT autônoma da fase 3 passou 12/12 cenários, zero issues/bloqueadores; dez entregas auto-covered e prova nova Codex/TLS/dois originais/cleanup1/1. Predicate uat-passed exige e confirma verification passed; confirmação humana não presumida.
- [Phase 03]: Fase 3 publicada no PR #3: https://github.com/dlr-1337/zap-mcp/pull/3; branch codex/phase-3-codex-mcp sobre main. Réplica sanitizada preserva67commits reais e fonte/testes/pins; CI remoto em acompanhamento, sem implantação na VPS.
- [Phase 03]: CI do PR #3 e do push89d94ec concluído190/190 no Ubuntu/Node24.21.0, zero fail/cancelled/skipped/todo. Correção test-only do preflight de cleanup isolou Codex pessoal; produto/driver/pins/workflow não mudaram. Fase4 continua não iniciada.
- [Phase 03]: PR #3 integrado por merge commit905028a; CI da main38314994967 aprovado. Checkout main sincronizado, histórico original protegido no backup local; código de execução/pins/serviço/dados privados preservados. Próxima capacidade permanece fase4.
- [Phase 04]: Plan04-04 implementa pull cifrado com age e ACK apos restore; teste PN/LID corrigido por reserva proporcional, suite padrao239/239. Backup externo e OPS seguem pendentes da implantacao real.
- [Phase 04]: 04-05-01 pronto: suite244/244 e Docker nao root/helper restrito conferidos. 04-05-02 aguarda SSH autorizado, configs privadas e backup externo real; fonte intacta e fase06 nao iniciada.
- [Phase 04]: Predeployment review converged clean30files; six findings fixed. Final source ad9942b:257/257 standard tests, rebuilt nonroot Docker image Node24/FTS imports passed. Real05-02 and06 remain pending SSH confirmation and operational evidence.

### Pending Todos

Nenhum todo avulso registrado. Próxima ação: executar02-02;02-01 concluído com97/97 testes, sem aplicar busca no acervo real.

### Blockers/Concerns

Nenhum impedimento para iniciar o planejamento.

- Phase1 concluída: Baileys/chaves/identidades/eventos, QR, comparaçãoWeb e restore/restart verificados; histórico permanece limitado ao recebido. Crash do auxiliar sem causa exata determinada; download Chrome normal passou.
- Phase 4: Identificar VPS/domínio/disco/proxy e destino/chave do backup; restore isolado não inicia segundo coletor e validade da sessão é separada.
- Plano01-07 concluído: comparação autônoma com Web,244 projeções recuperadas, restore8.684/828 e retomada sem QR; 15 requisitos concluídos pelo phase.complete após verificadorpassed. Crash do browser auxiliar de causa exata desconhecida; Chrome normal baixou áudio com hash igual.
- Phase 4: resolver HTTPS/proxy/login web (Origin403/WINDOWS13) e revalidar consulta/download no endpoint permanente; piloto MCP local temporário encerrado.
- 04-05-02: acesso operacional restrito e permanente funcionando; concessão temporária de root revogada. Runtime nativo, proxy/HTTPS/login e backup externo pré-migração com restauração verificados. Fonte finalmente fenced/parada; transferência final, restore, promoção assinada e recuperação de senha somente no destino concluídos. Backend único offline responde HTTPS200; conferência dos895originais pelo endpoint está em andamento. Backup da VPS, restart/update, agenda e aceite final continuam pendentes; nenhum OPS concluído.

### Roadmap Evolution

- Phase 2 edited: Normalized only Goal to the already-derived MVP user story; scope and criteria identical.
- Phase 3 edited: edited fields: goal (normalização MVP; mesma história de usuário dos PLANs)

## Deferred Items

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| Cliente | Claude e eventual autenticação específica | v2 | 2026-10-10 | v1 |
| Importação | Importador apenas se o piloto demonstrar lacuna essencial | v2 | 2026-10-10 | v1 |

- [Phase 04]: Migração real em andamento: CI remoto aprovado no commit3d4ad72; runtime/dependências nativas verificados na VPS. SSH usa conexão compartilhada privada e host fixado; inventário filtra processos por UID antes de ler argumentos. Auth SQLite real maior que256KiB aceita após validar privacidade. Backup externo pré-migração recuperado/restaurado; chave independente permanece fora da VPS.
- [Phase 04]: Proprietário informou não possuir a senha antiga. Novo segredo privado preparado exclusivamente para o site de destino, a ser aplicado após restore/promoção com target quieto e comparação do restante do perfil. Senha da fonte, sessão WhatsApp e acervo preservados.

## Session Continuity

Last session: 2026-10-13T02:53:01.342Z
Stopped at: 04-05-02 executing: real profile migrated/promoted; permanent HTTPS originals verification in progress
Resume file: .planning/phases/04-opera-o-e-restaura-o-na-vps/04-05-SUMMARY.md

- [Phase 01] Override explícito: comparação manual no celular dispensada em favor do WhatsApp Web. Nenhuma intervenção humana pendente; dados/segredos continuam privados.

- Encerramento2026-10-11: verificador88/88,15 requisitos,28 testes focados; fonte conectada e cópia privada8.684/828 restaurada. Nenhuma intervenção do usuário pendente.

- [Phase 04]: Transferência real1793arquivos concluída. Promoção remota continuou após deadline SSH e comprometeu nativamente; MAC/fence/quiet atuais foram validados antes da continuação, sem repetir promoção. Novo segredo aplicado somente ao owner do destino. Helper de boot instalado atomicamente com job/MainPID/ancestry guards; CI remoto c899187 aprovado, suite292/292. HTTPS startup502 transitório confirmado depois por200/backend único offline; ajuste bounded do probe em execução. Nenhum OPS concluído.
