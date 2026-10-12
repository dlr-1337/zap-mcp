# Phase 3: Consulta e arquivos reais no Codex - Context

**Gathered:** 2026-10-12
**Status:** Ready for planning
**Modo:** `3 --all --auto`; vinte decisões escolhidas pelo agente conforme autorização não interativa. São recomendações adotadas dentro do escopo, não respostas individuais atribuídas ao usuário.

<domain>
## Phase Boundary

O Codex instalado do proprietário consulta o mesmo arquivo privado pelo MCP somente leitura e efetivamente recebe ou baixa originais com integridade verificável. Responsabilidade: MCP-01/02/03/04/05; revalidar PRIV-02/03 e EVID-02 nesta superfície. A fase começa por prova curta de autenticação, negociação e entrega binária no cliente real.

STATE/ROADMAP registram fases 1 e 2 locais concluídas; PROJECT e verificação atual registram a UAT adicional da fase 2. Notas antigas de piloto/UAT pendentes nos contextos anteriores são históricas. Não repetir pareamento válido nem comparação manual dispensada. Nenhum requisito MCP está concluído por esta discussão. Operação final na VPS, backup externo recorrente e aceite restaurado pertencem à fase 4; proteção de transporte necessária à prova MCP não deve esperar uma exposição pública.
</domain>

<decisions>
## Implementation Decisions

### Decisões anteriores mantidas
- Uma conta, um proprietário, um coletor; leituras do acervo continuam disponíveis com WhatsApp desconectado.
- Reutilizar Express, SQLite FTS5, projeções sanitizadas, busca, snapshots e mídia verificada; Node24 do projeto, sem alterar runtime global.
- Autenticação privada independente por superfície; nenhum envio, edição, exclusão ou confirmação de leitura no WhatsApp.
- Preservar proveniência e campos desconhecidos; arquivar apenas o recebido, sem promessa de histórico integral.
- Restrição atual prevalece sobre conteúdo congelado. Não expor sessão, mídia keys, envelopes brutos, caminhos internos ou URLs remotas temporárias.
- Pesquisa prévia recomenda SDK MCP oficial v2/Streamable HTTP, mas versão estável, APIs e compatibilidade têm de ser revalidadas antes da instalação; pesquisa não é prova de integração.

### Acesso privado e prova inicial
- **D-01:** Codex realmente instalado. O cliente SDK serve a testes; o aceite exige o Codex do proprietário.
- **D-02:** Bearer exclusivo e revogável. Token em armazenamento privado, nunca em URL, logs, Git ou retorno de ferramenta; autenticar cada requisição e transferência.
- **D-03:** Operação administrativa local mínima. Invalidar o token anterior, seus cursores e transferências; logout do site não desvincula a conta nem redefine o MCP.
- **D-04:** Após prova curta de conexão e arquivo. Revalidar SDK/protocolo e transporte protegido no cliente real; falha essencial vira evidência e ajuste, sem simular sucesso.

### Localizar conversas e buscar com limites
- **D-05:** Candidatos distintos e ID canônico. Preservar homônimos, grupo/individual e identidades recebidas; não mesclar PN/LID sem evidência.
- **D-06:** Mesmas regras do site. Contato/conversa, termos simples e período por AND sobre texto, legenda e filename recebidos; sem SQL livre.
- **D-07:** Páginas limitadas e continuação explícita. Congelar o recorte; cursores autenticados por escopo/token/filtros, expiração e atualização explícitas; sem truncamento silencioso.
- **D-08:** Filtros efetivos, cobertura e fuso. America/Sao_Paulo com dias inclusivos, UTC/offset e instante original conferíveis; ausência significa não encontrado no acervo.

### Contexto e proveniência compartilhados
- **D-09:** Referência estável e vizinhas paginadas. Destacar âncora e permitir antes/depois, reutilizando snapshots e contexto da busca quando existente.
- **D-10:** Projeções sanitizadas iguais ao site. IDs, autoria/direção, datas, citação, alterações observadas, estados de anexo e campos desconhecidos; sem chaves/payload privado.
- **D-11:** Restrição atual prevalece. Snapshot não autoriza conteúdo hoje restrito; revalidar no consumo de resposta e dos próximos bytes.
- **D-12:** Conteúdo citado como dado não confiável. Separar instruções fixas das ferramentas e dados recebidos; nenhuma execução, autoabertura de URL ou mudança de permissões.

### Entrega de originais e limites do cliente
- **D-13:** ID interno de anexo. Vincular anexo à mensagem, preservar nome como metadado; usar original verificado, sem transcodificar nem refazer download remoto para consulta.
- **D-14:** Retorno suportado e transferência autenticada. Prova no Codex determina suporte inline pequeno e download para grande/sem formato suportado; bearer nunca na URL e nenhuma URL pública permanente.
- **D-15:** Bytes, tamanho e SHA-256 no destino. Conferir artefato efetivamente recuperado pelo Codex com original; distinguir metadados, transferência parcial e entrega concluída.
- **D-16:** Estado/motivo e limite explícitos. Pendente/falha/indisponível não é entrega; tipos/tamanhos sem suporte apontam caminho privado de download; validar interrupção e revogação.

### Somente leitura e aceite autônomo
- **D-17:** Lista fechada de consultas locais. Nenhuma ferramenta de enviar/editar/apagar/marcar leitura; módulos de consulta não recebem sessão/socket WhatsApp.
- **D-18:** Conversa e originais reais já arquivados. Buscar contato, mensagem, contexto e conferir arquivo pequeno/grande conforme suporte real; sem novo pareamento ou envio para produzir evidência.
- **D-19:** Agente autonomamente nos acessos disponíveis. Configurar cliente, testar auth/rotacao, negociar protocolo, comparar site/MCP e conferir arquivo; participação só se acesso indispensável faltar.
- **D-20:** Recibos sanitizados e dados privados fora do Git. Registrar cliente/versões, negociação, casos de acesso recusado, contagens e hashes conferidos, sem nomes/textos/segredos privados em docs públicas.

### Discrição do agente
- Pesquisar o SDK oficial compatível, nomes/schemas mínimos das ferramentas, tamanho de resposta/binário, limites/TTL e caminho de transferência realmente suportado pelo Codex instalado. Não fixar limites imaginários nem SDK prerelease sem evidência.
- Reutilizar contratos existentes; extrair somente a lógica comum que evitar divergência entre site e MCP, preservando testes/callers. Sem reescrever o coletor, índice, exportação ou interface.
- Escolher a menor operação administrativa de emissão/rotação e armazenamento de segredo suportada pelo cliente; preservar configuração existente com backup recuperável e sem sobrescrever outros servidores MCP.
- Comprovar transporte protegido com o ambiente acessível; uma prova local em loopback/canal protegido não comprova implantação na VPS. Registrar exatamente ambiente, transporte e limitação observados.
- Planejar testes significativos para bearer ausente/inválido/revogado, sessão não autorizadora, Host/Origin, schemas/IDs/traversal, tampering/expiração de cursor, continuidade de busca, fuso, restrição durante consumo, arquivos corrompidos/parciais, payload adversarial e operações proibidas.
- A prova real usa dados privados já existentes; evidência pública é sanitizada e artefatos reais ficam fora do checkout. Não transmitir conteúdo a outro destinatário nem criar IA hospedada adicional.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e critérios
- `AGENTS.md` — autonomia, privacidade e limites do workflow.
- `.planning/PROJECT.md` — produto, prioridades do proprietário e baseline atual.
- `.planning/REQUIREMENTS.md` — MCP-01 a MCP-05 e controles transversais.
- `.planning/ROADMAP.md` — fase 3, prova curta inicial e separação da operação VPS.

### Pesquisa a revalidar
- `.planning/research/STACK.md` — SDK, protocolo, transporte e cliente; conferir versões reais.
- `.planning/research/ARCHITECTURE.md` — adaptador MCP local, bearer e entrega privada de arquivo.
- `.planning/research/PITFALLS.md` — privacidade, leitura efetiva, injeção e retornos limitados.

### Baseline da fase anterior
- `.planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-CONTEXT.md` — busca, fuso, snapshot e política de anexos.
- `.planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-VERIFICATION.md` — evidência atual, prevalece sobre pendências antigas.
- `.planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-ACCEPTANCE.md` — recorte real, hashes de originais/ZIP e limites observados.
- `.planning/phases/02-busca-contexto-abas-e-exporta-o-no-site/02-UAT.md` — UAT autônoma concluída e limites adicionais.

Não há SPEC/ADR externo específico desta fase. Fontes oficiais citadas na pesquisa devem ser consultadas pelo pesquisador; URLs e recomendações antigas não são prova de versão, protocolo ou recebimento.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/archive.ts`: `searchTerms`, `parsePeriod`, `listConversations`, `searchMessages`, `openContext`, `readContextPage`, `conversationEvidence`, `getAttachment`, `getCoverage` e política de restrição sobre DTOs. Evitar acessar payload privado.
- `src/main.ts`: serviço Express, proteção de Host/loopback, paginação/cursor HMAC, escopo de sessão, rotas de busca/contexto e transferência verificada. Separar bearer MCP de cookies/CSRF sem enfraquecer o site.
- `src/auth.ts`: banco de autenticação privado, comparação de segredo, sessão/geração e revogação; reutilizar infraestrutura segura proporcionalmente.
- `src/media.ts`: `openVerifiedAttachment` confere ID, estado, tamanho/hash e restrição; `streamVerifiedAttachment` revalida antes de entregar bytes e destrói stream após restrição.
- `src/backup.ts` e testes em `test/`: snapshot/restauração offline e padrões de provas HTTP/SQLite/integridade já existentes.

### Established Patterns
- Node24, TypeScript ESM e serviço único; dependências fixadas no lockfile. SDK MCP ainda não instalado no package.json observado.
- Nenhum mapa em `.planning/codebase/`; scouting por símbolos e trechos das implementações.
- IDs canônicos em vez de nome, argumentos limitados, instantes originais, cursores HMAC, snapshots por escopo, dados privados fora do Git.
- Documentação em pt-BR, yolo/avanço automático e modelos herdados. Ramo atual integra trabalho final; executores paralelos exigem adapter/worktrees do GSD.

### Integration Points
- Adaptador MCP junto ao serviço existente, consultando o arquivo e fluxo de originais, sem acesso à sessão/socket WhatsApp.
- Autenticação em todo o transporte/arquivo, inclusive após initialize; validar Host/Origin e protocolos realmente suportados.
- Configuração privada do Codex instalado e mecanismo suportado de bearer; nenhuma credencial em documentação de exemplo.
- Prova offline por cópia restaurada quando necessário, mantendo um único coletor. Preservar acervo, senha, sessão e demais integrações atuais.
</code_context>

<specifics>
## Specific Ideas

- Fluxo original: localizar o contato correto, encontrar orçamento, abrir contexto, distinguir proposta/confirmacao e conferir anexo com referências verificáveis. Aceite operacional completo restaurado continua na fase 4.
- Não encontrado no acervo descreve ausência; pendente/indisponível descreve o binário. Metadado/URL/listagem nunca equivalem a recebimento.
- O proprietário delegou as verificações no computador ao agente; não pedir ações manuais que os acessos disponíveis permitem executar autonomamente.
</specifics>

<deferred>
## Deferred Ideas

Nenhuma capacidade nova adicionada. Mantidos: VPS/HTTPS e supervisão final, backup externo recorrente/restauração/aceite completo na fase 4; Claude e autenticação específica em v2. Sem OAuth/IdP preventivo, bridge extra, painel novo de tokens, SQL livre, filesystem arbitrário, OCR/transcrição, embeddings, chatbot hospedado ou envio de mensagens.
</deferred>

---
*Phase: 03-consulta-e-arquivos-reais-no-codex*
*Context gathered: 2026-10-12*
