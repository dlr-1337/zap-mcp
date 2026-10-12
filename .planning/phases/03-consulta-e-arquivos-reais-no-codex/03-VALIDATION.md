---
phase: "03"
slug: "consulta-e-arquivos-reais-no-codex"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-12"
---

# Phase 3 — Validation Strategy

Contrato de verificação derivado de 03-RESEARCH.md. Planejamento e fixtures não concluem requisitos MCP; cliente e arquivos reais exigem provas adicionais.

## Test Infrastructure

| Propriedade | Valor |
|---|---|
| Framework | node:test e node:assert existentes, Node24.21.0 por mise |
| Configuração | package.json e tsconfig.json existentes |
| Build | `mise exec node@24.21.0 -- npm run build` |
| Quick proposto | `mise exec node@24.21.0 -- node --test dist/test/mcp.test.js` após criação/build |
| Suíte completa | `mise exec node@24.21.0 -- npm test` |
| Duração | Medir na execução; ainda não comprovada |

## Sampling Rate

- Após cada tarefa: build e teste específico da capacidade alterada, com exit não zero ou ausência de casos executados constituindo falha.
- Após cada wave: suíte integrada completa; falha bloqueia expansão.
- Antes do verificador: suíte verde e recibos do Codex real; cliente SDK isolado não substitui o Codex.
- Meta de retorno rápido: até30s para testes focados; medir e registrar sem declarar meta alcançada por documento.

## Per-Task Verification Map

O planejador substitui esta matriz de requisitos por IDs de tarefas/waves reais antes de executar.

| Requisito | Comportamento e risco | Tipo | Verificação prevista | Estado |
|---|---|---|---|---|
| MCP-01 | Bearer ausente/inválido/revogado, cookie não autoriza, Host/Origin, rotação e negociação | HTTP/integration + cliente real | mcp.test e tracer no Codex instalado | Pendente |
| MCP-02 | Homônimos, AND, fuso/DST, snapshots/cursor/TTL, limite sem perda | Integration | mcp.test + search/context existentes + acervo real | Pendente |
| MCP-03 | IDs/autoria/citação/revisão/UTC iguais ao site; âncora/vizinhas; restrição atual | Integration + real | mcp.test + comparação independente do acervo | Pendente |
| MCP-04 | ID/path/corrupção, tamanho/hash, interrupção e revogação; arquivo no destino | Integration + cliente real | mcp.test + originais pequeno/grande recuperados e conferidos | Pendente |
| MCP-05 | Lista fechada; proibidos recusados; conteúdo adversarial é dado; sem socket/chaves | Security/contract | mcp.test + readonly/security existentes | Pendente |

## Wave 0 Requirements

- [ ] test/mcp.test.ts e fixtures HTTP/SQLite privadas; reutilizar padrões existentes.
- [ ] Prova/roteiro do cliente real sanitizado, com arquivo no destino e comparação de bytes/tamanho/hash.
- [ ] Mapeamento final de tarefas, ameaças e comandos concretos pelo planejador.

Nenhum framework adicional de testes é necessário. Comando que referencia artefato futuro depende explicitamente de sua criação/build.

## Verificações no cliente real

Agente executa autonomamente os acessos disponíveis. Participação do proprietário só por acesso concreto indispensável.

| Comportamento | Requisito | Evidência exigida |
|---|---|---|
| Conectar Codex instalado ao endpoint protegido | MCP-01 | Versão, troca de protocolo observada, credencial válida e casos recusados, sem segredos |
| Consultar conversa/contexto reais | MCP-02/03 | Campos comparados com site/SQL independente, filtros/cobertura e continuação |
| Recuperar original pequeno e caminho para maior | MCP-04 | Artefato no destino, tamanho/SHA iguais ao original; URL/listagem não conta |
| Somente leitura sob mensagem adversarial | MCP-05 | Ferramentas fechadas e nenhum envio/alteração/socket chamado |

## Validation Sign-Off

- [ ] Todas as tarefas têm verificação automatizada ou dependência Wave0.
- [ ] Nenhuma sequência de três tarefas sem feedback automatizado.
- [ ] Wave0 cobre referências inicialmente ausentes; sem watch-mode.
- [ ] Duração dos testes focados registrada.
- [ ] Recibos reais sanitizados e suíte integrada verde.
- [ ] nyquist_compliant:true somente após auditoria, com evidência.

**Approval:** pending — estratégia de planejamento, não aceite realizado.
