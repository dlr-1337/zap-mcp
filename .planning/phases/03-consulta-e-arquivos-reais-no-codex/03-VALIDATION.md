---
phase: "03"
slug: "consulta-e-arquivos-reais-no-codex"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-12"
---

# Phase 3 — Validation Strategy

Contrato de verificação derivado de 03-RESEARCH.md. Planejamento e fixtures não concluem requisitos MCP; cliente e arquivos reais exigem provas adicionais.

## Test Infrastructure

| Propriedade | Valor |
|---|---|
| Framework | node:test e node:assert existentes, Node24.21.0 por mise |
| Configuração | package.json e tsconfig.json existentes |
| Build | `mise exec node@24.21.0 -- npm run build` |
| Quick proposto | `mise exec node@24.21.0 -- node --test dist/test/mcp.test.js` após criação/build |
| Suíte completa | `mise exec node@24.21.0 -- npm test` |
| Duração | Medir na execução; ainda não comprovada |

## Sampling Rate

- Após cada tarefa: build e teste específico da capacidade alterada, com exit não zero ou ausência de casos executados constituindo falha.
- Após cada wave: suíte integrada completa; falha bloqueia expansão.
- Antes do verificador: suíte verde e recibos do Codex real; cliente SDK isolado não substitui o Codex.
- Meta de retorno rápido: até30s para testes focados; medir e registrar sem declarar meta alcançada por documento.

## Per-Task Verification Map

Quatro planos em quatro waves; oito tarefas. Arquivos compartilhados e gate do tracer real obrigam sequência. Nenhum teste de implementação foi executado pelo planejamento.

| Task ID | Plan | Wave | Requirement | Comportamento e risco | Tipo | Automated Command | Threat Ref | File Exists | Estado |
|---|---|---|---|---|---|---|---|---|---|
| 03-01-01 | 03-01 | 1 | MCP-01/04/05 | Bearer/Host/Origin, TLS validado, negociação no Codex, pequeno e grande no destino | HTTP/TLS + real client | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp.test.js`; `ZAP_MCP_REAL_MODE=tracer mise exec node@24.21.0 -- node --test dist/test/mcp.test.js` | T-03-01/03/04/SC | Wave0 criado no início da tarefa | Pendente |
| 03-01-02 | 03-01 | 1 | MCP-01/04/05 | Rotação/restart, restrição e token no consumo, corrupção/cancelamento/read-only | Integration | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp.test.js dist/test/readonly.test.js dist/test/auth.test.js dist/test/media.test.js` | T-03-02/03/04 | MCP criado em 03-01-01; demais existentes | Pendente |
| 03-02-01 | 03-02 | 2 | MCP-02/05 | Homônimos/PN-LID, AND/calendário/null/unknowns, filtros/cobertura | Integration | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp.test.js dist/test/search.test.js` | T-03-06 | Depende de 03-01 | Pendente |
| 03-02-02 | 03-02 | 2 | MCP-02/05 | Freeze/cursor/tampering/TTL/generation, DTO excessivo, budget e requests paralelos | Integration | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp.test.js dist/test/search.test.js dist/test/context.test.js` | T-03-05/06/07 | Depende de 03-01 | Pendente |
| 03-03-01 | 03-03 | 3 | MCP-03 | Âncora/vizinhas/citações/revisões/instantes e paridade site/MCP | Integration | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp.test.js dist/test/context.test.js dist/test/search.test.js` | T-03-10 | Depende de 03-02 | Pendente |
| 03-03-02 | 03-03 | 3 | MCP-03/05 | Restrição após buffer, conteúdo adversarial, allowlist efetiva e ausência de socket | Security/contract | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp.test.js dist/test/readonly.test.js dist/test/security.test.js dist/test/context.test.js` | T-03-08/09 | Depende de 03-02 | Pendente |
| 03-04-01 | 03-04 | 4 | MCP-01/02/03/04/05 | Fluxo Codex real atual, oráculo independente, destino/bytes, rejeição de recibo falso | Integration + real client | `mise exec node@24.21.0 -- npm run build && mise exec node@24.21.0 -- node --test dist/test/mcp-acceptance.test.js && mise exec node@24.21.0 -- node scripts/phase3-acceptance.mjs --mode self-test`; `mise exec node@24.21.0 -- node scripts/phase3-acceptance.mjs --mode real-codex` | T-03-11/12 | Criado RED no início da tarefa | Pendente |
| 03-04-02 | 03-04 | 4 | MCP-01/02/03/04/05 | Ledger/recibos sanitizados, configuração preservada, suíte e limites honestos | Regression + receipt | `mise exec node@24.21.0 -- npm test`; `mise exec node@24.21.0 -- node scripts/phase3-acceptance.mjs --mode self-test` | T-03-11/12 | Depende de 03-04-01 | Pendente |

Todos comandos assumem a raiz do checkout/worktree e Node24. Cada PLAN liga imediatamente `<fails_when>` ao comando. Exit não zero, zero testes ou recibo/arquivo/protocolo/canal ausente é falha. Casos reais obrigatórios recusam ausência em vez de skip; fixtures não cumprem MCP.

Gate antes de wave2: 03-01-01 passa no Codex instalado por TLS confiado, com controle TLS negativo, negociação observada e dois originais/hash no destino. Plain loopback, URL ou SDK client isolado não habilitam expansão.

## Wave 0 Requirements

- [ ] 03-01-01 cria RED test/mcp.test.ts e fixtures HTTP/TLS/SQLite privadas antes de código; dependência de todos testes MCP.
- [ ] 03-01-01 cria harness real Codex/canal TLS e recibo privado conferido no destino antes de qualquer expansão.
- [ ] 03-04-01 cria RED test/mcp-acceptance.test.ts antes do roteiro, incluindo controles conhecidos inválidos e um positivo.
- [x] Mapeamento de oito tarefas, waves, cinco requisitos, ameaças e comandos concretos pelos planos.

Nenhum framework adicional de testes é necessário. Comando que referencia artefato futuro depende explicitamente de sua criação/build.

## Verificações no cliente real

Agente executa autonomamente os acessos disponíveis. Participação do proprietário só por acesso concreto indispensável.

| Comportamento | Requisito | Evidência exigida |
|---|---|---|
| Conectar Codex instalado ao endpoint protegido | MCP-01 | Versão, protocolo observado, TLS com cadeia/hostname validados e controle negativo, credencial válida/recusada sem segredo |
| Consultar conversa/contexto reais | MCP-02/03 | Campos comparados com site/SQL independente, filtros/cobertura e continuação |
| Recuperar original pequeno e caminho para maior | MCP-04 | Artefato no destino, tamanho/SHA iguais ao original; URL/listagem não conta |
| Somente leitura sob mensagem adversarial | MCP-05 | Ferramentas fechadas e nenhum envio/alteração/socket chamado |

## Validation Sign-Off

- [ ] Todas as tarefas têm verificação automatizada ou dependência Wave0.
- [ ] Nenhuma sequência de três tarefas sem feedback automatizado.
- [ ] Wave0 cobre referências inicialmente ausentes; sem watch-mode.
- [ ] Duração dos testes focados registrada.
- [ ] Recibos reais sanitizados e suíte integrada verde.
- [ ] nyquist_compliant:true somente após auditoria, com evidência.

**Approval:** pending — estratégia de planejamento, não aceite realizado.

## Probes e cobertura do planejamento

- GOAL/REQ/RESEARCH/CONTEXT: auditoria completa em 03-04-PLAN.md; MCP-01 a MCP-05 e D-01 a D-20 atribuídos a tarefas. COVERAGE.md registra o subconjunto somente leitura e opt-outs explícitos.
- Edge probe: cinco itens preservados. MCP-04 concurrency tem critério explícito de interrupção/restrição/rotação e grants concorrentes; MCP-01/02/03/05 continuam unclassified/unresolved como flagged assumptions para o verificador, sem descarte ou reclassificação inventados.
- Três proibições específicas foram projetadas por projectProhibitions em 03-04 must_haves.prohibitions, descriptor-less/unresolved, portanto flagged-unverified. Testes de produto planejados não são uma prova executada nem descriptors fabricados.
- Até concluir execução/auditoria real, status draft, nyquist_compliant:false e wave_0_complete:false permanecem corretos.
