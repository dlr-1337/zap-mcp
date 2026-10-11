---
status: complete
phase: 01-arquivo-privado-com-mensagens-e-m-dias-reais
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md, 01-07-SUMMARY.md]
started: 2026-10-11T16:35:40.007Z
updated: 2026-10-11T16:47:15.935Z
operator: agent-assisted
---

## Current Test

[testing complete]

## Método e autorização

O proprietário autorizou testes pelo agente e comparação com WhatsApp Web, dispensando conferência manual no celular.17 entradas source:automated foram aprovadas pelo classificador GSD por verificações verdes existentes;11 entradas source:agent-observed registram operações/evidências reais identificadas. Nenhuma resposta ou aceite humano foi inventado. As reservas antigas para o piloto foram satisfeitas pelo plano07 posterior e pelas rechecagens atuais, sem apagar a cronologia dos SUMMARYs.

O processo fonte foi parado graciosamente e reiniciado, sem limpar perfil, sessão, cache, banco, mídia ou travas à força. Nova restauração isolada em diretório limpo manteve o coletor desabilitado. Conteúdo, IDs, hashes, credencial, binários e provas detalhadas ficam privados fora do checkout.

## Tests

### 1. Reinício preserva vínculo e acervo
expected: O serviço inicia a partir de processo parado, preserva mensagens e volta conectado sem pedir outro QR.
result: pass
source: agent-observed
evidence: UAT atual: 8.708 referências preservadas e conexão retomada sem QR. Perfil e arquivos reais não foram apagados.

### 2. Tracer real HTTP nega anônimo, autentica e reabre a mesma mensagem após reinício.
expected: Tracer real HTTP nega anônimo, autentica e reabre a mesma mensagem após reinício.
result: pass
source: automated
coverage_id: 01-01:D1
evidence: test/auth.test.ts#autentica e reabre mensagem persistida

### 3. Logout/reset/TTL/origem/CSRF/limites e exclusividade operacional de senha.
expected: Logout/reset/TTL/origem/CSRF/limites e exclusividade operacional de senha.
result: pass
source: automated
coverage_id: 01-01:D2
evidence: test/auth.test.ts#logout duplo revoga sessão sem tocar acervo; test/auth.test.ts#login concorrente e cinco tentativas por janela são limitados; test/auth.test.ts#reset revoga IDs e preserva acervo e auth WhatsApp; Unicode exato; test/auth.test.ts#TTL idle/absoluto, Origin e CSRF são impostos pelo servidor; test/auth.test.ts#revogação resiste a save tardio e reset durante login; logout falho não anuncia sucesso; test/auth.test.ts#owner-set exige serviço exclusivo e stdin; Host externo é recusado

### 4. Lista/leitor/volta/logout nativos com janelas SQL e texto hostil inerte.
expected: Lista/leitor/volta/logout nativos com janelas SQL e texto hostil inerte.
result: pass
source: automated
coverage_id: 01-01:D3
evidence: test/auth.test.ts#UI HTTP vazia, texto hostil e janelas com cursor estável sem coletor; Playwright Chromium local320/768/1280; capturas sintéticas externas /tmp/zap-reader-{width}.png

### 5. Ingestão completa por lote, origem, alias, revisão e atomicidade
expected: Ingestão completa por lote, origem, alias, revisão e atomicidade
result: pass
source: automated
coverage_id: 01-02:D1
evidence: test/archive.test.ts + test/revisions.test.ts + test/coverage.test.ts

### 6. Cobertura privada, intervalo original e retomada de lote interrompido
expected: Cobertura privada, intervalo original e retomada de lote interrompido
result: pass
source: automated
coverage_id: 01-02:D2
evidence: test/coverage.test.ts#HTTP cobertura distingue ausência, commits, intervalo original, replay e falhas

### 7. Dez categorias, credenciais parciais, deleção null, rollback e reinício
expected: Dez categorias, credenciais parciais, deleção null, rollback e reinício
result: pass
source: automated
coverage_id: 01-03:D1
evidence: test/auth-state.test.ts

### 8. Exclusividade em processos, SIGKILL, QR atual, eventos e gerações isoladas
expected: Exclusividade em processos, SIGKILL, QR atual, eventos e gerações isoladas
result: pass
source: automated
coverage_id: 01-03:D2
evidence: test/collector.test.ts

### 9. Códigos de desconexão, orçamento e estabilidade com relógio fake
expected: Códigos de desconexão, orçamento e estabilidade com relógio fake
result: pass
source: automated
coverage_id: 01-03:D3
evidence: test/collector.test.ts#códigos401/440/515/408/428/503/403/411/500 preservam auth e arquivo

### 10. HTTP autenticado de status/QR/leitor e logout sem operações remotas
expected: HTTP autenticado de status/QR/leitor e logout sem operações remotas
result: pass
source: automated
coverage_id: 01-03:D4
evidence: test/readonly.test.ts#HTTP privado status/QR/leitor/logout é somente leitura e funciona offline

### 11. Quatro originais, integridade de origem/local, restrições e HTTP autenticado offline
expected: Quatro originais, integridade de origem/local, restrições e HTTP autenticado offline
result: pass
source: automated
coverage_id: 01-04:D1
evidence: test/media.test.ts + test/archive.test.ts + test/readonly.test.ts

### 12. Recuperação de jobs/parciais/finais e proteção por reserva/ENOSPC
expected: Recuperação de jobs/parciais/finais e proteção por reserva/ENOSPC
result: pass
source: automated
coverage_id: 01-04:D2
evidence: test/recovery.test.ts#crash após job/part/publicação/beforeAvailable recupera sem apagar acervo; test/recovery.test.ts#reserva no limiar e ENOSPC pausam sem alterar originais anteriores

### 13. Janelas limitadas privadas com identidade recebida, empates, aliases e acesso offline ao arquivo.
expected: Janelas limitadas privadas com identidade recebida, empates, aliases e acesso offline ao arquivo.
result: pass
source: automated
coverage_id: 01-05:D1
evidence: test/http.test.ts

### 14. Leitor nativo, estados, evidências, teclado, QR e download com bytes conferidos.
expected: Leitor nativo, estados, evidências, teclado, QR e download com bytes conferidos.
result: pass
source: automated
coverage_id: 01-05:D2
evidence: /tmp/zap05-browser-qa.mjs + /tmp/zap05-browser-result.json; /tmp/zap05-reader-320.png + /tmp/zap05-reader-768.png + /tmp/zap05-reader-1280.png

### 15. Sessão, HEAD/Range, conteúdo hostil, symlink, erro seguro e expiração durante geração do QR.
expected: Sessão, HEAD/Range, conteúdo hostil, symlink, erro seguro e expiração durante geração do QR.
result: pass
source: automated
coverage_id: 01-05:D3
evidence: test/security.test.ts + test/auth.test.ts + test/readonly.test.ts

### 16. WAL, auth, proveniência, FTS5 de fixture e quatro originais restaurados com hashes.
expected: WAL, auth, proveniência, FTS5 de fixture e quatro originais restaurados com hashes.
result: pass
source: automated
coverage_id: 01-06:D1
evidence: test/backup.test.ts

### 17. Writer ativo, corrupção, paths, destino ocupado, SQL, ENOSPC e SIGKILL recusam sucesso indevido.
expected: Writer ativo, corrupção, paths, destino ocupado, SQL, ENOSPC e SIGKILL recusam sucesso indevido.
result: pass
source: automated
coverage_id: 01-06:D2
evidence: test/backup.test.ts + test/recovery.test.ts

### 18. Restore HTTP autenticado emite prova e libera um socket; clone, recibo adulterado e snapshot inválido bloqueiam.
expected: Restore HTTP autenticado emite prova e libera um socket; clone, recibo adulterado e snapshot inválido bloqueiam.
result: pass
source: automated
coverage_id: 01-06:D3
evidence: test/recovery.test.ts#ramo real libera exatamente um socket após prova e bloqueia clone restaurado antes do socket; /tmp/zap06-smoke.mjs + /tmp/zap06-cli-result.json

### 19. Evidência, citações e histórico renderizados no leitor
expected: O leitor mostra texto, citação, histórico e detalhes de evidência recebidos.
result: pass
source: agent-observed
coverage_id: 01-02:D3
evidence: Chrome atual:100 mensagens,3 citações,100 históricos e200 detalhes; histórico abriu e campos desconhecidos ficaram explícitos.

### 20. Disponibilidade e compatibilidade dos quatro originais na conta real
expected: A conta vinculada e os quatro formatos existentes ficam consultáveis, inclusive offline, sem novo QR no reinício.
result: pass
source: agent-observed
coverage_id: 01-04:D3
evidence: UAT atual: os4 formatos aparecem no grupo e a cópia offline entregou os4 originais com tamanho/hash correto.

### 21. Aceite de conta real e originais reais permanece reservado ao piloto.
expected: A conta vinculada e os quatro formatos existentes ficam consultáveis, inclusive offline, sem novo QR no reinício.
result: pass
source: agent-observed
coverage_id: 01-05:D4
evidence: Piloto posterior concluído e rechecado: conta real,4 formatos e acervo offline; nenhuma resposta humana presumida.

### 22. Conta real, reinício remoto e quatro originais conhecidos aguardam plano01-07.
expected: A conta vinculada e os quatro formatos existentes ficam consultáveis, inclusive offline, sem novo QR no reinício.
result: pass
source: agent-observed
coverage_id: 01-06:D4
evidence: UAT atual: fonte reiniciada sem QR,8.708 referências preservadas; restore novo sem coletor e4 hashes conferidos.

### 23. Entrar e sair do site
expected: Login exibe o acervo; sair limpa dados da tela e retorna à senha, mantendo o coletor conectado.
result: pass
source: agent-observed
evidence: Chrome atual: logout zerou conversas/mensagens no DOM; reentrada após carregamento voltou conectada, sem desvincular.

### 24. Reabrir conversa individual e grupo
expected: As duas conversas indicadas podem ser abertas, com os campos recebidos e desconhecidos explícitos.
result: pass
source: agent-observed
evidence: Conversa individual conhecida e grupo indicados abriram com100 mensagens;100 datas originais no recorte individual e campos ausentes explícitos.

### 25. Paginar e voltar à lista
expected: Carregar mais mensagens mantém referências sem duplicatas; voltar remove a seleção e conserva foco.
result: pass
source: agent-observed
evidence: Individual100→200, zero duplicatas e todas referências anteriores preservadas; volta à lista seleção1→0 e foco restaurado.

### 26. Baixar áudio no Chrome
expected: Baixar original entrega bytes iguais ao acervo e o Chrome continua funcionando depois do download.
result: pass
source: agent-observed
evidence: Chrome atual: áudio real do grupo62.831B com hash igual à origem preservada;300 mensagens permaneceram na página após download.

### 27. Originais offline privados
expected: Áudio, imagem, vídeo e documento preservados são baixáveis sem coletor; IDs diretos, HEAD e Range exigem sessão.
result: pass
source: agent-observed
evidence: Restore novo sem coletor: conversa conhecida e quatro hashes conferidos no HTTP; pedidos sem sessão recusados.

### 28. Cobertura e limites
expected: A tela mostra lote, intervalo e falhas; ausência e campos desconhecidos não viram promessa de histórico integral.
result: pass
source: agent-observed
evidence: Chrome atual: última ingestão,196 entradas de lote e aviso de alcance limitado; texto ausente aparece como não informado.

## Summary

total:28
passed:28
issues:0
pending:0
skipped:0
blocked:0

## Gaps

Nenhuma falha de produto observada nos casos desta sessão.

## Limites e precisão

- Teste assistido pelo agente, sem atribuir confirmação humana ou teste físico no celular. Recorte de conta parcial; snapshot restaurado8.684 mensagens, fonte8.708 referências preservadas no reinício atual. Novas capturas posteriores não tornam o backup uma cópia do estado inteiro atual.
- Quatro originais do grupo verificados pela origem preservada/HTTP/restore; download atual no Chrome de áudio62.831B. Bytes baixados diretamente do WhatsApp Web não foram comparados; comparação de amostras por IDs/dados mantém prova privada anterior.
- Imagem atual válida da tela de entrada após logout inspecionada, sem dados pessoais ou senha. Captura com recorte do cabeçalho retornou imagem vazia e não foi aceita como prova; não afirmar inspeção visual atual de todo o leitor, outros navegadores ou leitor de tela físico. DOM/comportamento do leitor foram observados diretamente.
- Primeira checagem de reentrada consultou o estado antes do carregamento acabar; espera pelo texto Conectado e observação final confirmaram o vínculo. Não foi registrada falha de produto por essa checagem prematura do executor.
- Guard API:27 capacidades,12 INTEGRATE/15 OPT-OUT, sem bloqueio após abreviar4 rótulos preservando decisões/motivos. Relatório histórico movido intacto para history/01-VERIFICATION.iter1.md; não deve bloquear o predicado de verificação atual.
- VPS/HTTPS/MCP/busca/exportação completa pertencem às fases seguintes. Causa nativa do crash do antigo navegador auxiliar continua desconhecida; nenhum ajuste global de Chrome/GPU realizado.

