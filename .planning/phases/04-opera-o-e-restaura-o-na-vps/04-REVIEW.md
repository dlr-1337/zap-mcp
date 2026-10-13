---
phase: 04-opera-o-e-restaura-o-na-vps
reviewed: 2026-10-13T17:32:43Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - scripts/phase4-acceptance.mjs
  - test/operation-acceptance.test.ts
  - scripts/phase2-acceptance.mjs
  - scripts/phase3-acceptance.mjs
findings:
  critical: 4
  warning: 0
  info: 0
  total: 4
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-10-13T17:32:43Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Revisão adversarial dos quatro arquivos explicitamente delimitados, na fonte 3065b55. O fluxo operacional mantém observações em WeakMap e rejeita recibos serializados, mas alguns gates ainda registram conclusões mais fortes do que as evidências verificadas. Há também exposição de fingerprints no recibo anterior e perda de configuração MCP durante seu cleanup.

A revisão histórica de 30 arquivos registrava como resolvidos os problemas de retry de cifragem, retomada de release antiga, dependência de HTTPS no recovery, divergência helper/volume, mutex após estado inválido e binding do container. Esse histórico não representa uma revisão desses 30 arquivos nesta rodada.

Somente fontes e dependências diretas necessárias foram examinadas. Não houve acesso a dados reais, VPS, configurações globais ou diretórios privados de deploy. Os 307 testes/CI informados pelo orquestrador não foram usados como prova de correção. Não foram fornecidos structural findings nem evidência externa.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Gate de contexto do Codex ignora as mensagens e a navegação

**Classification:** BLOCKER
**File:** `scripts/phase4-acceptance.mjs:183`
**Issue:** O probe exige uma chamada get_context para a referência conhecida, mas compara somente p.anchor com messageOracle. Não verifica p.messages, before, after, ordinal, anchorOrdinal nem os cursores; tampouco exige chamadas before/after. Um endpoint que retorna a âncora correta com messages vazio, mensagens de outra conversa ou navegação quebrada continua permitindo registrar permanentCodex/restoredCodex na linha 188. O teste operacional percorre a navegação do site e MCP sintético, mas não exercita essa validação do cliente instalado.
**Fix:** Aplicar aqui o oráculo de janela/canonical order já implementado em scripts/phase3-acceptance.mjs:233-240: obter a conversa e posição canônicas do anchor por SQL, comparar todas as mensagens/metadados e partições before/after, exigir as chamadas de navegação quando houver vizinhos, e conferir argumentos e cursores consecutivos. Adicionar controles que preservem a âncora e corrompam somente mensagens/ordinais/direções; todos devem recusar o gate.

### CR-02: Arquivos locais e substring de comando não comprovam entrega autenticada

**Classification:** BLOCKER
**File:** `scripts/phase4-acceptance.mjs:173-184`
**Issue:** A execução do downloader é inferida por command.includes(downloader), e a entrega por arquivos novos cujo tamanho/SHA coincide com o banco. Um comando bem-sucedido como `echo /synthetic/helper.mjs` satisfaz a primeira condição; um helper que copia os bytes do snapshot local satisfaz a segunda sem GET autenticado do endpoint permanente ou restaurado. A chamada get_attachment só confirma que um URL foi devolvido, não que ele foi consumido. O probe recebe o snapshot local e parâmetros de execução arbitrários, mas não observa/correlaciona tráfego de download. Portanto savedOriginals e os gates do Codex podem passar quando o caminho remoto de entrega falha. O teste sintético realizado nesta revisão confirmou a aceitação da substring por um echo.
**Fix:** Construir um downloader controlado pelo driver, com argv/origin/IDs/destinos fixos e credencial recebida privadamente. Observar cada GET e seu término/status, identidade do anexo e bytes, correlacionando-os com o call get_attachment e o arquivo final, como a fase 3 faz em suas linhas 248-249. No endpoint remoto, usar observação confiável do proxy/helper ou um relay autenticado da execução, sem depender de declarações da ferramenta/modelo. Recusar no-op, cópia local, download de outro endpoint, arquivo parcial e IDs duplicados. Não registrar savedOriginals somente por existência/hash.

### CR-03: Recibo público da fase 3 divulga fingerprints dos anexos

**Classification:** BLOCKER
**File:** `scripts/phase3-acceptance.mjs:43`
**Issue:** publicReceipt inclui originals[].sha256 calculado a partir dos anexos reais. runAcceptance devolve esse objeto e o entrypoint o imprime no stdout na linha 293; esse canal pode alimentar logs ou artefatos públicos. Embora os arquivos privados de evidência tenham modo 0600, o recibo permite correlacionar conteúdo por fingerprint e contraria o limite de privacidade desta revisão. A fase 4 remove hashes do recibo, mas a fase 3 continua no escopo e pode ser executada diretamente. Um ensaio com arquivos exclusivamente sintéticos confirmou que o SHA é preservado no retorno público.
**Fix:** Manter SHA e identificadores somente em evidence.json privado. No recibo allowlisted, substituir originals por contagem, bytes (se necessários) e um boolean de integridade verificada; remover sha256 do retorno e stdout. Acrescentar teste de privacidade da fase 3 com fingerprint sintético e conferir sua ausência em todo recibo serializado.

### CR-04: Cleanup da fase 3 elimina a configuração MCP anterior

**Classification:** BLOCKER
**File:** `scripts/phase3-acceptance.mjs:274-275`
**Issue:** A linha 146 guarda originalConfig com WHERE key NOT LIKE 'mcp-%'. rotateMcpToken sobrescreve mcp-token-digest, mcp-generation e mcp-cursor-secret durante o ensaio; no finally, todas as entradas mcp-% são apagadas e apenas as demais restauradas. Se o clone offline já tinha um token válido, executar o aceite o revoga permanentemente, inclusive em falhas posteriores à rotação. Não há precondição exigindo ausência desses registros. A preservação do config.toml não preserva a autenticação do arquivo consultado.
**Fix:** Capturar todas as linhas de web_config antes da rotação. Ao encerrar os listeners e revogar a credencial temporária, restaurar exatamente o conjunto original em uma transação; o token temporário deixará de ser válido porque seu digest/generation serão substituídos. Testar sucesso e falha após rotateMcpToken com configuração MCP sintética pré-existente, conferindo igualdade do banco e validade da credencial original após cleanup.

---

_Reviewed: 2026-10-13T17:32:43Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
