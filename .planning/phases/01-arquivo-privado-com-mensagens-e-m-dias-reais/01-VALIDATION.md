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
| 01-01-01 | 01-01 | 1 | PRIV-01, PRIV-02, PRIV-03, WEB-01 | T-1-01, T-1-02, T-1-SC | HTTP real recusa acesso sem cookie; login grava sessão e abre mensagem da transação SQL; reinício mantém texto/referência. O caminho pode ser aberto no navegador local. Pacotes/lock têm proveniência conferida sem dados reais. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/tracer.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-01-02 | 01-01 | 1 | PRIV-01, PRIV-02, PRIV-03, WEB-01 | T-1-01, T-1-02, T-1-SC | D-01..D-04 têm senha local, logout separado e reset no host; acessos antigos são recusados e registros do acervo permanecem idênticos. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/auth.test.js dist/test/tracer.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-01-03 | 01-01 | 1 | PRIV-01, PRIV-02, PRIV-03, WEB-01 | T-1-01, T-1-02, T-1-SC | Login/lista/leitor/volta/logout operam com SQL e sem coletor; sem seleção e acervo vazio mostram copy explícita; HTML hostil aparece como texto. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/http.test.js dist/test/auth.test.js dist/test/tracer.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-02-01 | 01-02 | 2 | SYNC-02, SYNC-03, SYNC-05, SYNC-06, SYNC-07, EVID-01, PRIV-03, WEB-01 | T-1-03, T-1-04, T-1-SC | FULL/notify/append preservam cada origem; alias legítimo conserva IDs e homônimos ficam distintos; revisões/revogação não perdem histórico permitido e viewOnce não é recuperável. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/archive.test.js dist/test/revisions.test.js dist/test/tracer.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-02-02 | 01-02 | 2 | SYNC-02, SYNC-03, SYNC-05, SYNC-06, SYNC-07, EVID-01, PRIV-03, WEB-01 | T-1-03, T-1-04, T-1-SC | Contagens recebidas/confirmadas/falhas são conferíveis e não confundidas com conta inteira; consulta limitada conserva ordenação e desconhecidos. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/coverage.test.js dist/test/archive.test.js dist/test/revisions.test.js dist/test/http.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-03-01 | 01-03 | 3 | SYNC-01, SYNC-03, SYNC-04, SYNC-05, PRIV-02, PRIV-03, WEB-01 | T-1-05, T-1-06, T-1-07, T-1-SC | Persistência genérica das dez categorias/creds é atômica; exclusividade vale antes do socket; QR privado/fake é atual e perfil real permanece bloqueado até prova de backup. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/auth-state.test.js dist/test/collector.test.js dist/test/archive.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-03-02 | 01-03 | 3 | SYNC-01, SYNC-03, SYNC-04, SYNC-05, PRIV-02, PRIV-03, WEB-01 | T-1-05, T-1-06, T-1-07, T-1-SC | Uma sessão válida preserva estado; erros são classificados e retries cessam; consultas offline operam e nenhuma superfície dispara escrita/read receipt. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/collector.test.js dist/test/readonly.test.js dist/test/auth-state.test.js dist/test/http.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-04-01 | 01-04 | 4 | MEDIA-01, MEDIA-02, MEDIA-03, SYNC-02, SYNC-03, EVID-01, PRIV-02, PRIV-03, WEB-01 | T-1-08, T-1-09, T-1-SC | Quatro fixtures originais têm bytes/hash conferíveis e acesso autenticado offline; todos os outros estados mantêm mensagem e motivo, sem segredo. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/media.test.js dist/test/archive.test.js dist/test/readonly.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-04-02 | 01-04 | 4 | MEDIA-01, MEDIA-02, MEDIA-03, SYNC-02, SYNC-03, EVID-01, PRIV-02, PRIV-03, WEB-01 | T-1-08, T-1-09, T-1-SC | Restart e reconcile repetidos conservam referências e originais íntegros; falhas e pausa por espaço são explícitas; máximo2 downloads/5 tentativas e offline não gasta orçamento. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/recovery.test.js dist/test/media.test.js dist/test/archive.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-05-01 | 01-05 | 5 | WEB-01, PRIV-01, PRIV-02, PRIV-03, SYNC-01, SYNC-06, SYNC-07, EVID-01, MEDIA-02, MEDIA-03 | T-1-10, T-1-11, T-1-12, T-1-SC | Todos os45 pares E1..E7 e estados reais de conexão/mídia têm copy/superfície; evidência não truncada e navegação usa uma conversa e janelas limitadas. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/http.test.js dist/test/coverage.test.js dist/test/media.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-05-02 | 01-05 | 5 | WEB-01, PRIV-01, PRIV-02, PRIV-03, SYNC-01, SYNC-06, SYNC-07, EVID-01, MEDIA-02, MEDIA-03 | T-1-10, T-1-11, T-1-12, T-1-SC | Autorização uniforme cobre dados/QR/IDs/HEAD/Range; arquivos ativos não executam e logs/DTOs não carregam segredos; reset/logout revogam pedidos novos. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/security.test.js dist/test/http.test.js dist/test/auth.test.js dist/test/readonly.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-06-01 | 01-06 | 6 | PRIV-02, PRIV-03, SYNC-04, MEDIA-02, MEDIA-03, WEB-01 | T-1-13, T-1-14, T-1-SC | Snapshot fechado+manifest recupera auth/acervo/binários em outro diretório limpo e abre somente consulta privada; falhas nunca rotulam cópia incompleta como concluída. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/backup.test.js dist/test/auth-state.test.js dist/test/media.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-06-02 | 01-06 | 6 | PRIV-02, PRIV-03, SYNC-04, MEDIA-02, MEDIA-03, WEB-01 | T-1-13, T-1-14, T-1-SC | Gate pré-piloto é verificável por código/teste e prova real de snapshot/restore privado; cópia e instruções estão prontas para celular sem exposição externa. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/backup.test.js dist/test/recovery.test.js dist/test/collector.test.js dist/test/http.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-07-01 | 01-07 | 7 | PRIV-01, PRIV-02, PRIV-03, SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, SYNC-06, SYNC-07, EVID-01, MEDIA-01, MEDIA-02, MEDIA-03, WEB-01 | T-1-15, T-1-16, T-1-SC | Preparação/cópia/restore/exclusividade conferidos e proprietário leu QR vigente; conexão real observada sem segredo público. | real pilot + preflight | `npm --prefix . run build && node dist/src/main.js preflight` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-07-02 | 01-07 | 7 | PRIV-01, PRIV-02, PRIV-03, SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, SYNC-06, SYNC-07, EVID-01, MEDIA-01, MEDIA-02, MEDIA-03, WEB-01 | T-1-15, T-1-16, T-1-SC | Comparação privada registra material esperado/recebido/faltante e confirma somente capacidades realmente observadas; quatro formatos sem amostra real continuam pendentes. | real pilot + preflight | `npm --prefix . run build && node --test --test-reporter=tap dist/test/archive.test.js dist/test/media.test.js dist/test/coverage.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |
| 01-07-03 | 01-07 | 7 | PRIV-01, PRIV-02, PRIV-03, SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, SYNC-06, SYNC-07, EVID-01, MEDIA-01, MEDIA-02, MEDIA-03, WEB-01 | T-1-15, T-1-16, T-1-SC | Arquivo real reabre offline com mesmos registros/bytes; único coletor reinicia sem perda local; status público corresponde somente ao observado, restante permanece explicitamente pendente. | contract/integration | `npm --prefix . run build && node --test --test-reporter=tap dist/test/backup.test.js dist/test/recovery.test.js dist/test/collector.test.js dist/test/http.test.js dist/test/readonly.test.js` | Não — criado nesta tarefa ou dependência anterior | pending |

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
