---
phase: "02"
slug: "busca-contexto-abas-e-exporta-o-no-site"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-11"
---
# Phase 2 — Validation Strategy

Contrato inicial derivado de 02-RESEARCH.md; o planner deve alinhar IDs/tarefas/ondas ao plano final. Nenhum teste novo existe ou requisito está concluído por este documento.

## Test Infrastructure
- Framework: node:test/TypeScript existentes, Node24.21.0 via mise.
- Build: `mise exec node@24.21.0 -- npm run build`.
- Quick: `mise exec node@24.21.0 -- node --test dist/test/archive.test.js dist/test/http.test.js dist/test/security.test.js dist/test/readonly.test.js`.
- Full: `mise exec node@24.21.0 -- npm test`.
- Pesquisa mediu 4 testes HTTP/security/readonly em 2,67s; duração da suíte ampliada ainda não medida. Falha: exit não zero, zero testes executados ou qualquer teste failing.

## Sampling Rate
- Após tarefa: build e testes dos módulos alterados.
- Após onda: suíte completa; antes de verificação final, suíte completa verde.
- Browser/real/offline: na entrega de cada fluxo utilizável; não repetir sem mudança/falha relevante.

## Per-Task Verification Map
| Capacidade | Requisito | Risco coberto | Tipo | Comando/condição | Estado |
|---|---|---|---|---|---|
| Busca/fuso | EVID-02, WEB-02 | acentos, AND literal, homônimos, meia-noite, DST histórico, sem timestamp | unit/integration | build + dist/test/search.test.js e dist/test/query-http.test.js a criar | pending W0 |
| Recorte/contexto | WEB-03 | timestamp igual, entrada retroativa, edição/revoke e redirect sem salto/repetição | unit/integration | build + dist/test/search.test.js e dist/test/context.test.js a criar | pending W0 |
| Abas | WEB-04 | scroll/âncora independente, race, logout, teclado, mobile | browser | QA 320/768/1280 com duas conversas, resposta atrasada e expiração | pending |
| Preview | WEB-05 | auth HEAD/Range, MIME ativo/codec, hash, original offline | integration/browser | build + dist/test/preview.test.js a criar; fallback real seguro | pending W0 |
| ZIP | EXP-01/02/03 | todo recorte, freeze de DTO, faltantes, duplicatas, traversal, auth/CSRF, crash/disco, CRC/SHA | integration/fault | build + dist/test/export.test.js a criar; unzip -t independente | pending W0 |
| Regressão | PRIV-02/03 | dados sem sessão, segredo/envelope, somente leitura e restore | integration | build + dist/test/auth.test.js dist/test/security.test.js dist/test/readonly.test.js dist/test/backup.test.js | arquivos existentes |

## Wave 0 Requirements
- Criar testes novos das capacidades junto às tarefas elegíveis de TDD; antes de lógica não trivial, RED observado.
- Infraestrutura já existe; não instalar novo framework só para estes testes.
- Planner pode ajustar nomes/IDs de arquivos acima para o menor conjunto correto, sem omitir riscos.

## Manual-Only Verifications
| Comportamento | Requisito | Por que exige fluxo real | Instruções |
|---|---|---|---|
| Conversa real e contexto | WEB-02/03 | fixture não valida amostra real | localizar conversa conhecida e termo/arquivo, conferir origem e janela; João inexistente fica ausente explícito |
| Duas abas e previews | WEB-04/05 | DOM/codecs/posição no browser | alternar, preservar leitura, teclado e mobile; imagem/áudio/vídeo reais, download de documento |
| ZIP offline completo | EXP-01/02/03 | binários reais e recorte além da página | exportar período com mais mensagens que a página; unzip -t, contagens, referências, tamanhos/hashes e faltantes; sem publicar dados |
| Coletor desligado | WEB-02/03/05, EXP-01/02 | independência real de socket | consultar cópia privada restaurada sem iniciar outro coletor; busca/preview/download/ZIP continuam úteis |

## Validation Sign-Off
- [ ] Tarefas finais têm verify automático/fails_when e IDs alinhados.
- [ ] Nenhuma sequência de três tarefas sem verificação.
- [ ] Novos arquivos/testes implementados; sem placeholders MISSING restantes.
- [ ] Sem watch e latência medida.
- [ ] Aceite browser/real/offline sanitizado.
- [ ] nyquist_compliant true somente após evidência.
**Approval:** pending execution evidence.
