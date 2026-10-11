---
phase: 02-busca-contexto-abas-e-exporta-o-no-site
plan: "03"
subsystem: ui
tags: [preview, mime, streams, security, native-media, playwright]
requires:
  - phase: 02-02
    provides: contexto congelado e painéis privados com geração por sessão/aba
provides:
  - Preview autenticado sob ação com assinatura e MIME coerentes sobre fd verificado
  - Players nativos, download independente e fallback explícito por formato/codec
  - Cleanup de streams, previews e respostas tardias ao navegar/sair/expirar
affects: [02-04, 02-05, mcp]
tech-stack:
  added: []
  patterns: [bounded-signature-read, same-fd-streaming, on-demand-native-controls]
key-files:
  created: [test/preview.test.ts]
  modified: [src/media.ts, src/main.ts, public/app.js, public/index.html, public/style.css, test/ui.test.ts, test/security.test.ts, test/readonly.test.ts]
key-decisions:
  - "Preview reusa a rota de streaming/Range/HEAD do original e lê até1445 bytes no mesmo fd; codec permanece responsabilidade do navegador."
  - "Navegação invalida previews antes de aguardar a nova conversa; close/logout/pagehide removem src e listeners, conservando download e disponibilidade."
requirements-completed: []
coverage:
  - id: D1
    description: Preview privado classificado por bytes e MIME, sem conteúdo ativo inline
    requirement: WEB-05
    verification:
      - kind: integration
        ref: test/preview.test.ts#allowlist de raster áudio vídeo exige MIME e assinatura coerentes
        status: pass
      - kind: integration
        ref: test/preview.test.ts#ativo divergente inconclusivo e vazio conservam download original sem inline
        status: pass
    human_judgment: false
  - id: D2
    description: Imagem e players nativos sob ação mantêm original em fallback e limpam respostas tardias
    verification:
      - kind: automated_ui
        ref: test/ui.test.ts#players nativos sob ação fallback e estados preservam original UC35 a UC39
        status: pass
      - kind: automated_ui
        ref: test/ui.test.ts#HEAD retido close switch logout expiração e pagehide impedem GET tardio
        status: pass
    human_judgment: false
  - id: D3
    description: Auth, Range, symlink e abort preservam privacidade e fecham descritores
    verification:
      - kind: integration
        ref: test/preview.test.ts#preview range paths symlink e fd verificado até fechamento
        status: pass
      - kind: integration
        ref: test/preview.test.ts#stream de preview abortado fecha fd sem alterar original
        status: pass
      - kind: integration
        ref: test/security.test.ts#HTTP privado nega HEAD/Range, paths e vazamentos; revalida expiração antes de responder QR
        status: pass
    human_judgment: false
actuals:
  tokens: 15362
  tasks: 3
  commits: 6
commits: 6
plan_head_before: 313707f432467124bd8115152486e3b49b0db3d4
plan_head_after: 8118dc8d06de831f9eff2257026ca0e8117e55f4
duration: 12min
completed: 2026-10-11
status: complete
---

# Phase 2 Plan 3: Prévia privada de anexos Summary

**Assinatura e MIME permitem apenas raster/áudio/vídeo no fd verificado; controls nativos sob ação preservam download e disponibilidade após falha de codec.**

## Performance

- Início registrado2026-10-11T23:25:51Z; fechamento2026-10-11T23:37Z, aproximadamente12min.
-3/3 tarefas;9 arquivos de produto/teste. Actuals mede61447 caracteres/4 do diff realizado, arredondado para15362; seis commits medidos pelo ledger antes deste resumo.

## Accomplishments

- `classifyPreview` lê cabeçalho de até1445 bytes com posição explícita0, sem reabrir pathname nem mudar o original. Raster PNG/JPEG/GIF/WebP, áudio WAV/MP3 com ID3 ou duas frames/Ogg/FLAC e vídeo MP4/WebM recebem MIME canônico somente com metadado coerente. WAV/FLAC aliases são normalizados. Ftyp MP4 exige caixa inteira limitada e marca mp4; WebM exige EBML/DocType webm. Assinatura de container não promete codec decodificável. Encodings EBML incomuns/inconclusivos permanecem download, conforme comentário shortcut.
- GET/HEAD `/api/attachments/:id/preview` compartilha streaming/Range do original sobre `openVerifiedAttachment` e fd único. Sessão é verificada antes de ID/open/Range. Allowlist inválida415, missing/symlink/traversal404, cookie inválido/expirado/revogado401 e Range múltiplo/invertido/outside/overflow416. No-store/nosniff/Content-Length/Accept-Ranges e Content-Disposition seguro; CSP adiciona somente media-src self. HEAD/415/416, stream terminado ou abortado fecham fd. Teste troca pathname por symlink após abertura e ainda lê os bytes PNG do inode verificado.
- UI mostra nome completo dir=auto, tipo/MIME/estado/tamanho/hash e Baixar original independente. HEAD autenticado precede src privado; nenhum Blob/buffer de mídia no JS. Imagem com alt, áudio/vídeo controls/preload=none sem autoplay, loading/erro/fallback e Fechar visualização com retorno de foco. Codec error conserva available e original; ausência local tem copy própria. Pendente/retry_wait/unavailable mantêm motivo e mensagem.
- Close/switch/logout/expiração/pagehide removem src, pausam players, removem listeners e invalidam tickets antes de resposta tardia. Cleanup já ocorre ao iniciar navegação, pois aguardar a conversaB deixava uma janela para GET deA. Refresh/contexto/substituição de resultados limpa derivados; download HEAD tardio não navega após remoção de painel/sessão.

## Task Commits

| Tarefa | RED | GREEN | Prova |
|---|---|---|---|
|02-03-01|81eb7a2|505cff7|HTTP404 e açãoDOM0;9/9GREEN e tracer repetido9/9|
|02-03-02|3f2395c|45185ee|JPEG415 em lugar de200; matriz6/6GREEN|
|02-03-03|1525722|8118dc8|áudioDOM0 e GET tardio após switch;15/15GREEN; full113/113|

## TDD Gate Compliance

Três RED→GREEN separados e ordenados, todos na branch atual. TAP íntegro e exit real de subprocessos estão em arquivos ignorados `dist/02-03-01-red.json`, `dist/02-03-02-red.json`, `dist/02-03-03-red.json`. Os três receberam RED_EVIDENCE_OK e semanticAssessment: fixtures/worker/login/browser executaram, falha por assertions planejadas, sem load/syntax/skip. Primeiro record foi repetido para capturar exit de subprocesso; command como array foi recusado INVALID_RED e serializado como comando string preservando o mesmo TAP antes de GREEN. Nenhuma recusa autorizou implementação. Fixture MP4 sem suporte foi acrescentada ao RED antes da expansão. Nenhuma refatoração adicional.

## Verification

- Tarefa1: build +preview/ui9/9; tracer repetido9/9 antes da expansão.
- Tarefa2: build +preview/security/readonly6/6,0skip; todos os dez formatos, mismatch/ativo/vazio, auth, Range/HEAD, fd/path e bytes. MP3 sem ID3 e fd abort/415 acrescentados no fechamento e comprovados pela suíte final.
- Tarefa3: build +ui/preview15/15,0skip. WAV PCM reproduziu/currentTime>0; WebM VP8 decodificou/videoWidth16. MP4 MPEG-4 Part2 produzido por ffmpeg existente foi sem suporte no Chromium e recebeu fallback real; download final corresponde aos bytes, assim como PNG/WAV. Fixtures binárias pequenas estão em base64 no teste; ffmpeg não é dependência de execução do teste/produto.
- Suíte final `mise exec node@24.21.0 -- npm test`:113/113,0fail/skip/todo,30,942s. Log ignorado `dist/02-03-full-tests.log`. `git diff --check` limpo; evaluation-scope resolveu seis commits da branch.
- Playwright do bundle e Chromium152 existente, apenas temporários sintéticos sem socket real. Capturas `dist/02-03-ui-{320,768,1280}.png` e zoom200.png inspecionadas, sem overflow.200% representa fonte/reflow, não zoom nativo/dispositivo físico.
- P-02-04 demonstrada por missing404, rejeição de ativo415, zero GET antes da ação e codec/fallback mantendo download igual; VALIDATION atualizada. `requirements.ready-ids` retorna0/1 paraWEB-05, compartilhado com02-05; requisito global permanece pendente.
- Fontes primárias conferidas: [WHATWG MIME Sniffing](https://mimesniff.spec.whatwg.org/) para assinaturas/containers; [Node24 fs](https://nodejs.org/docs/latest-v24.x/api/fs.html) para descritor/posição/stream; [MDN preload](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preload) para controls sob ação.

## Deviations from Plan

Nenhuma ampliação de capacidade, arquitetura ou dependências. Reutilização da rota original foi mantida; nove arquivos previstos. Correções de fixture durante GREEN: readonly agora encontra a mensagem textual entre anexos adicionados, selector do vídeo é específico e troca de conversa volta a viewport desktop após teste móvel. Isso preserva assertions reais, sem contornar comportamento.

## Issues Encountered

Somente tipos Express5 do parâmetro em rota-array, inferência Buffer do TypeScript e fixtures descritas acima, resolvidos antes do GREEN correspondente. Nenhum gate de auth/instalação. Nenhum segredo, serviço, perfil ou coletor real alterado.

## Known Stubs

Nenhum stub essencial. Formatos fora da allowlist, MIME ausente e assinatura inconclusiva são fallback intencional com original preservado; ZIP pertence02-04. Nenhum teste skip/todo ou verify não executado. Superfícies novas correspondem aos threats T-02-10..13 já previstos.

## Next Phase Readiness

Prévia e download prontos para integrar à exportação e ao aceite real offline02-05. Não houve transcode, OCR, transcrição, instalação, push ou implantação. Codecs da conta, zoom nativo e dispositivos físicos permanecem nas verificações apropriadas; dados sintéticos não concluem Phase2 nemWEB-05 globalmente.

## Self-Check: PASSED

Todos os nove arquivos existem; seis commits são ancestrais deHEAD e evaluation-scope resolve02-03 na branch atual. Suíte final113/113sem skips, todos os verify executados. Resumo e métricas correspondem ao ledger313707f→8118dc8; nenhum stub bloqueia o objetivo deste plano.
