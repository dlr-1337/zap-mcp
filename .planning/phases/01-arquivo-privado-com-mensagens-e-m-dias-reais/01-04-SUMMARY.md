---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
plan: "04"
subsystem: media
tags: [baileys, streaming, sqlite, sha256, recovery, ssrf, tdd]
requires:
  - phase: "01-03"
    provides: Coletor privado com auth transacional, gerações e trava exclusiva
provides:
  - Originais de quatro formatos preservados por stream com tamanho/hash e acesso autenticado offline
  - Fila durável com leases, concorrência2, tentativas5, backoff e recuperação após SIGKILL
  - Reserva de espaço, pausa ENOSPC e preservação de mensagens/finais/órfãos
affects: ["01-05", "01-06", "01-07", phase-2, phase-3, phase-4]
tech-stack:
  added: []
  patterns: [pipeline com flush, publicação exclusiva hardlink, descriptor privado, dispatcher HTTPS com DNS fixado, reconcile antes do coletor]
key-files:
  created: [src/media.ts, test/media.test.ts, test/recovery.test.ts, .planning/WINDOWS.md]
  modified: [src/archive.ts, src/whatsapp.ts, src/main.ts, test/archive.test.ts]
key-decisions:
  - "Originais usam nomes internos UUID e publicação hardlink/unlink exclusiva; descriptor de integridade é persistido antes da publicação e available vem depois de fsync."
  - "Baileys rc14 exige dispatcher privado para DNS/redirect/cancelamento e fallback explícito para Boom404/410; nenhum downloader recebe caminho do HTTP."
  - "Downloads interrompidos recomeçam inteiros; máximo2 streams,5 tentativas,120s e reserva max(256MiB,5% filesystem), sem expurgo automático."
requirements-completed: []
requirements-supported: [MEDIA-01, MEDIA-02, MEDIA-03, SYNC-02, SYNC-03, EVID-01, PRIV-02, PRIV-03, WEB-01]
coverage:
  - id: D1
    description: Quatro originais, integridade de origem/local, restrições e HTTP autenticado offline
    verification:
      - kind: integration
        ref: test/media.test.ts + test/archive.test.ts + test/readonly.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Recuperação de jobs/parciais/finais e proteção por reserva/ENOSPC
    verification:
      - kind: integration
        ref: test/recovery.test.ts#crash após job/part/publicação/beforeAvailable recupera sem apagar acervo
        status: pass
      - kind: integration
        ref: test/recovery.test.ts#reserva no limiar e ENOSPC pausam sem alterar originais anteriores
        status: pass
    human_judgment: false
  - id: D3
    description: Disponibilidade e compatibilidade dos quatro originais na conta real
    verification: []
    human_judgment: true
    rationale: Coleta real permanece bloqueada até snapshot/restore01-06 e piloto01-07; fixtures e ciphertext sintético não comprovam a conta.
actuals:
  tokens: 17701
  tasks: 2
  commits: 4
duration: 14min
completed: 2026-10-10
status: complete
implementation_history:
  scope: "histórico local privado anterior à publicação sanitizada"
  plan_head_before: f8ea09201f1fb61c8080e4c556b1a5e8b4ebb7e3
  plan_head_after: bbbf8239939f306aec80bd5b381f4bd4a045d0f7
---

# Phase 1 Plan 4: Originais verificados e recuperação sem perda Summary

**Quatro tipos de original passam por stream, SHA256, contagem exata e publicação privada; crashes e falta de espaço preservam o acervo.**

## Performance

- Started: 2026-10-10T21:31:00Z; completed: 2026-10-10T21:45:20Z.
- Tasks: 2; source/test files: 7.
- Actuals: 70801 caracteres do diff realizado /4, arredondado para cima; quatro commits medidos entre os HEADs acima, anteriores aos commits de documentação.

## Accomplishments

- Schema5 aditivo preserva IDs/referências; attachment/job elegível nasce na transação da mensagem. Miniatura isolada, visualização única, citação e descriptor legado sem original não acionam download. Nome e legenda recebidos permanecem como evidência.
- Pipeline com backpressure, temporário exclusivo0600, SHA256 plaintext, fileLength inteiro/Long sem arredondamento, hash da origem quando recebido, flush/close, descriptor/manifesto privado e publicação sem sobrescrita. Hash local sem hash de origem é declarado por sourceHashVerified=false. Vazio só passa com comprimento zero explícito.
- GET/HEAD/Range consultam exclusivamente final local por UUID, exigem sessão antes do lookup e enviam attachment/octet-stream, nome seguro, nosniff/no-store. Cada acesso verifica tamanho/hash pelo mesmo descriptor aberto; nenhuma leitura inicia socket ou download remoto.
- Worker aguarda online sem consumir tentativas; concorrência2, timeout120s, cinco tentativas por versão e espera exponencial com teto60s. Geração/lease e stop rejeitam stream tardio. Startup revalida/adota finais íntegros após publicação sem commit, torna ausência/corrupção explícita e reinicia parciais integralmente, conservando bytes anteriores/órfãos desconhecidos.
- Reserva efetiva max(256MiB,5% do filesystem), inteiros bigint e contabilidade dos streams em voo; ENOSPC ou reserva baixa abortam/pausam com diagnóstico seguro. Sem apagar para liberar espaço. No host de testes /tmp medido em12440096768 bytes, reserva5%=622004838 bytes; fixtures de limiar usam medição injetada e não enchem o disco.

## Task Commits

| Task | RED | GREEN |
|------|-----|-------|
| 01-04-01 — originais/integridade | 4fa2773 | e6da00e |
| 01-04-02 — recovery/espaço | 8ff2ca0 | bbbf823 |

## Verification

- Runtime: mise exec node@24.21.0; build TypeScript passou.
- Comandos dos dois verify executados pelos alvos: media/archive/readonly inicialmente11/11; recovery/media/archive inicialmente15/15. Após expandir as asserções, união media/recovery/archive/readonly passou21/21 em2035ms, exit0, sem skipped/cancelled/todo.
- Suíte completa: mise exec node@24.21.0 -- npm test,49/49,9253ms, exit0. Feedback por arquivo dentro de60s; teste dos quatro SIGKILLs1855ms na suíte completa.
- Fonte/pin: API instalada em node_modules/@whiskeysockets/baileys/lib/Utils/messages{,-media}.js conferida com documentação Context7. Teste usa AES-CBC/ciphertext sintético para executar downloadMediaMessage real, conferir plaintext e fallback404, com fetch determinístico e sem conta.
- SSRF: HTTPS/host/porta/credencial restritos, DNS IPv4 público validado e endereço fixado na conexão; redirects repetem dispatcher, destino interno recusado antes de resolver/conectar. Host/CDN real e conta não foram usados como prova.
- Crash points: job commit, temporário parcial, final publicado e antes available; subprocessos encerrados com SIGKILL, restauração/reconcile repetidos mantêm contagem/hash/id e dois jobs. SQL abort no commit available, falta/corrupção local, lease alterada, cancelamento e stream tardio também cobertos.
- EP-45..56: formatos/bytes, limite n-1/n/n+1, hash divergente/ausente, Long inválido, conteúdo vazio, idempotência de fila/final, orçamento4/5/6, offline, reserva no limiar/um byte abaixo, ENOSPC e recuperação estão ligados aos alvos media/recovery. COVERAGE continua sendo mapa de planejamento; nenhum requisito v1 aceito por fixtures.
- Diff sem whitespace errors, sem dependência nova, envio/read receipt, segredo real ou exclusão de arquivo rastreado. Apenas milestone.lock desconhecido preexistente foi deixado intacto.

## TDD Gate Compliance

- RED01: thumbnail-only falhou na asserção pending versus unavailable após ingestão; registro01-04-media-red.json, veredito RED_EVIDENCE_OK e inspeção semântica confirmada antes de GREEN.
- RED02: final confirmado foi corrompido em fixture privada e serviço reaberto; asserção available versus retry_wait falhou. Registro01-04-recovery-red.json, RED_EVIDENCE_OK e inspeção semântica confirmada antes de GREEN.
- Ordem no Git: test→feat por tarefa; sem refactor separado necessário. Assertions executadas, sem erro de import/setup como evidência RED.

## Deviations from Plan

1. **[Rule2 — publicação segura]** rename do Node pode sobrescrever o final existente. Hardlink exclusivo seguido de unlink do temporário e fsync fornece publicação atômica sem substituir binário. Conhecido final danificado é preservado em nome interno antes da retomada. Arquivo src/media.ts; commits e6da00e/bbbf823; crashes/hashes conferidos.
2. **[Rule1 — comportamento da versão instalada]** getHttpStream do rc14 descarta signal e pipe não encaminha erro tardio; reupload helper verifica error.status enquanto fetch lança Boom.output.statusCode. Dispatcher HTTPS privado fixa DNS/cancela transporte, termina com segurança o ciphertext interrompido e aborta plaintext; fallback404/410 preserva descriptor/restrições e atualiza somente locators. Arquivos src/media.ts/src/whatsapp.ts; commit bbbf823; adapter plaintext/404, destinos/redirects e streams tardios testados. Nenhuma troca de biblioteca.
3. **[Rule3 — teste impactado]** migração aditiva atualiza user_version4→5. Assert existente de versão em test/archive.test.ts foi ajustado mantendo as verificações de UUID/texto/referência. Commit e6da00e; teste passou.

Desvios registrados em WINDOWS.md e marcados fixed; nenhum defeito aberto desta execução. Sem authentication gate.

## Limits and Next Plan Readiness

- Não houve pareamento, captura ou download da conta; os quatro exemplos reais, CDN efetivo e funcionamento da sessão exigem piloto01-07 após snapshot/restore01-06. Coleta real e --collect continuam falhando fechados.
- IPv4 público é o transporte permitido inicial; IPv6/DNS especial são recusados. Reserva/concorrência são limites iniciais medidos e não promessa de capacidade da VPS.
- Temporários/parciais/órfãos não são expurgados automaticamente. HTTP confirma hash por stream de leitura com buffer limitado; custo de hash para arquivos grandes ainda não foi medido na VPS.
- UI de estados/link disponível pertence ao próximo01-05; preview completo, exportação e MCP ficam nas fases seguintes. Nenhum novo painel/framework/config preventivo.
- Requirements continuam Pending, conforme AGENTS e evidência real exigida. Pronto para01-05;01-05 não executado por este agente.

## Self-Check: PASSED

src/media.ts, test/media.test.ts e test/recovery.test.ts encontrados. Quatro commits acima são ancestrais do HEAD; evaluation-scope01-04 resolveu os quatro commits nesta branch. Suíte49/49 e alvos21/21 conferidos; nenhuma exclusão rastreada.

Nota de publicação: contagens/janelas de commits e verificações de ancestralidade acima foram medidas no histórico local de implementação, preservado no checkout original. A publicação usa snapshot sanitizado para manter dados de conversa fora do histórico público; IDs de commits históricos são referências locais, não commits desta branch publicada.
