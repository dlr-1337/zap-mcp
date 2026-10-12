---
phase: "02"
status: complete
scope: correções pontuais UI-01..UI-04 após revisão visual
completed: 2026-10-11
---

# Phase 2 — Correções da revisão visual

Correções dos quatro WARNINGs de `02-UI-REVIEW.md`, sem redesign, backend, dependências ou atualização de STATE/ROADMAP/SUMMARY. A nota final depende do recheck independente; este documento registra execução, não atribui nova pontuação.

- **UI-03:** feedback e prévia de período têm IDs por conversa; inputs descrevem ajuda/erro/prévia e preservam aria-invalid/foco no período inválido ou recorte vazio. Erros e andamento usam alert/status correspondentes.
- **UI-04:** erros HTTP/rede do contexto, continuação, preview HEAD e download são alertas. Início/repetição/sucesso restauram status; leitura anterior, originais e invalidação de respostas/sessão continuam preservados.
- **UI-01:** Exportar conversa/Gerar ZIP/Preparando ZIP/ZIP pronto/Gerar ZIP novamente, falha/vazio/concorrência/expiração seguem o vocabulário contratado. Mensagem, arquivo incluído e anexo faltante flexionam singular/plural. O único seletor afetado em `scripts/phase2-acceptance.mjs` foi adaptado para Gerar ZIP; oráculo e critérios de integridade não mudaram.
- **UI-02:** h3 usa margem explícita `0 0 16px`, na escala existente.

## Evidência

- RED `f517054`: browser real sintético falhou nas assertions planejadas — campo focado não descrevia o erro e contexto conservava role=status. TAP completo, exit1 e semanticAssessment em `dist/02-ui-fix-{0,1}-red.json`, ambos classificados RED_EVIDENCE_OK antes da implementação.
- GREEN `9f55deb`: build + UI **15/15**, sem skips. Alvos reforçados **2/2** verificaram período invertido/422 com associação/foco/leitura preservada, falhas HTTP/rede de contexto e continuação sem perder mensagens, preview HEAD415/rede e retorno a status ao repetir.
- `mise exec node@24.21.0 -- node --check scripts/phase2-acceptance.mjs`: exit0.
- Única regressão completa após o ajuste: `mise exec node@24.21.0 -- npm test`, **132/132**, zero fail/skip/todo, **43,295s**. Log ignorado `dist/02-ui-fix-full-tests.log`.

## Limites

Somente fixtures sintéticas efêmeras no Chromium/Playwright existentes. Nenhum perfil, serviço ou coletor real reiniciado/alterado; nenhum novo aceite real executado. Os assets JS/CSS são servidos pelos caminhos existentes. Zoom nativo, dispositivo físico, recheck visual e code review independente permanecem fora desta correção.
