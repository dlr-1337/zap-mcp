---
status: complete
phase: 04-opera-o-e-restaura-o-na-vps
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md, 04-06-SUMMARY.md]
started: 2026-10-14T03:40:31.338826+00:00
updated: 2026-10-14T03:40:31.916Z
mode: autonomous
human_confirmation_claimed: false
flagged_prohibitions: 3
---

# UAT da fase 4

Registro da execução autônoma autorizada. Resultados técnicos vêm de efeitos/testes observados; não são respostas presumidas do usuário. Três proibições seguem flagged e não autoritativas, com revisão humana recomendada, conforme a regra que não bloqueia uma execução AFK.

## Current Test

[testing complete]

## Tests

### 1. Reinício do serviço e resposta primária
expected: Serviço reiniciado com dados persistentes preservados e HTTPS autenticado funcional.
result: pass
source: automated
evidence: 04-ACCEPTANCE.md; restart real da mesma execução

### 2. inventário executável privado, separado de aceite VPS
expected: inventário executável privado, separado de aceite VPS
result: pass
source: automated
evidence: 04-01-SUMMARY.md / D-01

### 3. cálculo de capacidade corrente, fila ZIP, cinco conjuntos, bytes/inodes e reserva
expected: cálculo de capacidade corrente, fila ZIP, cinco conjuntos, bytes/inodes e reserva
result: pass
source: automated
evidence: 04-01-SUMMARY.md / D-07

### 4. bloqueio explícito por destino ou chave independente não comprovados
expected: bloqueio explícito por destino ou chave independente não comprovados
result: pass
source: automated
evidence: 04-01-SUMMARY.md / D-10

### 5. origem canônica, login Secure, CSRF e proxy TLS local
expected: origem canônica, login Secure, CSRF e proxy TLS local
result: pass
source: automated
evidence: 04-02-SUMMARY.md / D-02

### 6. owner preservado, autenticações independentes e revogação durante consumo
expected: owner preservado, autenticações independentes e revogação durante consumo
result: pass
source: automated
evidence: 04-02-SUMMARY.md / D-03

### 7. testes sintéticos comprovam engenharia, sem concluir OPS permanente
expected: testes sintéticos comprovam engenharia, sem concluir OPS permanente
result: pass
source: automated
evidence: 04-02-SUMMARY.md / D-16

### 8. shutdown limitado, idempotente e consulta disponível quando a coleta falha
expected: shutdown limitado, idempotente e consulta disponível quando a coleta falha
result: pass
source: automated
evidence: 04-03-SUMMARY.md / D-04

### 9. stop snapshot resume antes da transferência e recuperação de interrupções
expected: stop snapshot resume antes da transferência e recuperação de interrupções
result: pass
source: automated
evidence: 04-03-SUMMARY.md / D-09

### 10. restore offline e promoção com exclusividade e autorização autenticada
expected: restore offline e promoção com exclusividade e autorização autenticada
result: pass
source: automated
evidence: 04-03-SUMMARY.md / D-06-D-14

### 11. pull cifrado e imutável após retomada com preservação de último bom
expected: pull cifrado e imutável após retomada com preservação de último bom
result: pass
source: automated
evidence: 04-04-SUMMARY.md / D-09-D-11

### 12. status autenticado distingue tentativa, falha e idade real do snapshot
expected: status autenticado distingue tentativa, falha e idade real do snapshot
result: pass
source: automated
evidence: 04-04-SUMMARY.md / D-12

### 13. decrypt e restore offline com SQL/FK/schema/contagens/FTS e todos originais
expected: decrypt e restore offline com SQL/FK/schema/contagens/FTS e todos originais
result: pass
source: automated
evidence: 04-04-SUMMARY.md / D-13

### 14. release offline via HTTPS, update/falha/restart e persistência fora do código
expected: release offline via HTTPS, update/falha/restart e persistência fora do código
result: pass
source: automated
evidence: 04-05-SUMMARY.md / local-release-tracer

### 15. imagem oficial com SQLite FTS e container não root privado com controle limitado
expected: imagem oficial com SQLite FTS e container não root privado com controle limitado
result: pass
source: automated
evidence: 04-05-SUMMARY.md / docker-fixture

### 16. implantação, migração, agenda, backup externo e update no endpoint permanente
expected: implantação, migração, agenda, backup externo e update no endpoint permanente
result: pass
source: automated
evidence: 04-05-SUMMARY.md / real-operation-verified

### 17. gate real atual e negativos de falso aceite/replay/privacidade
expected: gate real atual e negativos de falso aceite/replay/privacidade
result: pass
source: automated
evidence: 04-06-SUMMARY.md / D1

### 18. restart e update permanentes com910 originais HTTPS e perfil preservados
expected: restart e update permanentes com910 originais HTTPS e perfil preservados
result: pass
source: automated
evidence: 04-06-SUMMARY.md / D2

### 19. cópia externa cifrada recuperada com chave independente e restore limpo integral
expected: cópia externa cifrada recuperada com chave independente e restore limpo integral
result: pass
source: automated
evidence: 04-06-SUMMARY.md / D3

### 20. Chrome com contato/termo/período/contexto/original/ZIP em ambos backends
expected: Chrome com contato/termo/período/contexto/original/ZIP em ambos backends
result: pass
source: automated
evidence: 04-06-SUMMARY.md / D4

### 21. Codex CLI instalado com negociação e oito calls por backend, dois originais cada
expected: Codex CLI instalado com negociação e oito calls por backend, dois originais cada
result: pass
source: automated
evidence: 04-06-SUMMARY.md / D5

### 22. clone removido, permanente/config/perfil/timer preservados e fallback protegido
expected: clone removido, permanente/config/perfil/timer preservados e fallback protegido
result: pass
source: automated
evidence: 04-06-SUMMARY.md / D6

### 23. Distinguir proposta e confirmação no caso real e restaurado
expected: Conclusão contextual com referências/trechos válidos e limites do recorte; primeira resposta restaurada errada deve permanecer registrada.
result: pass
source: automated
evidence: 04-SEMANTIC-ACCEPTANCE.md; SQL readonly e duas conferências privadas no Codex instalado

### 24. Revisão recomendada da proibição: Exposição em artefatos públicos
expected: Registrar controles específicos e manter flag sem certificar ausência global.
result: skipped
source: autonomous-disposition
evidence: 04-VERIFICATION.md; ADR-550 B-with-guard
reason: Revisão global humana recomendada, sem blocker técnico; execução autônoma autorizada conserva unverified-prohibition/flagged e julgamento LLM não autoritativo. Sentinelas/auditoria pública passaram; o histórico de ferramentas teve detalhes privados e não é declarado limpo. Não se afirma revisão ou confirmação humana.

### 25. Revisão recomendada da proibição: Autorização de coleta
expected: Registrar controles específicos e manter flag sem certificar ausência global.
result: skipped
source: autonomous-disposition
evidence: 04-VERIFICATION.md; ADR-550 B-with-guard
reason: Revisão global humana recomendada, sem blocker técnico; execução autônoma autorizada conserva unverified-prohibition/flagged e julgamento LLM não autoritativo. Fence, coletor único e negativos passaram; origem parada e clone offline demonstrados. Não se afirma revisão ou confirmação humana.

### 26. Revisão recomendada da proibição: Evidência sintética e replay
expected: Registrar controles específicos e manter flag sem certificar ausência global.
result: skipped
source: autonomous-disposition
evidence: 04-VERIFICATION.md; ADR-550 B-with-guard
reason: Revisão global humana recomendada, sem blocker técnico; execução autônoma autorizada conserva unverified-prohibition/flagged e julgamento LLM não autoritativo. 26 gates vivos, processo status0, clientes/arquivos/SQL e negativos demonstrados. Não se afirma revisão ou confirmação humana.

## Summary

total: 26
passed: 23
issues: 0
pending: 0
skipped: 3

## Gaps

Nenhuma lacuna técnica restante. A interpretação inicial restaurada falhou e foi corrigida em nova consulta privada de conferência sobre as mesmas mensagens já recebidas; não houve resume nem novo MCP. A evidência original e o limite de interpretação não autoritativa foram preservados.

## Limites

Complete with 3 flagged prohibitions: nenhuma revisão humana global foi inventada. Codex CLI comprovado; Desktop GUI, reboot integral e evento futuro das 03h não foram testados. Backup pull depende do notebook online. O acervo contém o recebido, não histórico integral.
