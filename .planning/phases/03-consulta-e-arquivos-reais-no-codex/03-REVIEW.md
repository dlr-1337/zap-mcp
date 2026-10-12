---
phase: 03-consulta-e-arquivos-reais-no-codex
reviewed: 2026-10-12T18:03:40Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - README.md
  - package-lock.json
  - package.json
  - scripts/phase3-acceptance.mjs
  - src/main.ts
  - src/mcp.ts
  - test/auth.test.ts
  - test/context.test.ts
  - test/export.test.ts
  - test/mcp-acceptance.test.ts
  - test/mcp.test.ts
  - test/readonly.test.ts
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
status: issues_found
---

# Fase 3: Code Review Report

**Reviewed:** 2026-10-12T18:03:40Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Revisão adversarial do escopo explícito atual da fase 3, com leitura dos arquivos, comparação com o baseline informado e rastreamento das chamadas a Archive, mídia, autenticação e trava do serviço. Dois achados WARNING afetam a recuperação do roteiro diante de timeout ou configuração TLS inválida. Nenhum BLOCKER foi confirmado no acesso, nas consultas, nos cursores ou na entrega do MCP.

O resolver de escopo foi informado como `degraded/no-task-commit-rows`; a lista explícita fornecida pelo orquestrador definiu o escopo, sem inferir uma faixa de HEAD. O lockfile foi incluído deliberadamente nessa lista para conferir a mudança de dependências e a revalidação corretiva documentada; não houve nova instalação ou auditoria de registry nesta revisão. Nenhum pre-pass fallow ou evidência de reviewer externo foi fornecido.

Os achados abaixo foram confirmados por verificações sintéticas em memória do código atual, sem modificar fonte ou executar outro coletor. A suíte integral e o aceite real já concluídos não foram repetidos: os achados dizem respeito aos caminhos de falha, não constituem evidência de que a rodada real registrada tenha falhado. A pendência conhecida do login HTTPS do site e a operação VPS permanecem fora desta fase.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: WARNING — Timeout encerra a espera antes de encerrar o subprocesso

**File:** `<checkout>/scripts/phase3-acceptance.mjs:52`
**Affected caller:** `scripts/phase3-acceptance.mjs:240-249`; o mesmo padrão afeta a confiabilidade do tracer em `test/mcp.test.ts:124`.
**Severity:** WARNING
**Issue:** Ao atingir 240 segundos, `runCodex` envia SIGTERM e rejeita imediatamente. Não aguarda `close` nem encerra à força um filho que não responda ao sinal. Assim, `runAcceptance` inicia seu `catch/finally`, restaura o clone e fecha serviço/listeners enquanto o filho ainda pode executar e manter pipes/handles abertos. Um filho que ignore SIGTERM pode manter o comando Node vivo indefinidamente, mesmo depois do erro de orçamento; a transcrição também continua recebendo eventos após a limpeza. O wrapper do tracer repete o problema.
**Evidence:** A função atual foi extraída e executada em memória com um subprocesso Node sintético que registra um handler de SIGTERM e mantém o event loop ativo. Somente o relógio de 240 segundos foi acelerado para 250 ms; a operação de spawn/sinal/Promise permaneceu a do código. Após a rejeição esperada, `exitCode` e `signalCode` ainda eram null e `process.kill(pid, 0)` confirmou o processo vivo. A fixture foi encerrada com SIGKILL e seu `close` foi aguardado. Não houve acesso a dados reais.
**Fix:** Marcar o timeout, solicitar SIGTERM e aguardar `close` antes de rejeitar; depois de um prazo curto de encerramento, enviar SIGKILL ao filho ainda ativo. Limpar ambos os timers em `close/error` e garantir que toda saída do wrapper só ocorra após o encerramento confirmado. Aplicar a mesma correção ao wrapper do tracer. Acrescentar um teste com subprocesso sintético que ignore SIGTERM e verificar que a Promise só termina após `close`, sem handles remanescentes.

### WR-02: WARNING — Falha no setup TLS contorna a limpeza do serviço já aberto

**File:** `<checkout>/scripts/phase3-acceptance.mjs:119-135`
**Affected callees:** `src/main.ts:31`, `src/main.ts:234`, `src/whatsapp.ts:15-48`.
**Severity:** WARNING
**Issue:** `createService` abre os bancos e adquire a trava na linha 119, mas a leitura da chave e `createServer` ocorrem na linha 122, antes do `try` da linha 135. Uma chave com permissões 0644, um arquivo de chave ilegível ou PEM inválido provoca throw sem executar `s.close()` ou `db.close()`. O serviço fica aberto e conserva a trava; outra chamada no mesmo processo recebe “Serviço já ativo”, mesmo após corrigir a chave. A recuperação automática da trava órfã depois do término do processo não substitui o fechamento da instância viva. O bloco atual também deixa leituras iniciais do banco fora da proteção de cleanup.
**Evidence:** `privateFile` rejeita os bits 0077, portanto uma chave 0644 é um gatilho direto. Execução em memória do `runAcceptance` atual com dependências sintéticas e spies, mantendo esse throw da chave no mesmo ponto do fluxo, confirmou `createService` chamado e `close` não chamado. O rastreamento de `createService/close/acquireServiceLock` confirmou que a liberação depende desse fechamento. Nenhum perfil real foi aberto para a reprodução.
**Fix:** Colocar a aquisição dos bancos/serviço e a inicialização TLS dentro de um `try/finally` que alcance todas as instâncias já criadas. Validar chave/certificado antes de abrir o serviço também reduz a janela, mas o cleanup deve cobrir as demais falhas de setup. No `finally`, fechar somente listeners criados/ativos e, independentemente do resultado desses fechamentos, fechar serviço e banco. Acrescentar um controle que injete falha na chave ou no construtor HTTPS depois de abrir o serviço e confirme `close` e uma nova abertura no mesmo processo.

---

_Reviewed: 2026-10-12T18:03:40Z_
_Reviewer: gsd-code-reviewer_
_Depth: standard_

Não foram alterados fontes, testes, dependências, dados privados, configuração ou estado do planejamento; somente este relatório foi criado. VPS, dispositivos físicos e conexão atual do coletor não foram revalidados.
