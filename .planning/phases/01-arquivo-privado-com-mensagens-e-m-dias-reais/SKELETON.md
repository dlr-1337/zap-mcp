# Walking Skeleton — Zap MCP

**Phase:** 1
**Generated:** 2026-10-10
**Status:** contrato de arquitetura planejado; nenhum produto executado.

## Capability Proven End-to-End

Capacidade a provar no plano01-01: proprietário entra na interface privada, abre mensagem gravada pela API interna num banco real e reabre a mesma mensagem após reinício; navegação real no browser e HTTP/node:test são evidências separadas. Fixture não aceita a conta.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Node24.21.0/TypeScript ESM e Express5.3.0 | Um processo, pins pesquisados e build NodeNext |
| Data layer | better-sqlite3 13.0.3; archive.sqlite + auth.sqlite privados | Consultas sem sessão WhatsApp; transações síncronas curtas |
| Auth | Senha local scrypt + express-session1.19.0 Store SQLite | D-01..D-04; sessão revogável, sem IdP/cadastro |
| Collector | Baileys7.0.0-rc14 scoped, auth transacional10 categorias e lock exclusivo | Sem navegador; não oficial/rc exige smoke e piloto |
| Media | Fila SQLite + stream/files0700/0600, hash/tamanho/fsync/rename | Original disponível offline, reconcile/crash/ENOSPC |
| UI | HTML/CSS/JS próprios, tokens/copy do UI-SPEC | Leitor único, sem SPA ou dependência visual |
| Deployment target | Dev loopback127.0.0.1; VPS/domínio ainda não identificados | Nenhuma exposição externa sem transporte protegido |
| Directory layout | src/main.ts, auth.ts, archive.ts, whatsapp.ts, media.ts, backup.ts; public/index.html/app.js/style.css; test/*.test.ts | Seis módulos diretos, sem interfaces/camadas genéricas |
| Recovery | Snapshot offline coordenado, manifest/restore isolado e recibo antes de --collect | D-19; restaurado default sem coletor |

## Stack Touched in Phase 1

- [ ] Scaffold: package/lock/tsconfig, build ESM e node:test do runtime24.
- [ ] Routing: login/logout, status/QR, lista/leitor e original por ID privados.
- [ ] Database: write/read reais no tracer e ingestão por mesma API privada.
- [ ] UI: login e link para conversa funcionam no navegador; nenhum conteúdo recebido executado.
- [ ] Local full-stack: npm ci; npm --prefix . run build; node dist/src/main.js owner-set (stdin); npm start serve; ZAP_DATA_DIR fora do checkout. Tracer/auth são verificados em test/auth.test.ts no plano01-01; test/http.test.ts é criado no plano01-05. Comandos finais e .env.example documentados pelo executor no plano01-06, sem senha/caminho real.
- [ ] Pré-piloto: parar serviço, backup/verify-backup e preflight antes de serve --collect; quatro originais reais só no plano07.

## Out of Scope (Deferred to Later Slices)

Fase2 busca/período/abas/contexto/export ZIP/preview completo; fase3 MCP e entrega no Codex instalado; fase4 implantação/supervisão/HTTPS final/backup recorrente fora da VPS/aceite restaurado completo. Claude/importador condicionado pertencem v2. Sem escrita/leitura remota, bypass viewOnce, IA hospedada/OCR/transcrição/vectorDB/multi-conta.

## Subsequent Slice Plan

Fase2 reutiliza Archive/DTO/IDs/instantes/revisões/jobs para busca e exportação. Fase3 reutiliza as mesmas consultas e originais privados para MCP; HTTP nunca recebe socket. Fase4 supervisiona o mesmo serviço e demonstra backup externo/restore; não inicia segundo coletor na restauração. Somente capabilities usadas agora são exportadas, sem wrappers preventivos.

## Evidence Boundary

Snapshot inicial pode ser vazio e prova recuperabilidade técnica; aceite exige conta/amostras/celular. Este documento registra escolhas, não declara build, conexão, cópia real, VPS ou requisito concluído.

