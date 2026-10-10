---
phase: "1"
slug: "arquivo-privado-com-mensagens-e-m-dias-reais"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-10"
---

# Phase 1 — Validation Strategy

Contrato de verificação da fase. Comandos são propostos para a Wave 0; ainda não existe código/test runner de produto e nada foi executado. O planejador deve ligar os IDs de tarefas e ameaças à matriz antes da execução.

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | node:test nativo do Node 24 alvo |
| Config file | tsconfig.json — criar na Wave 0 com build de src/test |
| Quick run command | `npm run build && node --test dist/test/auth.test.js dist/test/archive.test.js` |
| Full suite command | `npm test` — build seguido de `node --test dist/test/*.test.js` |
| Estimated runtime | Não medido; objetivo de feedback por arquivo menor que 30s |

## Sampling Rate

- Por tarefa: build e arquivo de teste afetado; por mudança comum, conjunto quick.
- Por wave: suíte completa e inspeção de vazamentos nos artefatos/diff.
- Antes da verificação da fase: suíte verde e evidências de UI/piloto separadas.
- Sem watch mode; não afirmar tempo de execução antes de medir.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---|---|---|---|---|---|---|---|---|---|
| Pendente de plano | A ligar | A ligar | PRIV-01 | A ligar | Login/logout revoga sessão sem parar coletor | integration | `npm run build && node --test dist/test/auth.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | PRIV-02 | A ligar | Negar QR/status/IDs/media inclusive HEAD/Range sem sessão | integration | `npm run build && node --test dist/test/http.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | PRIV-03 | A ligar | DTO/log seguro; conteúdo hostil sem execução | integration | `npm run build && node --test dist/test/security.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | SYNC-01 | A ligar | QR vigente e estados sem browser no coletor | integration | `npm run build && node --test dist/test/collector.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | SYNC-02 | A ligar | FULL e todos os itens dos lotes recebidos | integration | `npm run build && node --test dist/test/archive.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | SYNC-03 | A ligar | Entrada/saída e grupos recebidos; zero escrita remota | integration | `npm run build && node --test dist/test/readonly.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | SYNC-04 | A ligar | 10 categorias persistidas; reinício e segundo coletor recusado | integration | `npm run build && node --test dist/test/auth-state.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | SYNC-05 | A ligar | Replay/out-of-order/PN-LID/homônimos sem falso merge | integration | `npm run build && node --test dist/test/archive.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | SYNC-06 | A ligar | Alterações preservadas; visualização única barrada | integration | `npm run build && node --test dist/test/revisions.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | SYNC-07 | A ligar | Lotes e cobertura separados; ausência qualificada | integration | `npm run build && node --test dist/test/coverage.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | EVID-01 | A ligar | Chave/autor/instante/tipo/citação sem campos inventados | integration | `npm run build && node --test dist/test/archive.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | MEDIA-01 | A ligar | Originais dos quatro tipos; job junto da ingestão | integration | `npm run build && node --test dist/test/media.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | MEDIA-02 | A ligar | Hash/tamanho/finalização; parcial nunca disponível | integration | `npm run build && node --test dist/test/media.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | MEDIA-03 | A ligar | Retries/concorrência/crash/ENOSPC sem perda | integration | `npm run build && node --test dist/test/recovery.test.js` | Não — Wave 0 | pending |
| Pendente de plano | A ligar | A ligar | WEB-01 | A ligar | Leitura e download privados offline e limitados | integration | `npm run build && node --test dist/test/http.test.js` | Não — Wave 0 | pending |

## Wave 0 Requirements

- [ ] Runtime Node24 verificado e package/lock/tsconfig com build de testes ESM.
- [ ] Smoke real de import Baileys, SQLite/transação/FTS5 e geração QR sem conectar conta.
- [ ] Fixtures sintéticas de chaves/identidade/Long/buffers/FULL/notify/append/revisões/desconhecidos/temporárias/viewOnce.
- [ ] Fault injection de stream/SQL/ENOSPC e subprocessos encerrados em pontos críticos, sem encher disco pessoal.
- [ ] HTTP local fake e UI nativa testáveis sem WhatsApp.
- [ ] Backup/restore offline com contagens/hash e coletor desligado por padrão antes de QR real.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|---|---|---|---|
| Pareamento e cobertura conhecida | SYNC-01/02/03/07 | Celular e conta real; fixture não comprova entrega | Backup conferido, ler QR, comparar lote/conversa conhecida, grupo e ambas as direções |
| Sessão remota válida após reinício | SYNC-04/05 | Exige sessão vinculada real | Reiniciar único coletor e conferir retomada sem QR indevido/duplicatas |
| Quatro originais reais offline | MEDIA-01/02/03, WEB-01 | Só fonte comprova disponibilidade | Comparar tamanho/hash de exemplos reais acessíveis; desligar coletor e reabrir |
| Layout/teclado/estados | WEB-01, PRIV-01/02/03 | Interação visual precisa browser real | Verificar login, QR, lista, leitor, erro/vazio, foco, responsividade e texto hostil com dados sintéticos |

Evidências reais ficam no ambiente privado. Publicar somente status, contagens/limites seguros e referências ao procedimento. Ausência de VPS/acesso/QR/amostra mantém aceite pendente; não iniciar segundo coletor para restore e não enviar mensagens pelo Zap MCP.

## Validation Sign-Off

- [ ] Cada tarefa ligada a verificação automática ou dependência Wave 0.
- [ ] Nenhuma sequência de três tarefas sem feedback automatizado.
- [ ] Todas as referências de teste criadas antes de usadas.
- [ ] Sem watch-mode.
- [ ] Latência medida.
- [ ] nyquist_compliant só após auditoria efetiva.

**Approval:** pending — estratégia proposta, nenhuma validação de produto executada.
