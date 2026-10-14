---
phase: 04-opera-o-e-restaura-o-na-vps
plan: "06"
subsystem: operational-acceptance
tags: [https, codex, offsite, restore, live-gates, tdd]
requires:
  - phase: 04-05
    provides: implantação real, origem fenced, backup externo e endpoint permanente
provides:
  - aceite real novo com26 gates vivos e unidade encerrada com status0
  - Chrome e Codex instalado no permanente e clone offline pelo mesmo HTTPS
  - restore integral atual e cleanup com perfil/config/timer preservados
  - fallback parado protegido da limpeza observada da plataforma
affects: [phase-04-verification, OPS-01, OPS-02, OPS-03, OPS-04]
tech-stack:
  added: []
  patterns: [WeakSet acceptance, independent SQL and bytes oracle, bounded offline backend swap, detached user unit]
key-files:
  created: [scripts/phase4-acceptance.mjs, test/operation-acceptance.test.ts, .planning/phases/04-opera-o-e-restaura-o-na-vps/04-ACCEPTANCE.md, .planning/phases/04-opera-o-e-restaura-o-na-vps/04-06-SUMMARY.md]
  modified: [.planning/phases/04-opera-o-e-restaura-o-na-vps/04-VALIDATION.md, ops/README.md]
key-decisions:
  - "Aceite depende dos26 probes atuais no processo vivo; nenhum receipt ou boolean desserializado cria gate."
  - "Codex permanente usa http_headers_helper privado; clone usa somente override no subprocesso e não troca o TOML permanente."
  - "Resultado do clone só é publicado após prontidão HTTPS autenticada do permanente restaurado;401 temporário continua obrigatório."
  - "Preservar candidatos/imagens próprios com labels da plataforma, mantendo regras globais e guards inalterados."
requirements-completed: []
requirements-related: [OPS-01, OPS-02, OPS-03, OPS-04]
coverage:
  - id: D1
    description: gate real atual e negativos de falso aceite/replay/privacidade
    verification:
      - kind: integration
        ref: test/operation-acceptance.test.ts
        status: pass
      - kind: other
        ref: scripts/phase4-acceptance.mjs runAcceptance atual com26 gates
        status: pass
    human_judgment: false
  - id: D2
    description: restart e update permanentes com910 originais HTTPS e perfil preservados
    verification:
      - kind: other
        ref: 04-ACCEPTANCE.md#evidências-atuais
        status: pass
    human_judgment: false
  - id: D3
    description: cópia externa cifrada recuperada com chave independente e restore limpo integral
    verification:
      - kind: other
        ref: 04-ACCEPTANCE.md#evidências-atuais
        status: pass
    human_judgment: false
  - id: D4
    description: Chrome com contato/termo/período/contexto/original/ZIP em ambos backends
    verification:
      - kind: automated_ui
        ref: 04-ACCEPTANCE.md#chrome-e-codex
        status: pass
    human_judgment: false
  - id: D5
    description: Codex CLI instalado com negociação e oito calls por backend, dois originais cada
    verification:
      - kind: e2e
        ref: scripts/phase4-acceptance.mjs probeInstalledCodex e recibo atual
        status: pass
    human_judgment: false
  - id: D6
    description: clone removido, permanente/config/perfil/timer preservados e fallback protegido
    verification:
      - kind: other
        ref: 04-ACCEPTANCE.md#cleanup-e-preservação
        status: pass
    human_judgment: false
actuals:
  tokens: 45269
  tasks: 2
  commits: 42
plan_head_before: f469d996380e9aaf649ea240987d88a6277441dc
plan_head_after: 5047cf14a68199fe39ce4661e660a1be926f710a
duration: 42min24.7s (aceite final); continuação total não consolidada
completed: 2026-10-13
status: complete
---

# Phase 4 Plan 6: Aceite real do permanente e restauração Summary

**Acervo real restaurado com910 originais, Chrome/Codex nos dois backends,26 gates atuais aprovados e cleanup/perfil/config/timer preservados; fase e requisitos aguardam verificação independente.**

## Performance

- Duas tarefas concluídas. Aceite final medido em2544,7s entre metadado de início da unidade privada e mtime do recibo final; a unidade terminou com status0. A execução anterior e a implementação continuada não têm duração total consolidada.
- Ledger reconstruído explicitamente a partir do pai do RED original, com autorização do orquestrador:42 commits entre as bases indicadas. A janela inclui correções operacionais integradas durante a continuação; não representa42 commits novos desta sessão. A commit de metadados deste SUMMARY fica fora dessa medição.
- Tokens=ceil(181074chars/4)=45269 sobre o diff realizado no mesmo intervalo, medido antes deste SUMMARY; não usa tokens do harness.
- Config existente autoriza commits na main. Nenhum pin/dependência, política global, tag ou memória foi alterado.

## Accomplishments

- Driver/testes exercitam positivo HTTPS/site/MCP/bytes/ZIP/backup/restore e negativos individuais de gate, replay, stale, synthetic, loopback, privacidade e configuração. Self-test não conclui OPS real.
- Nova execução operacional atravessou restart, backup externo atual, atualização entre releases distintos e conferência integral dos910 originais por HTTPS autenticado. Perfil/owner/sessão/arquivo permaneceram iguais.
- Cópia cifrada foi recuperada com identidade independente fora da VPS, decifrada e restaurada em destino limpo novo. SQL/FK/schema/linhas/IDs/referências/FTS e todos originais passaram; zero coletor no clone.
- Chrome permanente e restaurado encontraram um candidato e cinco resultados, abriram a âncora e baixaram original/ZIP novos. DOM confirmou filtros; SQL/disco independentes confirmaram140 mensagens,13 arquivos e3 faltantes por ZIP. Marker do clone correlacionou run/ready ativos e DONE ausente.
- Codex CLI0.162.1 negociou2025-06-18, oito calls por backend, três janelas limitadas de contexto e dois originais salvos por execução. Referência privada permanente e demais blocos do TOML preservados; override do clone ficou no subprocesso.
- Cleanup removeu o clone, retomou permanente único offline, preservou perfil e credencial/config permanente, recusou token temporário com401 e restaurou timer active/enabled. Helper privado verificou HTTPS/TLS/login/status offline/logout antes de publicar resultado; envelope temporário removido.
- Fallback anterior foi preservado parado com classificação de aplicação, mesma imagem/mounts/env/UID e guardas. Verificação readonly confirmou conjunto completo de mounts igual apesar da ordem distinta. Nenhuma regra global de limpeza mudou.
- Suíte atual315/315 em68,461s, sem fail/cancel/skip/todo. Validação técnica13/13 após o último aceite real; código clean, UI24/24 e18/18 mitigações ASVS1 anteriores complementam a prova.

## Task Commits

1. **04-06-01 — Driver e gate não vacuoso:** RED `b53c063`, GREEN `a7869d6`; correções integradas continuam no intervalo medido até a base final. Gate/TDD revisado5/5, sem violações registradas.
2. **04-06-02 — Aceite atual e preservação:** `5047cf1` — ACCEPTANCE/VALIDATION e instrução operacional sanitizadas após efeitos reais.

Histórico completo reproduzível por `git log f469d996380e9aaf649ea240987d88a6277441dc..5047cf14a68199fe39ce4661e660a1be926f710a`. Evidências integrais e scripts operacionais privados permanecem fora do Git.

## TDD Gate Compliance

RED original falhou na capacidade e GREEN implementou driver/testes; as duas commits são ancestrais atuais. Correções públicas posteriores tiveram registros RED/GREEN e revisão integrada. Esta continuação final alterou apenas documentação pública e harness privado operacional, sem comportamento público novo.315 testes integrados estão verdes; não há stub, TODO/FIXME, teste omitido ou verify substituído por fixture para concluir esta tarefa.

## Deviations from Plan

### Auto-fixed Issues

1. **[Rule3 — Execução operacional interrompida]** Um processo PTY anterior terminou por SIGTERM, com causa externa não determinada. Recovery nativo validou o backend anterior e todo o perfil; a nova execução usou unidade user systemd destacada com log privado e limites explícitos. Não houve prova reaproveitada.
2. **[Rule1 — Candidatos removidos pela plataforma]** Histórico privado readonly da limpeza confirmou remoção dos candidatos próprios e da imagem sem proteção. Builder privado passou a rotular somente nossas imagens/candidatos; imagem foi reconstruída e registrada, com smoke/UID/labels atuais conferidos. Fallback preservado depois do aceite. Regras globais inalteradas; orientação pública emops/README.md.
3. **[Rule1 — Resultado anterior publicado antes de HTTPS pronto]** Um ciclo falhou no gate de revogação logo após restaurar o permanente; três consultas posteriores retornaram401. O helper privado tinha publicado resultado sem aguardar HTTPS. Foi corrigido para login/status offline/logout com TLS verificado antes do resultado. Aceite novo exigiu novamente todos gates e passou; não se inventa o status transitório da falha anterior.
4. **[Rule3 — UI de extensão e carregamento de sessão]** Páginas de download ficaram bloqueadas pelo Chrome. Abas novas permitidas pelo controle documentado e sessão carregada antes do login resolveram o fluxo, sem contornar guard. Provas só foram gravadas após downloads/oráculos reais.
5. **[Rule1 — Assertion excessiva no fallback]** Recriação própria preservou tudo, mas a comparação de lista de mounts falhou por ordem. Inspeção readonly demonstrou igualdade do conjunto completo. Apenas a conferência foi corrigida; recriação não foi repetida e G não foi alterado.

## Threat Flags

| Flag | Arquivo | Descrição |
|---|---|---|
| threat_flag: ephemeral-owner-readiness-envelope | harness operacional privado fora do Git | Senha owner existente transmitida por stdin SSH a arquivo fixoUID/0600/nlink1 somente durante a chamada bounded; autenticou HTTPS, fez logout e foi removida no finally. Sem token permanente na VPS, nova concessão ou alteração de auth do app. |

## Privacy and Remaining Boundaries

Auditoria dos artefatos públicos não encontrou valores privados, credenciais, fontes ou hashes pessoais. O histórico das ferramentas teve diagnósticos indevidos de UI/transporte, sem credencial; esse histórico não é declarado inteiramente isento. Observações seguintes foram reduzidas a booleans/contagens.

Não foi demonstrada negociação na GUI do Codex Desktop, reboot completo da VPS ou futuro evento das03h. O próximo backup depende do notebook ligado/conectado; Persistent e atraso continuam explícitos. `edgeProbes` estáticos continuamunresolved e não indicam ausência de risco. Verificador/UAT decidem requisitos/fase; origem preservada permanece fenced e G único offline aguarda retomada coordenada pelo orquestrador.

## Next Phase Readiness

Aceite operacional e documentos estão prontos para verificador independente, UAT/lifecycle e publicação pelo orquestrador. OPS-01–04 permanecem Pending. Handoff privado contém config/recibos/Chrome/oráculos/cliente/cleanup/fallback e instrução nativa para retomar somente G após verificação; nenhum segredo está neste SUMMARY.

## Self-Check: PASSED

Driver, teste, ACCEPTANCE, VALIDATION, orientação operacional e este SUMMARY existem. RED/GREEN e5047cf1 são ancestrais de HEAD; ledger mede42 commits com bases explícitas. Artefatos públicos foram auditados; diff sem whitespace/deleções inesperadas. O recibo real aceitou26/26 no processo atual, a unidade terminou0, o resultado Root confirmou cleanup/perfil, o timer foi restaurado e o fallback foi observado. Fase/requisitos continuam pendentes do verificador.
