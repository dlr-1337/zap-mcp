---
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
plan: "07"
subsystem: collector
tags: [private-pilot, qr, baileys, web-comparison, offline-restore]
requires:
  - phase: "01-06"
    provides: Snapshot/restore autenticado, recibo do perfil fonte e preflight
provides:
  - Conta real vinculada e comparação autônoma de conversa individual/grupo com WhatsApp Web
  - Quatro formatos reais correlacionados com Web e originais conferidos por tamanho/hash de origem, disco e HTTP
  - Restore pós-reparo com fonte parada, sem segundo coletor, e retomada conectada sem QR
affects: [phase-1-pilot, phase-2]
tech-stack:
  added: []
  patterns: [exclusive-collector, private-operational-evidence, conservative-replay-projection]
key-files:
  created: [.planning/debug/resolved/original-replay-conflict.md]
  modified: [src/whatsapp.ts, src/archive.ts, src/media.ts, public/app.js, test/collector.test.ts, test/archive.test.ts, test/media.test.ts, test/revisions.test.ts, README.md]
key-decisions:
  - "WEB_BROWSER Chrome corrige recusa428 Desktop DARWIN, sem executar navegador no coletor; syncFullHistory mantido."
  - "Override explícito de 2026-10-11 dispensa comparação manual no celular e autoriza referência WhatsApp Web."
  - "fromMe identifica a própria conta, sem inferir aparelho; UI diz Enviada por você."
  - "Originais equivalentes no mesmo relógio/evidence ignoram somente messageContextInfo de raiz; diferenças reais continuam conflito."
requirements-completed: []
requirements-supported: [PRIV-01, PRIV-02, PRIV-03, SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, SYNC-06, SYNC-07, EVID-01, MEDIA-01, MEDIA-02, MEDIA-03, WEB-01]
actuals:
  tasks: 3
duration: piloto continuado
completed: 2026-10-11
status: complete
---

# Plano 01-07: piloto real comparado e restaurado

**Três tarefas concluídas. Conta vinculada, comparação com Web autorizada pelo usuário, originais disponíveis conferidos e restore/restart após correção. Requisitos aguardam o verificador da fase; conclusão do plano não equivale à conclusão da fase.**

## Resultados

1. Perfil privado novo, snapshot/restore e exclusividade conferidos antes de QR. Login protegido e QR atual emitido pelo serviço normal, lido pelo usuário; estado conectado e ingestão real observados. Desktop recusado428 corrigido por identificação WEB_BROWSER da rc14, sem Chromium no coletor.
2. Conversa individual conhecida:26 IDs,21 textos,20 instantes originais e23 direções conferidos com Web. Grupo conhecido:27 IDs, dez datas e sete identidades de autoria conferidos; oito de dez textos literalmente iguais e duas diferenças de renderização descritas no checkpoint. Quatro formatos de anexo encontrados pelos IDs originais e controles do tipo. Bytes preservados comparados com tamanho/hash recebido da origem e HTTP privado. Não afirmar que bytes diretamente baixados do Web foram comparados.
3. Após backup anterior conferido,244 projeções recuperadas ao reprocessar313 itens existentes; referências, revisões, anexos e hashes preservados, dois conflitos sem equivalência mantidos. Cópia posterior contém8.684 mensagens e828 originais disponíveis. Fonte parada durante restore; todas linhas de mensagens/revisões/anexos/fila/lotes/itens comparadas, SQL/FK e HTTP autenticado offline conferidos. Quatro originais mantêm IDs/referências/tamanhos/hashes. Único coletor retomou conectado sem novo QR. Três mensagens novas observadas entre cópias: duas próprias e uma recebida.

Download de áudio no Chrome normal após reparo:33.529 bytes, hash igual ao acervo,100 mensagens ainda na página e interface funcionando. Rótulo de direção corrigido para “Enviada por você”.

## Validação e revisões

- RED fdce71e, GREEN a292dd3, relatório sintético b35aa85; suíte completa86/86 antes da mudança textual. Sem novas dependências.
- Revisão atual de archive/revisions/app:12 testes e29 verificações independentes passaram, zero achados. Relatório anterior preservado em 01-REVIEW.iter3.md; ledger cinco corrigidos/zero abertos.
- Provas privadas preservadas fora do checkout: comparação Web por ID, reparo, áudio baixado pelo Chrome, snapshots e restore. Documentos públicos contêm somente agregados, sem conteúdo, números, identificadores ou hashes reais.
- Provas anteriores mantidas: lote inicial8.924 recebidos/confirmados, zero falhas/pendentes; participante de envelope rc14 e DNS IPv4 corrigidos com RED/GREEN, replay preservado. GET/HEAD/Range sem sessão401 nos quatro arquivos; HTTP autenticado200/Range206 com mesmos bytes em fonte e restore. Dispositivo único e chaves persistentes verificados nas implementações/testes correspondentes.

## Limites

Cobertura é somente o material recebido e o recorte comparado. Uma edição sem instante original fica explicitamente desconhecida; notificação de fixação e direções não visíveis não foram inventadas. Mídias não disponíveis continuam com estado/motivo; não há garantia de recuperação antiga ou histórico integral.

SIGSEGV do navegador auxiliar confirmado sem causa nativa determinada e sem OOM; auxiliar aposentado. O download funcionou no Chrome normal, sem afirmar correção global de Chromium. Política recusou navegação interna de downloads do Chrome; nenhum contorno. Downloads de origem Web do documento e capturas de tela não produziram prova de conclusão.

VPS/HTTPS, backup externo, exportação/busca completa e Codex-MCP pertencem às fases seguintes. Nenhuma foi presumida concluída.

## Próximo controle

Nyquist, segurança, UI e verificação da meta devem reconciliar requisitos/ROADMAP/STATE. Nenhuma comparação manual no celular permanece pendente.

Controles prévios ao verificador: Nyquist validado com zero lacunas automatizadas;17 ameaças planejadas mitigadas/zero abertas no nível1; UI22/24 sem blocker, dois warnings menores corrigidos e assertivas CUA atuais passaram. Build atual e13 testes auth/HTTP/security/readonly passaram em6,92s. Gate TDD:4 planos, zero violações. Gate de regressão cruzada não aplicável à primeira fase.
