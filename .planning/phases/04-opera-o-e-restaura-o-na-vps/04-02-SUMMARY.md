---
phase: 04-opera-o-e-restaura-o-na-vps
plan: "02"
subsystem: transport
tags: [https, proxy, csrf, session, mcp, tdd]
requires:
  - phase: 04-01
    provides: inventário com dependências externas explícitas; contrato local independente
provides:
  - origem HTTPS canônica compartilhada por web, CSRF, cookies e MCP
  - confiança no peer exato, validação antes de parsing/sessões e modo loopback preservado
  - TLS/proxy sintético com login, original, ZIP, Range e revogação executados
affects: [04-05, 04-06]
tech-stack:
  added: []
  patterns: [canonical origin, exact proxy peer, authenticate before parsing, consume-time authorization]
key-files:
  created: [src/transport.ts, test/transport.test.ts]
  modified: [src/main.ts, src/auth.ts, src/mcp.ts, .env.example]
key-decisions:
  - "Proxy exige origem HTTPS pura já normalizada e peers IP exatos; backend permanece privado em127.0.0.1."
  - "Proxy sobrescreve Host/Proto e remove Forwarded/demais X-Forwarded-*; confiança nunca depende de hops livres."
  - "Modo local preserva HTTP e TLS nativo; Secure acompanha TLS sem confiar em forwarding."
  - "WINDOWS13 corrigido localmente; login permanente e OPS continuam sem aceite neste plano."
requirements-completed: []
requirements-related: [OPS-01, OPS-04]
coverage:
  - id: D-02
    description: origem canônica, login Secure, CSRF e proxy TLS local
    verification:
      - kind: integration
        ref: test/transport.test.ts
        status: pass
    human_judgment: false
  - id: D-03
    description: owner preservado, autenticações independentes e revogação durante consumo
    verification:
      - kind: integration
        ref: test/transport.test.ts
        status: pass
      - kind: integration
        ref: test/mcp.test.ts
        status: pass
    human_judgment: false
  - id: D-16
    description: testes sintéticos comprovam engenharia, sem concluir OPS permanente
    verification:
      - kind: other
        ref: "Limites operacionais deste SUMMARY"
        status: pass
    human_judgment: false
actuals:
  tokens: 8513
  tasks: 2
  commits: 4
plan_head_before: f53f346a45d9cfebf665fae2ce6dd80e3be088a5
plan_head_after: ef58a36d78131f611a85ac3a203ee4ccd64e9239
duration: 10min
completed: 2026-10-13
status: complete
---

# Phase 4 Plan 2: Origem HTTPS privada compartilhada Summary

**Login Secure, CSRF exato, URLs MCP HTTPS e streams revogáveis por proxy TLS com origem fixa e peer aprovado, mantendo HTTP/TLS loopback.**

## Performance

- Execução registrada entre2026-10-13T00:35:43Z e2026-10-13T00:45:43Z; preparação/contexto anterior não cronometrados.
- Duas tarefas, seis arquivos de implementação/testes/configuração.
- Quatro commits RED/GREEN medidos pelo ledger antes da documentação. Tokens = ceil(chars/4) do diff realizado desses arquivos; sem tokens do harness.

## Accomplishments

- `TransportConfig` local/proxy validado antes de abrir o perfil. Origem HTTPS canônica sem userinfo, barra final, path, query, fragment ou normalização implícita; peers IP exatos sem CIDR, aliases ou duplicados normalizados.
- Guard antes de MCP/parsers/sessões: socket peer, Host incluindo porta canônica, Proto HTTPS único e Origin exato quando presente. Host/Origin/Authorization/Cookie/Proto duplicados e Forwarded/demais X-Forwarded-* recusados. Trust function só aceita peer aprovado no hop0.
- CLI consome `ZAP_PUBLIC_ORIGIN`/`ZAP_TRUSTED_PROXY_PEERS`; ausência de ambos mantém loopback. Config incompleta/inválida recusa sem criar auth.sqlite. Nenhum bind externo, TLS desligado, coletor habilitado ou nova dependência.
- SQLiteStore, scrypt, owner-generation, regeneração/salvamento de sessão e bearer independente preservados. Secure no set/clear por proxy e TLS nativo; CSRF usa origem comum. Login não altera owner existente.
- MCP recebe a mesma origem para negociação/URLs, autentica antes de parsing e revalida cada write/end. Download GET/HEAD/Range reutiliza fd/stream verificado, preservando original após revogação.

## Task Commits

| Tarefa | RED | GREEN | Resultado |
|---|---|---|---|
| 04-02-01 — login/original por HTTPS | a56b589 | cf0b4c6 | proxy TLS, Secure, original íntegro, guard e CLI fail-closed |
| 04-02-02 — MCP/revogação/exportação | fc2d3d0 | ef58a36 | origem MCP HTTPS, Range, ZIP, logout, stream revogado e TLS nativo |

## Verification

- Build Node24.21.0 passou.
- Tarefa1/tracer: build + transporte/auth15/15; o caminho end-to-end foi repetido antes da expansão.
- Foco final transporte/MCP/auth:53/53, zero fail/cancelled/skipped/todo,12,44s.
- Transporte final isolado:8/8,4,72s.
- Suíte completa única:205/205, zero fail/cancelled/skipped/todo,72,15s; inclui regressões de browser herdadas.
- TLS real terminado no proxy e backend HTTP loopback: challenge/login200, cookie Secure, original200 com bytes/SHA iguais, API/mídia/QR/status/export401 sem web cookie e MCP401 sem bearer próprio.
- Host/Proto/Origin/peer incorretos e duplicados recusam403 antes de criar sessão/CSRF; CA falsa e hostname divergente falham com TLS verificado.
- MCP initialize negociou2025-06-18; URL absoluta usa exatamente origem HTTPS validada. Origem ausente permitida ao bearer válido, origem divergente403, cookie web não autoriza MCP e bearer não autoriza web. Token rotacionado recusa401 preservando sessão web.
- Original/HEAD/Range206 do site e MCP conferidos; ZIP pronto contém original com bytes iguais. CSRF inválido/Origin divergente/ausente não cria job (SQL independente). Logout clearCookie Secure/expiração epoch, sessão antiga e idle expirado recusam401.
- Stream HTTPS8MiB interrompido durante rotação; transferência não completa, original permanece íntegro. Regressões herdadas cobrem rotação/restrição concorrentes e buffers antes de write/end.
- TLS nativo local executou login Secure e API200; HTTP loopback continua200 e forwarding em modo local403.
- `git diff --check` passou; nenhuma exclusão rastreada, TODO/FIXME/placeholder ou stub encontrado nos arquivos deste plano.

Evidência completa ignorada em `.planning/research/.cache/04-02-red-1.json`, `04-02-red-2.json`, `04-02-focal.log` e `04-02-full-suite.log`; diretório0700 e arquivos0600. Fixtures e chaves TLS são descartáveis, criadas em diretórios privados fora do checkout e removidas após cada teste. Nenhuma conversa ou credencial real foi usada.

## TDD Gate Compliance

| Tarefa | Assertion planejada executada | RED semântico | Gate |
|---|---|---|---|
| 04-02-01 | challenge HTTPS200 | guard antigo retornou403; sem import/fixture/sintaxe | RED_EVIDENCE_OK |
| 04-02-02 | MCP com Origin canônica200 | adapter antigo calculou HTTP e retornou403; guard comum passou | RED_EVIDENCE_OK |

Relatórios TAP integrais preservam comandos e status reais. Ambos REDs foram classificados e commitados antes do GREEN correspondente. REFACTOR separado não necessário. Ajustes de tipagem na construção inicial da fixture foram corrigidos antes de capturar RED; falha de build não foi usada como evidência.

## Decisions Made

- TLS/Origin compartilham um contrato explícito; o proxy precisa limpar cabeçalhos extras e não pode usar cadeia de confiança arbitrária.
- Reaproveitamento da sessão e do stream existentes, sem OAuth, alteração de tools/schemas, UI ou pacotes.
- Listener em127.0.0.1 preservado. Topologia/bind para containers pertence ao plano operacional com infraestrutura inventariada.

## Deviations from Plan

Nenhuma alteração estrutural. `src/main.ts` faz a ligação do transporte ao adapter MCP, prevista nos key_links e no files_modified do plano. Sem novos serviços, dependências ou mutação remota.

Por divisão explícita do orquestrador, STATE/ROADMAP/REQUIREMENTS/WINDOWS são atualizados pelo parent; este executor não altera arquivos compartilhados nem declara requisitos OPS completos.

## Limites operacionais e WINDOWS13

WINDOWS13 tem correção local comprovada para TLS nativo e proxy; a prova de login permanente no domínio ainda não foi executada. Identificação/preparação do painel remoto pelo parent não equivale a deploy, supervisão, transporte permanente, backup externo, restore ou aceite no Codex real. Esses fatos permanecem nos planos04-05/06.

Nenhuma senha/identidade, sessão WhatsApp, dados reais, processo coletor ou TOML do Codex foi alterado. Testes sintéticos não validam cobertura integral da conta. OPS-01 e OPS-04 continuam Pending neste plano.

## Next Phase Readiness

Contrato de transporte local pronto para integrar à topologia real do proxy. Aplicar as variáveis consumidas, limpar cabeçalhos conforme contrato e validar o fluxo no endpoint permanente antes de concluir OPS.

## Self-Check: PASSED

Arquivos novos e SUMMARY existem. Commits a56b589, cf0b4c6, fc2d3d0 e ef58a36 são ancestrais de HEAD. Ledger mede quatro commits e diff dos seis arquivos; árvore tinha somente este SUMMARY intencional antes da documentação. Verificações passaram sem skips/todo.
